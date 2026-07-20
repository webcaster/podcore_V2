import express, { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';
import * as fs from 'fs';
import * as path from 'path';
import { DATA_DIR } from '../database';
import { getDefaultLayoutForType, getLayoutById, renderPdfHeader, renderPdfFooter, renderWatermark } from '../pdfLayouts';

const router: express.Router = express.Router();

// ============================================================
// HELPER: Angebotsnummer generieren
// ============================================================
function generateOfferNumber(db: any): string {
  try {
    const settings = db.get('SELECT value FROM settings WHERE key = ?', ['app']) as any;
    const s = JSON.parse(settings?.value || '{}');
    const cfg = s.sponsoring?.offerNumbering || {
      prefix: 'ANG',
      separator: '-',
      includeYear: true,
      paddingDigits: 3,
      nextNumber: 1,
    };
    const now = new Date();
    const numStr = String(cfg.nextNumber).padStart(cfg.paddingDigits, '0');
    const parts: string[] = [cfg.prefix];
    if (cfg.includeYear) parts.push(String(now.getFullYear()));
    parts.push(numStr);
    const finalNumber = parts.join(cfg.separator || '-');
    cfg.nextNumber++;
    s.sponsoring = s.sponsoring || {};
    s.sponsoring.offerNumbering = cfg;
    db.run('UPDATE settings SET value = ? WHERE key = ?', [JSON.stringify(s), 'app']);
    return finalNumber;
  } catch (_) {
    const now = new Date();
    return `ANG-${now.getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  }
}

// ============================================================
// HELPER: Branding-Daten aus Settings laden
// ============================================================
function loadBranding(db: any): { podcastName: string; companyName: string; logoPath: string | null } {
  let podcastName = 'PodCore';
  let companyName = '';
  let logoPath: string | null = null;
  try {
    const settings = db.get('SELECT value FROM settings WHERE key = ?', ['app']) as any;
    const s = JSON.parse(settings?.value || '{}');
    podcastName = s?.branding?.podcastName || s?.general?.podcastName || 'PodCore';
    companyName = s?.branding?.companyName || s?.general?.companyName || '';
    const brandingDir = path.join(DATA_DIR, 'branding');
    if (fs.existsSync(brandingDir)) {
      const lf = fs.readdirSync(brandingDir).find((f: string) => /^logo\.(png|jpg|jpeg)$/i.test(f));
      if (lf) logoPath = path.join(brandingDir, lf);
    }
  } catch (_) {}
  return { podcastName, companyName, logoPath };
}

router.use(requireAuth as any);

// ============================================================
// SPONSOR CONTRACTS
// ============================================================

router.get('/:sponsorId/contracts', requirePermission('canViewSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const contracts = db.all('SELECT * FROM sponsor_contracts WHERE sponsor_id = ? ORDER BY contract_start DESC', [req.params.sponsorId]) as any[];
  return res.json({
    success: true, data: contracts.map(c => ({
      id: c.id, sponsorId: c.sponsor_id, contractStart: c.contract_start, contractEnd: c.contract_end,
      contactPerson: c.contact_person, contactEmail: c.contact_email, contactPhone: c.contact_phone,
      sponsoringType: c.sponsoring_type, notes: c.notes, status: c.status, createdAt: c.created_at, updatedAt: c.updated_at,
    })),
  });
});

router.post('/:sponsorId/contracts', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { contractStart, contractEnd, contactPerson, contactEmail, contactPhone, sponsoringType, notes } = req.body;
  if (!contractStart || !contractEnd) return res.status(400).json({ success: false, error: 'contractStart und contractEnd erforderlich' });
  const id = uuidv4();
  db.run(
    `INSERT INTO sponsor_contracts (id, sponsor_id, contract_start, contract_end, contact_person, contact_email, contact_phone, sponsoring_type, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'aktiv')`,
    [id, req.params.sponsorId, contractStart, contractEnd, contactPerson || null, contactEmail || null, contactPhone || null, sponsoringType || null, notes || null],
  );
  const c = db.get('SELECT * FROM sponsor_contracts WHERE id = ?', [id]) as any;
  return res.status(201).json({ success: true, data: c });
});

router.put('/contracts/:contractId', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { contractStart, contractEnd, contactPerson, contactEmail, contactPhone, sponsoringType, notes, status } = req.body;
  db.run(
    `UPDATE sponsor_contracts SET contract_start = COALESCE(?, contract_start), contract_end = COALESCE(?, contract_end), contact_person = ?, contact_email = ?, contact_phone = ?, sponsoring_type = ?, notes = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
    [contractStart ?? null, contractEnd ?? null, contactPerson ?? null, contactEmail ?? null, contactPhone ?? null, sponsoringType ?? null, notes ?? null, status ?? null, req.params.contractId],
  );
  return res.json({ success: true, data: db.get('SELECT * FROM sponsor_contracts WHERE id = ?', [req.params.contractId]) });
});

router.delete('/contracts/:contractId', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.run('DELETE FROM sponsor_contracts WHERE id = ?', [req.params.contractId]);
  return res.json({ success: true });
});

// ============================================================
// AD BOOKINGS
// ============================================================

function mapBookingRow(b: any) {
  let episodeRefs: any[] = [];
  try {
    const parsed = typeof b.episode_refs === 'string' ? JSON.parse(b.episode_refs) : b.episode_refs;
    episodeRefs = Array.isArray(parsed) ? parsed : [];
  } catch (_) {}

  return {
    id: b.id,
    slotId: b.slot_id,
    sponsorId: b.sponsor_id,
    episodeId: b.episode_id,
    bookingDate: b.booking_date,
    bookingEndDate: b.booking_end_date,
    price: b.price,
    priceAdjustment: b.price_adjustment,
    listenerFee: b.listener_fee,
    finalPrice: b.final_price,
    invoiceStatus: b.invoice_status,
    invoiceNumber: b.invoice_number,
    invoiceDate: b.invoice_date,
    deliveryConfirmed: Boolean(b.delivery_confirmed),
    listenerCount: b.listener_count,
    status: b.status,
    notes: b.notes,
    performanceNotes: b.performance_notes,
    contractId: b.contract_id,
    placementCount: b.placement_count,
    episodeRefs,
    discount: b.discount,
    discountType: b.discount_type,
    totalEpisodes: b.total_episodes,
    slotName: b.slot_name,
    sponsorName: b.sponsor_name,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
  };
}

function getMappedBooking(db: any, bookingId: string) {
  const booking = db.get(
    `SELECT ab.*, COALESCE(s.name, c.name) as slot_name, sp.name as sponsor_name
     FROM ad_bookings ab
     LEFT JOIN ad_slots s ON ab.slot_id = s.id
     LEFT JOIN ad_categories c ON ab.slot_id = c.id
     JOIN sponsors sp ON ab.sponsor_id = sp.id
     WHERE ab.id = ?`,
    [bookingId],
  ) as any;
  return booking ? mapBookingRow(booking) : null;
}

router.get('/:sponsorId/bookings', requirePermission('canViewSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { from, to, status } = req.query;
  let query = `SELECT ab.*, COALESCE(s.name, c.name) as slot_name, sp.name as sponsor_name FROM ad_bookings ab LEFT JOIN ad_slots s ON ab.slot_id = s.id LEFT JOIN ad_categories c ON ab.slot_id = c.id JOIN sponsors sp ON ab.sponsor_id = sp.id WHERE ab.sponsor_id = ?`;
  const params: any[] = [req.params.sponsorId];
  if (from) { query += ' AND ab.booking_date >= ?'; params.push(from); }
  if (to) { query += ' AND ab.booking_date <= ?'; params.push(to); }
  if (status) { query += ' AND ab.status = ?'; params.push(status); }
  query += ' ORDER BY ab.booking_date DESC';
  const bookings = db.all(query, params) as any[];
  return res.json({ success: true, data: bookings.map(mapBookingRow) });
});

router.post('/:sponsorId/bookings', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { slotId, bookingDate, bookingEndDate, price = 0, priceAdjustment = 0, listenerFee = 0, notes, invoiceStatus, status, contractId, placementCount, episodeRefs, discount = 0, discountType = 'absolute', listenerCount, totalEpisodes } = req.body;
  if (!slotId || !bookingDate) return res.status(400).json({ success: false, error: 'Werbe-Slot und Laufzeitbeginn sind erforderlich' });
  const id = uuidv4();
  const basePrice = Number(price || 0) + Number(priceAdjustment || 0) + Number(listenerFee || 0);
  const discountAmount = discountType === 'percent' ? basePrice * Number(discount || 0) / 100 : Number(discount || 0);
  const requestedFinalPrice = Number(req.body.finalPrice);
  const finalPrice = Number.isFinite(requestedFinalPrice)
    ? Math.max(0, requestedFinalPrice)
    : Math.max(0, basePrice - discountAmount);
  db.run(
    `INSERT INTO ad_bookings (id, slot_id, sponsor_id, booking_date, booking_end_date, price, price_adjustment, listener_fee, final_price, status, invoice_status, notes, contract_id, placement_count, episode_refs, discount, discount_type, listener_count, total_episodes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, slotId, req.params.sponsorId, bookingDate, bookingEndDate || null, price, priceAdjustment || 0, listenerFee || 0, finalPrice, status || 'geplant', invoiceStatus || 'offen', notes || null, contractId || null, placementCount || 1, JSON.stringify(episodeRefs || []), discount || 0, discountType || 'absolute', listenerCount || null, totalEpisodes || null],
  );
  return res.status(201).json({ success: true, data: getMappedBooking(db, id) });
});

router.put('/bookings/:bookingId', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const b = req.body;
  const { bookingId } = req.params;
  const existing = db.get('SELECT * FROM ad_bookings WHERE id = ?', [bookingId]) as any;
  if (!existing) return res.status(404).json({ success: false, error: 'Buchung nicht gefunden' });

  const slotId = b.slotId !== undefined ? b.slotId : existing.slot_id;
  const bookingDate = b.bookingDate !== undefined ? b.bookingDate : existing.booking_date;
  const bookingEndDate = b.bookingEndDate !== undefined ? (b.bookingEndDate || null) : existing.booking_end_date;
  const price = b.price !== undefined ? Number(b.price || 0) : Number(existing.price || 0);
  const priceAdjustment = b.priceAdjustment !== undefined ? Number(b.priceAdjustment || 0) : Number(existing.price_adjustment || 0);
  const listenerFee = b.listenerFee !== undefined ? Number(b.listenerFee || 0) : Number(existing.listener_fee || 0);
  const discount = b.discount !== undefined ? Number(b.discount || 0) : Number(existing.discount || 0);
  const discountType = b.discountType !== undefined ? b.discountType : (existing.discount_type || 'absolute');
  const requestedFinalPrice = Number(b.finalPrice);
  const priceChanged = ['price', 'priceAdjustment', 'listenerFee', 'discount', 'discountType'].some(key => b[key] !== undefined);
  const basePrice = price + priceAdjustment + listenerFee;
  const discountAmount = discountType === 'percent' ? basePrice * discount / 100 : discount;
  const finalPrice = b.finalPrice !== undefined && Number.isFinite(requestedFinalPrice)
    ? Math.max(0, requestedFinalPrice)
    : priceChanged
      ? Math.max(0, basePrice - discountAmount)
      : Number(existing.final_price || 0);
  const episodeRefs = b.episodeRefs !== undefined
    ? JSON.stringify(Array.isArray(b.episodeRefs) ? b.episodeRefs : [])
    : existing.episode_refs;

  db.run(
    `UPDATE ad_bookings SET slot_id = ?, booking_date = ?, booking_end_date = ?, price = ?, price_adjustment = ?, listener_fee = ?, final_price = ?, status = ?, invoice_status = ?, notes = ?, contract_id = ?, placement_count = ?, episode_refs = ?, discount = ?, discount_type = ?, listener_count = ?, total_episodes = ?, updated_at = datetime('now') WHERE id = ?`,
    [
      slotId,
      bookingDate,
      bookingEndDate,
      price,
      priceAdjustment,
      listenerFee,
      finalPrice,
      b.status !== undefined ? b.status : existing.status,
      b.invoiceStatus !== undefined ? b.invoiceStatus : existing.invoice_status,
      b.notes !== undefined ? (b.notes || null) : existing.notes,
      b.contractId !== undefined ? (b.contractId || null) : existing.contract_id,
      b.placementCount !== undefined ? (Number(b.placementCount) || 1) : existing.placement_count,
      episodeRefs,
      discount,
      discountType,
      b.listenerCount !== undefined ? (b.listenerCount || null) : existing.listener_count,
      b.totalEpisodes !== undefined ? (b.totalEpisodes || null) : existing.total_episodes,
      bookingId,
    ],
  );
  return res.json({ success: true, data: getMappedBooking(db, bookingId) });
});

router.delete('/bookings/:bookingId', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.run('DELETE FROM ad_bookings WHERE id = ?', [req.params.bookingId]);
  return res.json({ success: true });
});

router.get('/slots', requirePermission('canViewSponsors') as any, (_req: AuthRequest, res: Response) => {
  const db = getDb();
  const cats = db.all(`SELECT * FROM ad_categories WHERE is_active = 1 ORDER BY sort_order ASC`) as any[];
  return res.json({ success: true, data: cats.map(c => ({ id: c.id, name: c.name, basePrice: c.base_price, pricePerEpisode: c.price_per_episode, pricePer1000: c.price_per_1000_listens })) });
});

// ============================================================
// SPONSOR OFFERS
// ============================================================

router.get('/:sponsorId/offers', requirePermission('canViewSponsorOffers') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const offers = db.all(`SELECT * FROM sponsor_offers WHERE sponsor_id = ? ORDER BY created_at DESC`, [req.params.sponsorId]) as any[];
  return res.json({
    success: true, data: offers.map(o => ({
      ...o,
      offerNumber: o.offer_number,
      validUntil: o.valid_until,
      introText: o.intro_text,
      outroText: o.outro_text,
      positions: JSON.parse(o.positions || '[]'),
      offerOptions: JSON.parse(o.offer_options || 'null'),
    })),
  });
});

router.post('/:sponsorId/offers', requirePermission('canManageSponsorOffers') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const b = req.body;
  const id = uuidv4();
  const offerNumber = b.offerNumber || generateOfferNumber(db);
  db.run(
    `INSERT INTO sponsor_offers (id, sponsor_id, title, offer_number, valid_until, status, intro_text, outro_text, positions, total_price, discount, discount_type, notes, offer_options, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [id, req.params.sponsorId, b.title || 'Neues Angebot', offerNumber, b.validUntil || null, 'entwurf', b.introText || null, b.outroText || null, JSON.stringify(b.positions || []), b.totalPrice || b.total || 0, b.discount || 0, b.discountType || 'absolute', b.notes || null, JSON.stringify(b.offerOptions || null), (req as any).user?.id || null],
  );
  return res.json({ success: true, data: { id, offerNumber } });
});

router.put('/offers/:offerId', requirePermission('canManageSponsorOffers') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const b = req.body;
  db.run(
    `UPDATE sponsor_offers SET title = ?, valid_until = ?, status = ?, intro_text = ?, outro_text = ?, positions = ?, total_price = ?, discount = ?, discount_type = ?, notes = ?, offer_options = ?, updated_at = datetime('now') WHERE id = ?`,
    [b.title, b.validUntil || null, b.status, b.introText || null, b.outroText || null, JSON.stringify(b.positions || []), b.totalPrice || b.total || 0, b.discount || 0, b.discountType || 'absolute', b.notes || null, JSON.stringify(b.offerOptions || null), req.params.offerId],
  );
  return res.json({ success: true });
});

router.delete('/offers/:offerId', requirePermission('canManageSponsorOffers') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  try {
    db.run('DELETE FROM sponsor_offers WHERE id = ?', [req.params.offerId]);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/offers/:offerId/archive', requirePermission('canManageSponsorOffers') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.run("UPDATE sponsor_offers SET status = 'archiviert', updated_at = datetime('now') WHERE id = ?", [req.params.offerId]);
  return res.json({ success: true });
});

// ============================================================
// ACCEPT OFFER → Buchungen anlegen
// ============================================================
router.post('/offers/:offerId/accept', requirePermission('canManageSponsorOffers') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  try {
    const offer = db.get('SELECT * FROM sponsor_offers WHERE id = ?', [req.params.offerId]) as any;
    if (!offer) return res.status(404).json({ success: false, error: 'Angebot nicht gefunden' });

    const { selectedOptionIndex = 0 } = req.body || {};
    const offerOptions = offer.offer_options ? JSON.parse(offer.offer_options) : null;
    const positions = offerOptions && Array.isArray(offerOptions) && offerOptions.length > selectedOptionIndex
      ? (offerOptions[selectedOptionIndex]?.positions || [])
      : JSON.parse(offer.positions || '[]');

    // Buchungen für jede Position anlegen
    const today = new Date().toISOString().slice(0, 10);
    for (const pos of positions) {
      if (!pos.categoryId && !pos.slotId) continue;
      const slotId = pos.categoryId || pos.slotId;
      const bookingId = uuidv4();
      const unitPrice = parseFloat(pos.unitPrice) || 0;
      const qty = parseInt(pos.quantity) || 1;
      db.run(
        `INSERT INTO ad_bookings (id, slot_id, sponsor_id, booking_date, price, final_price, status, invoice_status, notes, placement_count, episode_refs, discount, discount_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'geplant', 'offen', ?, ?, '[]', 0, 'absolute', datetime('now'), datetime('now'))`,
        [bookingId, slotId, offer.sponsor_id, today, unitPrice, unitPrice * qty, pos.title || null, qty],
      );
    }

    // Angebots-Status auf "angenommen" setzen
    db.run("UPDATE sponsor_offers SET status = 'angenommen', updated_at = datetime('now') WHERE id = ?", [req.params.offerId]);
    return res.json({ success: true, message: 'Angebot angenommen und Buchungen erstellt' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// OFFER PDF EXPORT
// ============================================================
router.get('/offers/:offerId/pdf', requirePermission('canViewSponsorOffers') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const offer = db.get('SELECT * FROM sponsor_offers WHERE id = ?', [req.params.offerId]) as any;
  if (!offer) return res.status(404).json({ success: false, error: 'Angebot nicht gefunden' });
  const sponsor = db.get('SELECT * FROM sponsors WHERE id = ?', [offer.sponsor_id]) as any;
  if (!sponsor) return res.status(404).json({ success: false, error: 'Sponsor nicht gefunden' });

  // Layout laden
  const layoutId = req.query.layoutId as string;
  let layout: any;
  try {
    layout = layoutId ? getLayoutById(layoutId) : null;
    if (!layout) layout = getDefaultLayoutForType('sponsor_offer' as any);
  } catch (_) {
    layout = { colors: {}, sections: {}, footer: {}, header: {}, typography: {}, pageMargin: 40 };
  }

  const cfg = layout || {};
  const colors = cfg.colors || {};
  const sections = cfg.sections || {};
  const footerCfg = cfg.footer || {};
  const m = cfg.pageMargin || 40;

  // CI-Farben
  const primaryColor: string = colors.primary || '#7c3aed';
  const headerBgColor: string = colors.background || colors.primary || '#7c3aed';
  const headerTextColor: string = colors.headerText || '#ffffff';
  const accentColor: string = colors.accent || primaryColor;

  // Sektionen (aus Layout, Defaults: alles sichtbar)
  const showIntro: boolean = sections.showOfferIntro !== false;
  const showOutro: boolean = sections.showOfferOutro !== false;
  const showNotes: boolean = sections.showOfferNotes !== false;
  const showOptions: boolean = sections.showOfferOptions !== false;
  const showSponsorAddress: boolean = sections.showSponsorAddress !== false;

  const { podcastName, companyName, logoPath } = loadBranding(db);

  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ margin: m, size: 'A4' });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  doc.on('end', () => {
    const buf = Buffer.concat(chunks);
    const safeTitle = (offer.title || 'Angebot').replace(/[^a-z0-9äöüÄÖÜß]/gi, '_').slice(0, 40);
    const filename = `Angebot_${offer.offer_number || 'ANG'}_${safeTitle}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buf);
  });

  const contentW = doc.page.width - 2 * m;
  const nowStr = new Date().toLocaleDateString('de-DE');

  // ── HEADER ──────────────────────────────────────────────────
  const headerH = cfg.headerHeight || 70;
  doc.rect(0, 0, doc.page.width, headerH).fill(headerBgColor);
  if (logoPath && fs.existsSync(logoPath)) {
    try { doc.image(logoPath, m, 12, { height: 36 }); } catch (_) {}
  }
  doc.fontSize(20).font('Helvetica-Bold').fillColor(headerTextColor)
    .text('Angebot', m, 14, { align: 'right', width: contentW });
  const subLine = [podcastName, companyName].filter(Boolean).join(' · ') + ` · ${nowStr}`;
  doc.fontSize(8).font('Helvetica').fillColor(headerTextColor).opacity(0.75)
    .text(subLine, m, 42, { align: 'right', width: contentW });
  doc.opacity(1);
  doc.rect(m, headerH + 2, contentW, 1.5).fill(accentColor);
  doc.y = headerH + 14;

  // ── ANGEBOTS-KOPF ────────────────────────────────────────────
  doc.fontSize(15).font('Helvetica-Bold').fillColor(primaryColor)
    .text(offer.title || 'Angebot', m, doc.y, { width: contentW });
  doc.moveDown(0.3);
  doc.fontSize(9).font('Helvetica').fillColor('#555')
    .text(`Angebotsnummer: ${offer.offer_number || '—'}   |   Gültig bis: ${offer.valid_until ? new Date(offer.valid_until).toLocaleDateString('de-DE') : '—'}`, m, doc.y, { width: contentW });
  doc.moveDown(0.8);

  // ── SPONSOR-ADRESSE ──────────────────────────────────────────
  if (showSponsorAddress) {
    const addrY = doc.y;
    doc.rect(m, addrY, contentW * 0.48, 60).fill('#f8f8f8');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#333').text('Angebot für:', m + 6, addrY + 5);
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#111').text(sponsor.name || '—', m + 6, addrY + 16);
    if (sponsor.company) doc.fontSize(9).font('Helvetica').fillColor('#444').text(sponsor.company, m + 6, doc.y);
    if (sponsor.address) doc.fontSize(9).font('Helvetica').fillColor('#555').text(sponsor.address, m + 6, doc.y);
    if (sponsor.city || sponsor.zip) {
      const cityLine = [sponsor.zip, sponsor.city].filter(Boolean).join(' ');
      doc.fontSize(9).font('Helvetica').fillColor('#555').text(cityLine, m + 6, doc.y);
    }
    if (sponsor.email) doc.fontSize(8).font('Helvetica').fillColor('#777').text(sponsor.email, m + 6, doc.y);
    doc.y = addrY + 68;
    doc.moveDown(0.5);
  }

  // ── INTRO-TEXT ───────────────────────────────────────────────
  if (showIntro && offer.intro_text) {
    doc.fontSize(10).font('Helvetica').fillColor('#333')
      .text(offer.intro_text, m, doc.y, { width: contentW });
    doc.moveDown(0.8);
  }

  // ── OPTIONEN / POSITIONEN ────────────────────────────────────
  const offerOptions = offer.offer_options ? JSON.parse(offer.offer_options) : null;
  const hasMultipleOptions = offerOptions && Array.isArray(offerOptions) && offerOptions.length > 0;

  if (showOptions) {
    if (hasMultipleOptions) {
      // Sektions-Überschrift
      const secY = doc.y;
      doc.rect(m, secY, contentW, 20).fill(primaryColor);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#fff')
        .text('Verfügbare Optionen', m + 8, secY + 5, { width: contentW - 16 });
      doc.y = secY + 22;
      doc.moveDown(0.4);

      // Farben für Optionen: abwechselnd leicht unterschiedlich
      const optionColors = ['#e8f4fd', '#fef3c7', '#f0fdf4', '#fdf2f8', '#fff7ed'];

      offerOptions.forEach((opt: any, optIdx: number) => {
        if (doc.y + 60 > doc.page.height - 80) { doc.addPage(); doc.y = m; }

        const optionName = [opt.label, opt.title, opt.name]
          .find((value) => typeof value === 'string' && value.trim())?.trim() || `Option ${optIdx + 1}`;
        const optBg = optionColors[optIdx % optionColors.length];
        const optHeaderY = doc.y;
        doc.rect(m, optHeaderY, contentW, 22).fill(optBg);
        doc.rect(m, optHeaderY, 4, 22).fill(accentColor);
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#111')
          .text(optionName, m + 12, optHeaderY + 5, { width: contentW - 20 });
        doc.y = optHeaderY + 24;
        doc.moveDown(0.2);

        if (opt.introText) {
          doc.fontSize(9).font('Helvetica').fillColor('#444')
            .text(opt.introText, m, doc.y, { width: contentW });
          doc.moveDown(0.4);
        }

        const positions: any[] = opt.positions || [];
        if (positions.length > 0) {
          renderPositionsTable(doc, positions, m, contentW, accentColor);
          // Optionssumme
          const optSubtotal = positions.reduce((s: number, p: any) => s + (parseFloat(p.unitPrice) || 0) * (parseInt(p.quantity) || 1), 0);
          let optDiscount = 0;
          if (opt.discountType === 'percent') optDiscount = optSubtotal * (parseFloat(opt.discount) || 0) / 100;
          else optDiscount = parseFloat(opt.discount) || 0;
          const optTotal = Math.max(0, optSubtotal - optDiscount);
          const sumY = doc.y;
          doc.rect(m, sumY, contentW, 20).fill(optBg);
          doc.fontSize(9).font('Helvetica-Bold').fillColor('#333')
            .text(`Gesamt ${optionName}:`, m + 5, sumY + 5, { width: contentW * 0.72, align: 'right' });
          doc.fontSize(10).font('Helvetica-Bold').fillColor('#111')
            .text(`${optTotal.toFixed(2)} €`, m + contentW * 0.73, sumY + 4, { width: contentW * 0.27 - 5, align: 'right' });
          doc.y = sumY + 22;
        }

        if (opt.outroText) {
          doc.moveDown(0.3);
          doc.fontSize(9).font('Helvetica').fillColor('#555')
            .text(opt.outroText, m, doc.y, { width: contentW });
        }
        doc.moveDown(0.8);
      });
      // Bei mehreren Optionen KEIN Gesamtpreis am Ende

    } else {
      // Einfache Positions-Liste
      const positions: any[] = JSON.parse(offer.positions || '[]');
      if (positions.length > 0) {
        const secY = doc.y;
        doc.rect(m, secY, contentW, 20).fill(primaryColor);
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#fff')
          .text('Angebots-Positionen', m + 8, secY + 5, { width: contentW - 16 });
        doc.y = secY + 22;
        doc.moveDown(0.3);
        renderPositionsTable(doc, positions, m, contentW, accentColor);
      }

      // Gesamtpreis (nur bei einfachem Angebot ohne Optionen)
      doc.moveDown(0.4);
      const totalY = doc.y;
      doc.rect(m, totalY, contentW, 26).fill(primaryColor);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#fff')
        .text('Gesamtpreis:', m + 5, totalY + 7, { width: contentW * 0.68, align: 'right' });
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#fff')
        .text(`${Number(offer.total_price || 0).toFixed(2)} €`, m + contentW * 0.69, totalY + 6, { width: contentW * 0.31 - 5, align: 'right' });
      doc.y = totalY + 28;
    }
  }

  // ── OUTRO-TEXT ───────────────────────────────────────────────
  if (showOutro && offer.outro_text) {
    doc.moveDown(0.6);
    doc.fontSize(10).font('Helvetica').fillColor('#333')
      .text(offer.outro_text, m, doc.y, { width: contentW });
  }

  // ── HINWEISE ─────────────────────────────────────────────────
  if (showNotes && offer.notes) {
    doc.moveDown(0.6);
    doc.rect(m, doc.y, contentW, 1).fill('#ddd');
    doc.moveDown(0.3);
    doc.fontSize(8).font('Helvetica').fillColor('#888')
      .text(`Hinweis: ${offer.notes}`, m, doc.y, { width: contentW });
  }

  // ── FOOTER ───────────────────────────────────────────────────
  if (footerCfg.showPageNumbers !== false || footerCfg.showDate !== false || footerCfg.showPodcastName !== false) {
    const fy = doc.page.height - m - 20;
    doc.rect(m, fy - 6, contentW, 0.5).fill('#ddd');
    const footerParts: string[] = [];
    if (footerCfg.showPodcastName !== false) footerParts.push(podcastName);
    if (footerCfg.showDate !== false) footerParts.push(nowStr);
    if (offer.offer_number) footerParts.push(`Nr. ${offer.offer_number}`);
    if (footerCfg.customText) footerParts.push(footerCfg.customText);
    doc.fontSize(7).font('Helvetica').fillColor('#aaa')
      .text(footerParts.join(' · '), m, fy, { align: 'center', width: contentW, lineBreak: false });
  }

  doc.end();
});

// ── Hilfsfunktion: Positions-Tabelle rendern ─────────────────
function renderPositionsTable(doc: any, positions: any[], m: number, contentW: number, accentColor: string) {
  const colW = [contentW * 0.42, contentW * 0.13, contentW * 0.22, contentW * 0.23];
  const headers = ['Beschreibung', 'Menge', 'Einzelpreis', 'Gesamt'];
  const tableTop = doc.y;

  // Header-Zeile
  doc.rect(m, tableTop, contentW, 18).fill(accentColor);
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#fff');
  let cx = m + 4;
  headers.forEach((h, i) => {
    doc.text(h, cx, tableTop + 5, { width: colW[i] - 8, align: i === 0 ? 'left' : 'right' });
    cx += colW[i];
  });
  doc.y = tableTop + 18;

  // Daten-Zeilen
  positions.forEach((pos: any, idx: number) => {
    if (doc.y + 22 > doc.page.height - 80) { doc.addPage(); doc.y = m; }
    const rowY = doc.y;
    const titleH = doc.heightOfString(pos.title || '—', { width: colW[0] - 8 });
    const descH = pos.description ? doc.heightOfString(pos.description, { width: colW[0] - 8 }) : 0;
    const rowH = Math.max(20, titleH + descH + 8);
    doc.rect(m, rowY, contentW, rowH).fill(idx % 2 === 0 ? '#ffffff' : '#f7f7f7');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#111').text(pos.title || '—', m + 4, rowY + 4, { width: colW[0] - 8 });
    if (pos.description) {
      doc.fontSize(7).font('Helvetica').fillColor('#666').text(pos.description, m + 4, rowY + 4 + titleH, { width: colW[0] - 8 });
    }
    const qty = parseInt(pos.quantity) || 1;
    const up = parseFloat(pos.unitPrice) || 0;
    const total = qty * up;
    doc.fontSize(8).font('Helvetica').fillColor('#222');
    doc.text(String(qty), m + colW[0], rowY + 4, { width: colW[1] - 8, align: 'right' });
    doc.text(`${up.toFixed(2)} €`, m + colW[0] + colW[1], rowY + 4, { width: colW[2] - 8, align: 'right' });
    doc.text(`${total.toFixed(2)} €`, m + colW[0] + colW[1] + colW[2], rowY + 4, { width: colW[3] - 8, align: 'right' });
    doc.y = rowY + rowH;
  });
}

// ============================================================
// PREISLISTE PDF EXPORT
// ============================================================
router.get('/price-list-pdf', requirePermission('canViewSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const rawTitle = String(req.query.title || 'Werbekategorien & Preisliste').trim() || 'Werbekategorien & Preisliste';
  const rawDesc = String(req.query.description || '').trim();
  const categories = db.all(`SELECT * FROM ad_categories WHERE is_active = 1 ORDER BY sort_order ASC, name ASC`) as any[];

  const layoutId = req.query.layoutId as string;
  let layout: any;
  try {
    layout = layoutId ? getLayoutById(layoutId) : null;
    if (!layout) layout = getDefaultLayoutForType('sponsor_offer' as any);
  } catch (_) {
    layout = getDefaultLayoutForType('sponsor_offer' as any);
  }

  const sections = layout.sections || {};
  const showDescriptions = sections.showPricelistDescriptions !== false;
  const showExclusive = sections.showPricelistExclusive !== false;
  const colors = layout.colors;
  const typography = layout.typography;
  const m = Number(layout.pageMargin) || 50;
  const bodySize = Math.max(8, Number(typography.bodySize) || 10);
  const smallSize = Math.max(6, Number(typography.smallSize) || 8);
  const { podcastName, companyName, logoPath } = loadBranding(db);

  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({
    margin: m,
    size: layout.pageSize || 'A4',
    layout: layout.pageOrientation === 'landscape' ? 'landscape' : 'portrait',
    autoFirstPage: false,
    bufferPages: true,
  });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  doc.on('end', () => {
    const buf = Buffer.concat(chunks);
    const safeTitle = rawTitle.replace(/[^a-zA-Z0-9äöüÄÖÜß_-]+/g, '-').replace(/^-+|-+$/g, '') || 'Preisliste';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.pdf"`);
    res.send(buf);
  });

  let pageNum = 0;
  let contentW = 0;
  let y = 0;
  const addDecoratedPage = () => {
    doc.addPage();
    pageNum += 1;
    contentW = doc.page.width - m * 2;
    renderWatermark(doc, layout);
    renderPdfHeader(doc, layout, { podcastName, documentTitle: rawTitle, logoPath });
    y = Math.max(doc.y, m);
  };
  const ensureSpace = (requiredHeight: number) => {
    if (y + requiredHeight > doc.page.height - 55) addDecoratedPage();
  };
  const formatPrice = (value: unknown, currency: string) => {
    if (value === null || value === undefined || value === '') return '–';
    const amount = Number(value);
    if (!Number.isFinite(amount)) return '–';
    return `${amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  };

  addDecoratedPage();

  if (rawDesc) {
    doc.font(typography.fontFamily).fontSize(bodySize).fillColor(colors.text);
    const descHeight = doc.heightOfString(rawDesc, { width: contentW });
    ensureSpace(descHeight + 14);
    doc.text(rawDesc, m, y, { width: contentW });
    y += descHeight + 14;
  }

  const summaryLine = `${categories.length} aktive ${categories.length === 1 ? 'Werbekategorie' : 'Werbekategorien'} · Stand: ${new Date().toLocaleDateString('de-DE')}`;
  doc.font(typography.fontFamily).fontSize(smallSize).fillColor(colors.muted)
    .text(summaryLine, m, y, { width: contentW });
  y += 18;

  if (categories.length === 0) {
    ensureSpace(40);
    doc.font(typography.fontFamily).fontSize(bodySize).fillColor(colors.muted)
      .text('Es sind derzeit keine aktiven Werbekategorien hinterlegt.', m, y, { width: contentW });
  } else {
    categories.forEach((cat: any) => {
      const currency = String(cat.currency || 'EUR');
      const description = showDescriptions ? String(cat.description || '').trim() : '';
      const presentation = String(cat.presentation_template || '').trim();
      const details = [
        ['Standardposition', cat.default_position || '–'],
        ['Standarddauer', cat.default_duration !== null && cat.default_duration !== undefined ? `${cat.default_duration} Sekunden` : '–'],
        ['Basispreis', formatPrice(cat.base_price, currency)],
        ['Preis pro Folge', formatPrice(cat.price_per_episode, currency)],
        ['Preis pro 1.000 Hörer', formatPrice(cat.price_per_1000_listens, currency)],
        ['Währung', currency],
        ...(showExclusive ? [['Exklusiv', cat.is_exclusive === 1 ? 'Ja' : 'Nein']] : []),
        ['Status', cat.is_active === 1 ? 'Aktiv' : 'Inaktiv'],
        ['Anzeigefarbe', cat.color || '–'],
        ['Reihenfolge', String(cat.sort_order ?? '–')],
      ];
      const detailColumns = 3;
      const detailRows = Math.ceil(details.length / detailColumns);
      const innerWidth = contentW - 20;
      const gap = 10;
      const detailWidth = (innerWidth - gap * (detailColumns - 1)) / detailColumns;

      doc.font(typography.fontFamily).fontSize(bodySize);
      const titleHeight = Math.max(13, doc.heightOfString(String(cat.name || 'Ohne Bezeichnung'), { width: innerWidth - 20 }));
      let descriptionHeight = 0;
      if (description) {
        doc.font(typography.fontFamily).fontSize(smallSize + 1);
        descriptionHeight = doc.heightOfString(description, { width: innerWidth });
      }
      let presentationHeight = 0;
      if (presentation) {
        doc.font(typography.fontFamily).fontSize(smallSize + 1);
        presentationHeight = doc.heightOfString(presentation, { width: innerWidth });
      }
      const cardHeight = 12 + titleHeight + (description ? descriptionHeight + 9 : 2) + detailRows * 29 + (presentation ? presentationHeight + 27 : 7);
      ensureSpace(cardHeight + 10);

      const cardTop = y;
      doc.roundedRect(m, cardTop, contentW, cardHeight, 5).fillAndStroke('#f8fafc', colors.accent);
      doc.rect(m, cardTop, 6, cardHeight).fill(cat.color || colors.primary);
      doc.font(`${typography.fontFamily}-Bold`).fontSize(bodySize + 2).fillColor(colors.primary)
        .text(String(cat.name || 'Ohne Bezeichnung'), m + 12, cardTop + 9, { width: innerWidth - 20 });

      let cursorY = cardTop + 9 + titleHeight;
      if (description) {
        cursorY += 4;
        doc.font(typography.fontFamily).fontSize(smallSize + 1).fillColor(colors.text)
          .text(description, m + 10, cursorY, { width: innerWidth });
        cursorY += descriptionHeight + 7;
      } else {
        cursorY += 3;
      }

      details.forEach(([label, value], detailIndex) => {
        const row = Math.floor(detailIndex / detailColumns);
        const column = detailIndex % detailColumns;
        const detailX = m + 10 + column * (detailWidth + gap);
        const detailY = cursorY + row * 29;
        doc.font(`${typography.fontFamily}-Bold`).fontSize(smallSize).fillColor(colors.muted)
          .text(String(label), detailX, detailY, { width: detailWidth });
        doc.font(typography.fontFamily).fontSize(smallSize + 1).fillColor(colors.text)
          .text(String(value), detailX, detailY + 11, { width: detailWidth });
      });
      cursorY += detailRows * 29;

      if (presentation) {
        doc.font(`${typography.fontFamily}-Bold`).fontSize(smallSize).fillColor(colors.muted)
          .text('Präsentationsvorlage', m + 10, cursorY, { width: innerWidth });
        doc.font(typography.fontFamily).fontSize(smallSize + 1).fillColor(colors.text)
          .text(presentation, m + 10, cursorY + 12, { width: innerWidth });
      }

      y = cardTop + cardHeight + 10;
    });
  }

  const pageRange = doc.bufferedPageRange();
  for (let pageIndex = pageRange.start; pageIndex < pageRange.start + pageRange.count; pageIndex += 1) {
    doc.switchToPage(pageIndex);
    renderPdfFooter(doc, layout, { podcastName: companyName ? `${podcastName} · ${companyName}` : podcastName, pageNum: pageIndex + 1 });
  }

  doc.end();
});

// ============================================================
// BOOKING CONFIRMATION PDF HELPERS
// ============================================================
function confirmationLayout(layoutId?: string): any {
  const selected = layoutId ? getLayoutById(layoutId) : null;
  return selected || getDefaultLayoutForType('confirmation');
}

function confirmationDate(value: unknown): string {
  if (!value) return '–';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('de-DE');
}

function confirmationMoney(value: unknown, currency = 'EUR'): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return '–';
  return `${amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function confirmationText(value: unknown): string {
  if (value === null || value === undefined || String(value).trim() === '') return '–';
  return String(value).trim();
}

function confirmationFilename(value: unknown): string {
  return String(value || 'Sponsor')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'Sponsor';
}

function confirmationStatus(value: unknown): string {
  const raw = confirmationText(value);
  if (raw === '–') return raw;
  return raw.charAt(0).toUpperCase() + raw.slice(1).replace(/_/g, ' ');
}

function confirmationEpisodes(booking: any): string {
  const labels: string[] = [];
  if (booking.episode_refs) {
    try {
      const refs = JSON.parse(booking.episode_refs);
      if (Array.isArray(refs)) {
        refs.forEach((ref: any) => {
          const title = confirmationText(ref.episodeTitle || ref.title || ref.episodeId);
          const count = Number(ref.count || 1);
          if (title !== '–') labels.push(count > 1 ? `${title} (${count} Platzierungen)` : title);
        });
      }
    } catch (_) {}
  }
  if (labels.length === 0 && booking.episode_title) {
    const number = booking.episode_number !== null && booking.episode_number !== undefined
      ? `#${booking.episode_number} `
      : '';
    labels.push(`${number}${booking.episode_title}`);
  }
  return labels.length > 0 ? labels.join('\n') : 'Keine konkrete Folge zugeordnet';
}

function confirmationSponsorLines(sponsor: any): { left: string[]; right: string[] } {
  const left: string[] = [];
  const right: string[] = [];
  if (sponsor.company) left.push(String(sponsor.company));
  if (sponsor.name && sponsor.name !== sponsor.company) left.push(String(sponsor.name));
  if (sponsor.address) left.push(String(sponsor.address));
  if (sponsor.customer_number) left.push(`Kundennummer: ${sponsor.customer_number}`);

  if (sponsor.contact_name) right.push(`Ansprechpartner: ${sponsor.contact_name}`);
  if (sponsor.contact_email) right.push(`E-Mail: ${sponsor.contact_email}`);
  if (sponsor.contact_phone) right.push(`Telefon: ${sponsor.contact_phone}`);
  if (sponsor.website) right.push(`Website: ${sponsor.website}`);
  if (sponsor.contact_hint) right.push(`Kontakt-Hinweis: ${sponsor.contact_hint}`);

  if (left.length === 0) left.push('Keine Stammdaten hinterlegt');
  if (right.length === 0) right.push('Keine Kontaktdaten hinterlegt');
  return { left, right };
}

function renderConfirmationPdf(
  res: Response,
  db: any,
  sponsor: any,
  bookings: any[],
  layout: any,
  documentTitle: string,
  filename: string,
): void {
  const PDFDocument = require('pdfkit');
  const m = Math.max(30, Number(layout.pageMargin) || 50);
  const typography = layout.typography;
  const colors = layout.colors;
  const bodySize = Math.max(8, Number(typography.bodySize) || 10);
  const smallSize = Math.max(7, Number(typography.smallSize) || 8);
  const headingSize = Math.max(10, Number(typography.headingSize) || 11);
  const sections = layout.sections || {};
  const { podcastName, companyName, logoPath } = loadBranding(db);
  const currency = String(sponsor.currency || 'EUR');

  const doc = new PDFDocument({
    margin: m,
    size: layout.pageSize || 'A4',
    layout: layout.pageOrientation === 'landscape' ? 'landscape' : 'portrait',
    autoFirstPage: false,
    bufferPages: true,
  });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  doc.on('end', () => {
    const buffer = Buffer.concat(chunks);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  });

  let pageNum = 0;
  let contentW = 0;
  let y = 0;
  const bottomY = () => doc.page.height - 55;
  const addPage = () => {
    doc.addPage();
    pageNum += 1;
    contentW = doc.page.width - m * 2;
    renderWatermark(doc, layout);
    renderPdfHeader(doc, layout, { podcastName, documentTitle, logoPath });
    y = Math.max(doc.y, m);
  };
  const ensureSpace = (requiredHeight: number) => {
    if (y + requiredHeight > bottomY()) addPage();
  };

  const wrappedLines = (text: string, width: number): string[] => {
    const output: string[] = [];
    String(text || '–').split(/\r?\n/).forEach((paragraph: string) => {
      const words = paragraph.trim().split(/\s+/).filter(Boolean);
      if (words.length === 0) {
        output.push('');
        return;
      }
      let line = '';
      words.forEach((word: string) => {
        if (doc.widthOfString(word) > width) {
          if (line) {
            output.push(line);
            line = '';
          }
          let part = '';
          for (const character of word) {
            const candidate = part + character;
            if (part && doc.widthOfString(candidate) > width) {
              output.push(part);
              part = character;
            } else {
              part = candidate;
            }
          }
          line = part;
          return;
        }
        const candidate = line ? `${line} ${word}` : word;
        if (line && doc.widthOfString(candidate) > width) {
          output.push(line);
          line = word;
        } else {
          line = candidate;
        }
      });
      if (line) output.push(line);
    });
    return output.length > 0 ? output : ['–'];
  };

  const sectionTitle = (title: string) => {
    ensureSpace(28);
    doc.font(`${typography.fontFamily}-Bold`).fontSize(headingSize).fillColor(colors.primary)
      .text(title, m, y, { width: contentW });
    y += 18;
    doc.moveTo(m, y).lineTo(m + contentW, y).strokeColor(colors.accent).lineWidth(0.7).stroke();
    y += 7;
  };

  const detailRows = (rows: Array<[string, string]>) => {
    const labelW = Math.min(145, contentW * 0.32);
    const valueW = contentW - labelW - 18;
    rows.forEach(([label, value], index) => {
      doc.font(typography.fontFamily).fontSize(bodySize);
      const valueLines = wrappedLines(value, valueW);
      const lineHeight = bodySize + 3;
      const rowHeight = Math.max(22, valueLines.length * lineHeight + 8);
      if (rowHeight <= bottomY() - Math.max(doc.y, m)) {
        ensureSpace(rowHeight);
        if (index % 2 === 1) doc.rect(m, y, contentW, rowHeight).fill('#f8fafc');
        doc.font(`${typography.fontFamily}-Bold`).fontSize(smallSize + 1).fillColor(colors.muted)
          .text(label, m + 6, y + 6, { width: labelW - 8 });
        doc.font(typography.fontFamily).fontSize(bodySize).fillColor(colors.text);
        valueLines.forEach((line: string, lineIndex: number) => {
          doc.text(line || ' ', m + labelW + 8, y + 6 + lineIndex * lineHeight, { width: valueW, lineBreak: false });
        });
        y += rowHeight;
      } else {
        ensureSpace(24);
        doc.font(`${typography.fontFamily}-Bold`).fontSize(smallSize + 1).fillColor(colors.muted)
          .text(label, m + 6, y + 5, { width: contentW - 12 });
        y += 18;
        doc.font(typography.fontFamily).fontSize(bodySize).fillColor(colors.text);
        valueLines.forEach((line: string) => {
          ensureSpace(lineHeight + 2);
          doc.text(line || ' ', m + 12, y, { width: contentW - 24, lineBreak: false });
          y += lineHeight;
        });
        y += 4;
      }
    });
    y += 7;
  };

  const longText = (title: string, value: string) => {
    if (!value || value === '–') return;
    doc.font(typography.fontFamily).fontSize(bodySize).fillColor(colors.text);
    const lines = wrappedLines(value, contentW - 16);
    const lineHeight = bodySize + 3;
    ensureSpace(headingSize + 18 + Math.min(lines.length, 2) * lineHeight);
    sectionTitle(title);
    lines.forEach((line: string) => {
      ensureSpace(lineHeight + 2);
      doc.text(line || ' ', m + 8, y, { width: contentW - 16, lineBreak: false });
      y += lineHeight;
    });
    y += 8;
  };

  const sponsorCard = () => {
    const { left, right } = confirmationSponsorLines(sponsor);
    const gap = 18;
    const colW = (contentW - gap - 24) / 2;
    doc.font(typography.fontFamily).fontSize(bodySize);
    const leftLines = left.flatMap((line: string) => wrappedLines(line, colW));
    const rightLines = right.flatMap((line: string) => wrappedLines(line, colW));
    const lineHeight = bodySize + 4;
    const cardHeight = 34 + Math.max(leftLines.length, rightLines.length) * lineHeight;
    ensureSpace(cardHeight + 10);
    const top = y;
    doc.roundedRect(m, top, contentW, cardHeight, 5).fillAndStroke('#f8fafc', colors.accent);
    doc.font(`${typography.fontFamily}-Bold`).fontSize(headingSize).fillColor(colors.primary)
      .text('Sponsor', m + 12, top + 10, { width: colW });
    doc.text('Kontakt', m + 12 + colW + gap, top + 10, { width: colW });
    doc.font(typography.fontFamily).fontSize(bodySize).fillColor(colors.text);
    leftLines.forEach((line: string, index: number) => {
      doc.text(line || ' ', m + 12, top + 29 + index * lineHeight, { width: colW, lineBreak: false });
    });
    rightLines.forEach((line: string, index: number) => {
      doc.text(line || ' ', m + 12 + colW + gap, top + 29 + index * lineHeight, { width: colW, lineBreak: false });
    });
    y = top + cardHeight + 12;
  };

  const bookingBlock = (booking: any, index: number) => {
    const title = bookings.length === 1
      ? `Buchung ${confirmationText(booking.slot_name || booking.category_name)}`
      : `Buchung ${index + 1}: ${confirmationText(booking.slot_name || booking.category_name)}`;
    sectionTitle(title);

    const period = booking.booking_end_date
      ? `${confirmationDate(booking.booking_date)} bis ${confirmationDate(booking.booking_end_date)}`
      : confirmationDate(booking.booking_date);
    const placementCount = Number(booking.placement_count || booking.total_episodes || 1);
    const invoice = [
      confirmationStatus(booking.invoice_status),
      booking.invoice_number ? `Nr. ${booking.invoice_number}` : '',
      booking.invoice_date ? `vom ${confirmationDate(booking.invoice_date)}` : '',
    ].filter(Boolean).join(' · ');
    const contract = booking.contract_start || booking.contract_end
      ? `${confirmationDate(booking.contract_start)} bis ${confirmationDate(booking.contract_end)}`
      : 'Kein Vertrag zugeordnet';

    detailRows([
      ['Buchungs-ID', confirmationText(booking.id)],
      ['Werbeplatz / Kategorie', confirmationText(booking.slot_name || booking.category_name)],
      ['Buchungszeitraum', period],
      ['Status', confirmationStatus(booking.status)],
      ['Auslieferung bestätigt', booking.delivery_confirmed ? 'Ja' : 'Nein'],
      ['Rechnung', invoice || '–'],
      ['Vertrag', contract],
      ['Platzierungen / Folgen', String(Number.isFinite(placementCount) ? placementCount : 1)],
      ['Zugeordnete Folgen', confirmationEpisodes(booking)],
      ['Hörerzahl', booking.listener_count !== null && booking.listener_count !== undefined
        ? Number(booking.listener_count).toLocaleString('de-DE')
        : 'Nicht hinterlegt'],
    ]);

    if (sections.showConfirmationPricing !== false) {
      ensureSpace(headingSize + 18 + 5 * (bodySize + 12));
      sectionTitle('Preisdetails');
      const discountValue = Number(booking.discount || 0);
      const discount = booking.discount_type === 'percent'
        ? `${discountValue.toLocaleString('de-DE')} %`
        : confirmationMoney(discountValue, currency);
      detailRows([
        ['Basispreis', confirmationMoney(booking.price, currency)],
        ['Preisanpassung', confirmationMoney(booking.price_adjustment, currency)],
        ['Rabatt', discount],
        ['Hörerbeteiligung', confirmationMoney(booking.listener_fee, currency)],
        ['Gesamtpreis', confirmationMoney(booking.final_price, currency)],
      ]);
    }

    longText('Buchungsnotizen', confirmationText(booking.notes));
    longText('Leistungsnotizen', confirmationText(booking.performance_notes));
    y += 6;
  };

  addPage();
  sponsorCard();

  if (bookings.length === 0) {
    sectionTitle('Buchungen');
    doc.font(typography.fontFamily).fontSize(bodySize).fillColor(colors.muted)
      .text('Für diesen Sponsor sind keine Buchungen vorhanden.', m, y, { width: contentW });
  } else {
    const total = bookings.reduce((sum: number, booking: any) => sum + Number(booking.final_price || 0), 0);
    detailRows([
      ['Bestätigungsdatum', new Date().toLocaleDateString('de-DE')],
      ['Anzahl Buchungen', String(bookings.length)],
      ['Gesamtwert', confirmationMoney(total, currency)],
    ]);
    bookings.forEach(bookingBlock);
  }

  const range = doc.bufferedPageRange();
  const footerName = companyName ? `${podcastName} · ${companyName}` : podcastName;
  for (let pageIndex = range.start; pageIndex < range.start + range.count; pageIndex += 1) {
    doc.switchToPage(pageIndex);
    renderPdfFooter(doc, layout, { podcastName: footerName, pageNum: pageIndex + 1 });
  }
  doc.end();
}

// ============================================================
// BOOKING CONFIRMATION PDF EXPORT (einzelne Buchung)
// ============================================================
router.get('/bookings/:bookingId/confirmation-pdf', requirePermission('canViewSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const booking = db.get(
    `SELECT ab.*, s.name as slot_name, c.name as category_name,
            e.title as episode_title, e.number as episode_number,
            sc.contract_start, sc.contract_end,
            sp.name as sponsor_name, sp.company, sp.address, sp.contact_name,
            sp.contact_email, sp.contact_phone, sp.website, sp.customer_number,
            sp.contact_hint, sp.currency
     FROM ad_bookings ab
     LEFT JOIN ad_slots s ON ab.slot_id = s.id
     LEFT JOIN ad_categories c ON ab.slot_id = c.id
     LEFT JOIN episodes e ON ab.episode_id = e.id
     LEFT JOIN sponsor_contracts sc ON ab.contract_id = sc.id
     JOIN sponsors sp ON ab.sponsor_id = sp.id
     WHERE ab.id = ?`,
    [req.params.bookingId],
  ) as any;

  if (!booking) return res.status(404).json({ success: false, error: 'Buchung nicht gefunden' });

  try {
    const layout = confirmationLayout(req.query.layoutId as string | undefined);
    const sponsor = {
      name: booking.sponsor_name,
      company: booking.company,
      address: booking.address,
      contact_name: booking.contact_name,
      contact_email: booking.contact_email,
      contact_phone: booking.contact_phone,
      website: booking.website,
      customer_number: booking.customer_number,
      contact_hint: booking.contact_hint,
      currency: booking.currency,
    };
    renderConfirmationPdf(
      res,
      db,
      sponsor,
      [booking],
      layout,
      'Buchungsbestätigung',
      `Buchungsbestaetigung-${confirmationFilename(booking.sponsor_name)}-${confirmationFilename(booking.id)}.pdf`,
    );
  } catch (error) {
    console.error('[Sponsoring] Buchungsbestätigung konnte nicht erstellt werden:', error);
    if (!res.headersSent) res.status(500).json({ success: false, error: 'Buchungsbestätigung konnte nicht erstellt werden' });
  }
});

// ============================================================
// ALL BOOKINGS CONFIRMATION PDF EXPORT (alle Buchungen eines Sponsors)
// ============================================================
router.get(['/:sponsorId/bookings/confirmation-pdf', '/:sponsorId/bookings/confirmation-pdf-all'], requirePermission('canViewSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const sponsor = db.get('SELECT * FROM sponsors WHERE id = ?', [req.params.sponsorId]) as any;
  if (!sponsor) return res.status(404).json({ success: false, error: 'Sponsor nicht gefunden' });

  const bookings = db.all(
    `SELECT ab.*, s.name as slot_name, c.name as category_name,
            e.title as episode_title, e.number as episode_number,
            sc.contract_start, sc.contract_end
     FROM ad_bookings ab
     LEFT JOIN ad_slots s ON ab.slot_id = s.id
     LEFT JOIN ad_categories c ON ab.slot_id = c.id
     LEFT JOIN episodes e ON ab.episode_id = e.id
     LEFT JOIN sponsor_contracts sc ON ab.contract_id = sc.id
     WHERE ab.sponsor_id = ?
     ORDER BY ab.booking_date ASC, ab.created_at ASC`,
    [req.params.sponsorId],
  ) as any[];

  try {
    const layout = confirmationLayout(req.query.layoutId as string | undefined);
    renderConfirmationPdf(
      res,
      db,
      sponsor,
      bookings,
      layout,
      'Buchungsbestätigung – alle Buchungen',
      `Buchungsbestaetigung-alle-${confirmationFilename(sponsor.name)}-${new Date().toISOString().slice(0, 10)}.pdf`,
    );
  } catch (error) {
    console.error('[Sponsoring] Sammelbestätigung konnte nicht erstellt werden:', error);
    if (!res.headersSent) res.status(500).json({ success: false, error: 'Sammelbestätigung konnte nicht erstellt werden' });
  }
});

// ============================================================
// SPONSOR DOSSIER PDF EXPORT
// ============================================================
router.get('/:sponsorId/dossier-pdf', requirePermission('canViewSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { sponsorId } = req.params;
  const sponsor = db.get('SELECT * FROM sponsors WHERE id = ?', [sponsorId]) as any;

  if (!sponsor) {
    return res.status(404).json({ success: false, error: 'Sponsor nicht gefunden' });
  }

  const layoutId = req.query.layoutId as string;
  let layout: any;
  try {
    layout = layoutId ? getLayoutById(layoutId) : null;
    if (!layout) layout = getDefaultLayoutForType('sponsor_dossier' as any);
  } catch (_) {
    layout = { colors: {}, sections: {}, footer: {}, header: {}, typography: {}, pageMargin: 50 };
  }

  const cfg = layout || {};
  const colors = cfg.colors || {};
  const sections = cfg.sections || {};
  const footerCfg = cfg.footer || {};
  const m = cfg.pageMargin || 50;
  const queryEnabled = (key: string, fallback = true) => req.query[key] === undefined ? fallback : req.query[key] !== '0';
  const showMeta = queryEnabled('stammdaten', sections.showDossierMeta !== false);
  const showContracts = queryEnabled('contracts', sections.showDossierContracts !== false);
  const showBookings = queryEnabled('bookings', sections.showDossierBookings !== false);
  const showBilling = queryEnabled('billing', sections.showDossierBilling !== false);
  const showNotes = queryEnabled('notes', true);
  let documentTitle = String(req.query.title || 'Sponsor-Dossier');
  try { documentTitle = decodeURIComponent(documentTitle); } catch (_) {}
  const primaryColor: string = colors.primary || '#7c3aed';
  const headerBgColor: string = colors.background || colors.primary || '#7c3aed';
  const headerTextColor: string = colors.headerText || '#ffffff';

  const { podcastName, companyName, logoPath } = loadBranding(db);

  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ margin: m, size: 'A4', autoFirstPage: true, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  doc.on('end', () => {
    const buf = Buffer.concat(chunks);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Sponsor-Dossier_${sponsor.name?.replace(/\s+/g, '-').toLowerCase() || sponsorId}.pdf"`);
    res.send(buf);
  });

  const contentW = doc.page.width - m * 2;
  const nowStr = new Date().toLocaleDateString('de-DE');

  // Header
  doc.rect(0, 0, doc.page.width, 90).fill(headerBgColor);
  if (logoPath && fs.existsSync(logoPath)) {
    try { doc.image(logoPath, m, 15, { height: 40 }); } catch (_) {}
  }
  doc.fontSize(22).font('Helvetica-Bold').fillColor(headerTextColor)
    .text(documentTitle, m, 18, { align: 'right', width: contentW });
  const subLine = [podcastName, companyName].filter(Boolean).join(' · ') + ` · ${nowStr}`;
  doc.fontSize(9).font('Helvetica').fillColor(headerTextColor).opacity(0.8)
    .text(subLine, m, 55, { align: 'right', width: contentW });
  doc.opacity(1);
  let y = 105;

  const ensureSpace = (needed: number) => {
    if (y + needed <= doc.page.height - 55) return;
    doc.addPage();
    y = m;
  };

  // Sponsor-Metadaten
  if (showMeta) {
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#111').text('Sponsor-Informationen', m, y);
    y += 25;
    
    const infoData = [
      ['Name:', sponsor.name || '—'],
      ['Firma:', sponsor.company || '—'],
      ['Adresse:', sponsor.address || '—'],
      ['Kontaktperson:', sponsor.contact_name || '—'],
      ['E-Mail:', sponsor.contact_email || '—'],
      ['Telefon:', sponsor.contact_phone || '—'],
      ['Website:', sponsor.website || '—']
    ];

    infoData.forEach(([label, value]) => {
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#333').text(label, m, y, { width: 100 });
      doc.fontSize(9).font('Helvetica').fillColor('#555').text(value, m + 110, y, { width: contentW - 110 });
      y += 18;
    });
    y += 10;
  }

  // Verträge
  if (showContracts) {
    const contracts = db.all('SELECT * FROM sponsor_contracts WHERE sponsor_id = ? ORDER BY contract_start DESC', [sponsorId]) as any[];
    if (contracts.length > 0) {
      ensureSpace(45);
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#111').text('Verträge', m, y);
      y += 20;
      contracts.forEach((contract: any) => {
        ensureSpace(20);
        const period = `${contract.contract_start || '—'} bis ${contract.contract_end || '—'}`;
        const details = [contract.sponsoring_type, contract.status, contract.notes].filter(Boolean).join(' · ') || '—';
        doc.fontSize(9).font('Helvetica').fillColor('#333').text(`${period} · ${details}`, m, y, { width: contentW });
        y += Math.max(16, doc.heightOfString(`${period} · ${details}`, { width: contentW }) + 5);
      });
      y += 10;
    }
  }

  // Buchungen
  if (showBookings) {
    const bookings = db.all(
      `SELECT ab.*, s.name as slot_name, c.name as category_name
       FROM ad_bookings ab
       LEFT JOIN ad_slots s ON ab.slot_id = s.id
       LEFT JOIN ad_categories c ON ab.slot_id = c.id
       WHERE ab.sponsor_id = ?
       ORDER BY ab.booking_date DESC LIMIT 10`,
      [sponsorId]
    ) as any[];
    if (bookings.length > 0) {
      ensureSpace(45);
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#111').text('Aktuelle Buchungen', m, y);
      y += 20;
      bookings.forEach((booking: any) => {
        ensureSpace(20);
        doc.fontSize(9).font('Helvetica').fillColor('#333')
          .text(`${booking.booking_date || '—'} bis ${booking.booking_end_date || '—'} · ${booking.slot_name || booking.category_name || '—'} · ${Number(booking.final_price || 0).toFixed(2)} €`, m, y, { width: contentW });
        y += 16;
      });
      y += 10;
    }
  }

  // Abrechnungsübersicht
  if (showBilling) {
    const billing = db.all(
      `SELECT invoice_status, COUNT(*) as booking_count, COALESCE(SUM(final_price), 0) as total
       FROM ad_bookings WHERE sponsor_id = ? GROUP BY invoice_status ORDER BY invoice_status`,
      [sponsorId],
    ) as any[];
    if (billing.length > 0) {
      ensureSpace(45);
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#111').text('Abrechnungsübersicht', m, y);
      y += 20;
      billing.forEach((row: any) => {
        ensureSpace(18);
        doc.fontSize(9).font('Helvetica').fillColor('#333')
          .text(`${row.invoice_status || 'offen'} · ${row.booking_count} Buchung(en) · ${Number(row.total || 0).toFixed(2)} €`, m, y, { width: contentW });
        y += 16;
      });
      y += 10;
    }
  }

  // Notizen
  if (showNotes) {
    const notes = [sponsor.description, sponsor.notes, sponsor.contact_hint].filter(Boolean).join('\n\n');
    if (notes) {
      ensureSpace(50);
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#111').text('Notizen', m, y);
      y += 20;
      doc.fontSize(9).font('Helvetica').fillColor('#333').text(notes, m, y, { width: contentW });
      y += doc.heightOfString(notes, { width: contentW }) + 10;
    }
  }

  // Layoutgesteuerte Fußzeile auf allen echten Inhaltsseiten.
  const pageRange = doc.bufferedPageRange();
  for (let pageIndex = pageRange.start; pageIndex < pageRange.start + pageRange.count; pageIndex += 1) {
    doc.switchToPage(pageIndex);
    renderPdfFooter(doc, layout, {
      podcastName: companyName ? `${podcastName} · ${companyName}` : podcastName,
      pageNum: pageIndex + 1,
    });
  }

  doc.end();
});

export default router;
