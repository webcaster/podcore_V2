import express, { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';
import * as fs from 'fs';
import * as path from 'path';
import { DATA_DIR } from '../database';
import { getDefaultLayoutForType, getLayoutById } from '../pdfLayouts';

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
  return res.json({ success: true, data: bookings.map(b => ({ ...b, slotName: b.slot_name, sponsorName: b.sponsor_name })) });
});

router.post('/:sponsorId/bookings', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { slotId, bookingDate, bookingEndDate, price = 0, priceAdjustment = 0, listenerFee = 0, notes, invoiceStatus, status, contractId, placementCount, episodeRefs, discount = 0, discountType = 'absolute', listenerCount, totalEpisodes } = req.body;
  if (!slotId || !bookingDate) return res.status(400).json({ success: false, error: 'slotId und bookingDate erforderlich' });
  const id = uuidv4();
  const discountAmount = discountType === 'percent' ? (price * (discount || 0)) / 100 : (discount || 0);
  const finalPrice = Math.max(0, price + (priceAdjustment || 0) + listenerFee - discountAmount);
  db.run(
    `INSERT INTO ad_bookings (id, slot_id, sponsor_id, booking_date, booking_end_date, price, price_adjustment, listener_fee, final_price, status, invoice_status, notes, contract_id, placement_count, episode_refs, discount, discount_type, listener_count, total_episodes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, slotId, req.params.sponsorId, bookingDate, bookingEndDate || null, price, priceAdjustment || 0, listenerFee || 0, finalPrice, status || 'geplant', invoiceStatus || 'offen', notes || null, contractId || null, placementCount || 1, JSON.stringify(episodeRefs || []), discount || 0, discountType || 'absolute', listenerCount || null, totalEpisodes || null],
  );
  return res.status(201).json({ success: true, data: { id } });
});

router.put('/bookings/:bookingId', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const b = req.body;
  db.run(`UPDATE ad_bookings SET status = ?, invoice_status = ?, notes = ?, updated_at = datetime('now') WHERE id = ?`,
    [b.status, b.invoiceStatus, b.notes, req.params.bookingId]);
  return res.json({ success: true });
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

        const optBg = optionColors[optIdx % optionColors.length];
        const optHeaderY = doc.y;
        doc.rect(m, optHeaderY, contentW, 22).fill(optBg);
        doc.rect(m, optHeaderY, 4, 22).fill(accentColor);
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#111')
          .text(opt.title || `Option ${optIdx + 1}`, m + 12, optHeaderY + 5, { width: contentW - 20 });
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
            .text('Gesamt Option:', m + 5, sumY + 5, { width: contentW * 0.72, align: 'right' });
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
    const fy = doc.page.height - 30;
    doc.rect(m, fy - 6, contentW, 0.5).fill('#ddd');
    const footerParts: string[] = [];
    if (footerCfg.showPodcastName !== false) footerParts.push(podcastName);
    if (footerCfg.showDate !== false) footerParts.push(nowStr);
    if (offer.offer_number) footerParts.push(`Nr. ${offer.offer_number}`);
    if (footerCfg.customText) footerParts.push(footerCfg.customText);
    doc.fontSize(7).font('Helvetica').fillColor('#aaa')
      .text(footerParts.join(' · '), m, fy, { align: 'center', width: contentW });
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
  const rawTitle = (req.query.title as string) || 'Preisliste';
  const rawDesc = (req.query.description as string) || '';
  const categories = db.all(`SELECT * FROM ad_categories WHERE is_active = 1 ORDER BY sort_order ASC, name ASC`) as any[];

  const layoutId = req.query.layoutId as string;
  let layout: any;
  try {
    layout = layoutId ? getLayoutById(layoutId) : null;
    if (!layout) layout = getDefaultLayoutForType('sponsor_offer' as any);
  } catch (_) {
    layout = { colors: {}, sections: {}, footer: {}, header: {}, typography: {}, pageMargin: 50 };
  }

  const cfg = layout || {};
  const colors = cfg.colors || {};
  const footerCfg = cfg.footer || {};
  const m = cfg.pageMargin || 50;
  const primaryColor: string = colors.primary || '#7c3aed';
  const headerBgColor: string = colors.background || colors.primary || '#7c3aed';
  const headerTextColor: string = colors.headerText || '#ffffff';

  const { podcastName, companyName, logoPath } = loadBranding(db);

  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ margin: m, size: 'A4', autoFirstPage: true });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  doc.on('end', () => {
    const buf = Buffer.concat(chunks);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Preisliste.pdf"`);
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
    .text(rawTitle, m, 18, { align: 'right', width: contentW });
  const subLine = [podcastName, companyName].filter(Boolean).join(' · ') + ` · ${nowStr}`;
  doc.fontSize(9).font('Helvetica').fillColor(headerTextColor).opacity(0.8)
    .text(subLine, m, 55, { align: 'right', width: contentW });
  doc.opacity(1);
  let y = 105;

  if (rawDesc) {
    doc.fontSize(10).font('Helvetica').fillColor('#333').text(rawDesc, m, y, { width: contentW });
    y += doc.heightOfString(rawDesc, { width: contentW }) + 16;
  }

  // Tabellen-Header
  const col1 = contentW * 0.38;
  const col2 = contentW * 0.12;
  const col3 = contentW * 0.12;
  const col4 = contentW * 0.19;
  const col5 = contentW * 0.19;
  doc.rect(m, y, contentW, 22).fill(primaryColor);
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#fff');
  doc.text('Werbeplatz', m + 5, y + 7, { width: col1 });
  doc.text('Position', m + col1 + 5, y + 7, { width: col2 });
  doc.text('Dauer', m + col1 + col2 + 5, y + 7, { width: col3, align: 'right' });
  doc.text('Basispreis', m + col1 + col2 + col3 + 5, y + 7, { width: col4, align: 'right' });
  doc.text('Pro Folge', m + col1 + col2 + col3 + col4 + 5, y + 7, { width: col5, align: 'right' });
  y += 22;

  categories.forEach((cat: any, idx: number) => {
    if (y + 28 > doc.page.height - 60) { doc.addPage(); y = m; }
    doc.rect(m, y, contentW, 26).fill(idx % 2 === 0 ? '#ffffff' : '#f7f7f7');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#111').text(cat.name || '–', m + 5, y + 4, { width: col1 });
    if (cat.description) {
      doc.fontSize(7).font('Helvetica').fillColor('#666').text(cat.description, m + 5, y + 14, { width: col1 - 5 });
    }
    doc.fontSize(9).font('Helvetica').fillColor('#444').text(cat.default_position || '–', m + col1 + 5, y + 8, { width: col2 });
    doc.text(cat.default_duration ? `${cat.default_duration}s` : '–', m + col1 + col2 + 5, y + 8, { width: col3, align: 'right' });
    doc.text(cat.base_price ? `${Number(cat.base_price).toFixed(2)} €` : '–', m + col1 + col2 + col3 + 5, y + 8, { width: col4, align: 'right' });
    doc.text(cat.price_per_episode ? `${Number(cat.price_per_episode).toFixed(2)} €` : '–', m + col1 + col2 + col3 + col4 + 5, y + 8, { width: col5, align: 'right' });
    y += 26;
  });

  // Footer
  if (footerCfg.showPodcastName !== false || footerCfg.showDate !== false) {
    const fy = doc.page.height - 30;
    doc.fontSize(7).font('Helvetica').fillColor('#aaa')
      .text(`${podcastName} · Preisliste · ${nowStr}`, m, fy, { align: 'center', width: contentW });
  }

  doc.end();
});

export default router;
