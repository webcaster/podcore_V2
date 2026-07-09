import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';

const router: import("express").Router = Router();
router.use(requireAuth as any);

// ============================================================
// SPONSOR CONTRACTS (v2.12.0)
// ============================================================

router.get('/:sponsorId/contracts', requirePermission('canViewSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const contracts = db.all(
    'SELECT * FROM sponsor_contracts WHERE sponsor_id = ? ORDER BY contract_start DESC',
    [req.params.sponsorId]
  ) as any[];

  return res.json({
    success: true,
    data: contracts.map((c: any) => ({
      id: c.id,
      sponsorId: c.sponsor_id,
      contractStart: c.contract_start,
      contractEnd: c.contract_end,
      contactPerson: c.contact_person,
      contactEmail: c.contact_email,
      contactPhone: c.contact_phone,
      sponsoringType: c.sponsoring_type,
      notes: c.notes,
      status: c.status,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    })),
  });
});

router.post('/:sponsorId/contracts', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { contractStart, contractEnd, contactPerson, contactEmail, contactPhone, sponsoringType, notes } = req.body;

  if (!contractStart || !contractEnd) {
    return res.status(400).json({ success: false, error: 'contractStart und contractEnd erforderlich' });
  }

  const id = uuidv4();
  db.run(
    `INSERT INTO sponsor_contracts (id, sponsor_id, contract_start, contract_end, contact_person, contact_email, contact_phone, sponsoring_type, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'aktiv')`,
    [id, req.params.sponsorId, contractStart, contractEnd, contactPerson || null, contactEmail || null, contactPhone || null, sponsoringType || null, notes || null]
  );

  const contract = db.get('SELECT * FROM sponsor_contracts WHERE id = ?', [id]) as any;
  return res.status(201).json({
    success: true,
    data: {
      id: contract.id,
      sponsorId: contract.sponsor_id,
      contractStart: contract.contract_start,
      contractEnd: contract.contract_end,
      contactPerson: contract.contact_person,
      contactEmail: contract.contact_email,
      contactPhone: contract.contact_phone,
      sponsoringType: contract.sponsoring_type,
      notes: contract.notes,
      status: contract.status,
      createdAt: contract.created_at,
      updatedAt: contract.updated_at,
    },
  });
});

router.put('/contracts/:contractId', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { contractStart, contractEnd, contactPerson, contactEmail, contactPhone, sponsoringType, notes, status } = req.body;

  db.run(
    `UPDATE sponsor_contracts SET
      contract_start = COALESCE(?, contract_start),
      contract_end = COALESCE(?, contract_end),
      contact_person = ?,
      contact_email = ?,
      contact_phone = ?,
      sponsoring_type = ?,
      notes = ?,
      status = COALESCE(?, status),
      updated_at = datetime('now')
     WHERE id = ?`,
    [
      contractStart ?? null,
      contractEnd ?? null,
      contactPerson ?? null,
      contactEmail ?? null,
      contactPhone ?? null,
      sponsoringType ?? null,
      notes ?? null,
      status ?? null,
      req.params.contractId,
    ]
  );

  const contract = db.get('SELECT * FROM sponsor_contracts WHERE id = ?', [req.params.contractId]) as any;
  return res.json({
    success: true,
    data: {
      id: contract.id,
      sponsorId: contract.sponsor_id,
      contractStart: contract.contract_start,
      contractEnd: contract.contract_end,
      contactPerson: contract.contact_person,
      contactEmail: contract.contact_email,
      contactPhone: contract.contact_phone,
      sponsoringType: contract.sponsoring_type,
      notes: contract.notes,
      status: contract.status,
      createdAt: contract.created_at,
      updatedAt: contract.updated_at,
    },
  });
});

router.delete('/contracts/:contractId', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.run('DELETE FROM sponsor_contracts WHERE id = ?', [req.params.contractId]);
  return res.json({ success: true });
});

// ============================================================
// AD BOOKINGS (v2.12.0)
// ============================================================

router.get('/:sponsorId/bookings', requirePermission('canViewSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { from, to, status } = req.query;

  let query = `
    SELECT ab.*,
           COALESCE(s.name, c.name) as slot_name,
           COALESCE(s.category, c.default_position) as slot_position,
           sp.name as sponsor_name,
           e.title as episode_title, e.number as episode_number
    FROM ad_bookings ab
    LEFT JOIN ad_slots s ON ab.slot_id = s.id
    LEFT JOIN ad_categories c ON ab.slot_id = c.id
    JOIN sponsors sp ON ab.sponsor_id = sp.id
    LEFT JOIN episodes e ON ab.episode_id = e.id
    WHERE ab.sponsor_id = ?
  `;
  const params: any[] = [req.params.sponsorId];

  if (from) {
    query += ' AND ab.booking_date >= ?';
    params.push(from);
  }
  if (to) {
    query += ' AND ab.booking_date <= ?';
    params.push(to);
  }
  if (status) {
    query += ' AND ab.status = ?';
    params.push(status);
  }

  query += ' ORDER BY ab.booking_date DESC';

  const bookings = db.all(query, params) as any[];
  return res.json({
    success: true,
    data: bookings.map((b: any) => ({
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
      deliveryConfirmed: b.delivery_confirmed === 1,
      listenerCount: b.listener_count,
      status: b.status,
      notes: b.notes,
      slotName: b.slot_name,
      slotPosition: b.slot_position,
      sponsorName: b.sponsor_name,
      episodeTitle: b.episode_title,
      episodeNumber: b.episode_number,
      contractId: b.contract_id,
      placementCount: b.placement_count ?? 1,
      episodeRefs: b.episode_refs ? (() => { try { return JSON.parse(b.episode_refs); } catch { return []; } })() : [],
      discount: b.discount ?? 0,
      discountType: b.discount_type ?? 'absolute',
      totalEpisodes: b.total_episodes ?? null,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
    })),
  });
});

router.post('/:sponsorId/bookings', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const {
    slotId,
    episodeId,
    bookingDate,
    bookingEndDate,
    price = 0,
    priceAdjustment = 0,
    listenerFee = 0,
    notes,
    invoiceStatus,
    status,
    contractId,
    placementCount,
    episodeRefs,
    discount = 0,
    discountType = 'absolute',
    listenerCount,
    totalEpisodes,
  } = req.body;

  if (!slotId || !bookingDate) {
    return res.status(400).json({ success: false, error: 'slotId und bookingDate erforderlich' });
  }

  // slotId kann entweder eine ad_slots ID oder eine ad_categories ID sein
  // Preis aus der Kategorie vorausfüllen wenn nicht angegeben
  let resolvedPrice = price;
  const category = db.get('SELECT * FROM ad_categories WHERE id = ?', [slotId]) as any;
  if (category && (!price || price === 0)) {
    resolvedPrice = category.price_per_episode || category.base_price || 0;
  }

  // CPM-Gebühr berechnen: listenerFee = (listenerCount / 1000) * pricePer1000
  let resolvedListenerFee = listenerFee || 0;
  if (category && category.price_per_1000 && listenerCount && listenerCount > 0) {
    resolvedListenerFee = (listenerCount / 1000) * category.price_per_1000;
  }
  // Rabatt berechnen
  const discountAmount = discountType === 'percent'
    ? (resolvedPrice * (discount || 0)) / 100
    : (discount || 0);
  const finalPrice = Math.max(0, resolvedPrice + (priceAdjustment || 0) + resolvedListenerFee - discountAmount);
  const id = uuidv4();

  db.run(
    `INSERT INTO ad_bookings (id, slot_id, sponsor_id, episode_id, booking_date, booking_end_date, price, price_adjustment, listener_fee, final_price, status, invoice_status, notes, contract_id, placement_count, episode_refs, discount, discount_type, listener_count, total_episodes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      slotId,
      req.params.sponsorId,
      episodeId || null,
      bookingDate,
      bookingEndDate || null,
      resolvedPrice,
      priceAdjustment || 0,
      resolvedListenerFee,
      finalPrice,
      status || 'geplant',
      invoiceStatus || 'offen',
      notes || null,
      contractId || null,
      placementCount != null ? Number(placementCount) : 1,
      episodeRefs ? JSON.stringify(episodeRefs) : null,
      discount || 0,
      discountType || 'absolute',
      listenerCount || null,
      totalEpisodes ? Number(totalEpisodes) : null,
    ]
  );

  // Slot-Name aus ad_slots ODER ad_categories laden
  const slotFromSlots = db.get('SELECT name FROM ad_slots WHERE id = ?', [slotId]) as any;
  const slotFromCats = db.get('SELECT name FROM ad_categories WHERE id = ?', [slotId]) as any;
  const slotName = slotFromSlots?.name || slotFromCats?.name || slotId;

  const booking = db.get(
    `SELECT ab.*, sp.name as sponsor_name
     FROM ad_bookings ab
     JOIN sponsors sp ON ab.sponsor_id = sp.id
     WHERE ab.id = ?`,
    [id]
  ) as any;

  return res.status(201).json({
    success: true,
    data: {
      id: booking.id,
      slotId: booking.slot_id,
      sponsorId: booking.sponsor_id,
      episodeId: booking.episode_id,
      bookingDate: booking.booking_date,
      bookingEndDate: booking.booking_end_date,
      price: booking.price,
      priceAdjustment: booking.price_adjustment,
      listenerFee: booking.listener_fee,
      finalPrice: booking.final_price,
      invoiceStatus: booking.invoice_status,
      invoiceNumber: booking.invoice_number,
      invoiceDate: booking.invoice_date,
      deliveryConfirmed: booking.delivery_confirmed === 1,
      listenerCount: booking.listener_count,
      status: booking.status,
      notes: booking.notes,
      slotName: slotName,
      sponsorName: booking.sponsor_name,
      contractId: booking.contract_id,
      placementCount: booking.placement_count ?? 1,
      episodeRefs: booking.episode_refs ? JSON.parse(booking.episode_refs) : [],
      discount: booking.discount ?? 0,
      discountType: booking.discount_type ?? 'absolute',
      totalEpisodes: booking.total_episodes ?? null,
      createdAt: booking.created_at,
      updatedAt: booking.updated_at,
    },
  });
});

router.put('/bookings/:bookingId', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const {
    price,
    priceAdjustment,
    listenerFee,
    invoiceStatus,
    invoiceNumber,
    invoiceDate,
    deliveryConfirmed,
    listenerCount,
    status,
    notes,
    contractId,
    placementCount,
    episodeRefs,
    discount,
    discountType,
    bookingDate,
    bookingEndDate,
    totalEpisodes,
  } = req.body;

  // Berechne finalPrice neu wenn Preiskomponenten geändert werden
  let finalPrice: number | null = null;
  if (price !== undefined || priceAdjustment !== undefined || listenerFee !== undefined || discount !== undefined || discountType !== undefined) {
    const existing = db.get('SELECT price, price_adjustment, listener_fee, discount, discount_type FROM ad_bookings WHERE id = ?', [
      req.params.bookingId,
    ]) as any;
    const effectivePrice = price ?? existing.price;
    const effectiveAdj = priceAdjustment ?? existing.price_adjustment;
    const effectiveFee = listenerFee ?? existing.listener_fee;
    const effectiveDiscount = discount ?? existing.discount ?? 0;
    const effectiveDiscountType = discountType ?? existing.discount_type ?? 'absolute';
    const discountAmt = effectiveDiscountType === 'percent'
      ? (effectivePrice * effectiveDiscount) / 100
      : effectiveDiscount;
    finalPrice = Math.max(0, effectivePrice + effectiveAdj + effectiveFee - discountAmt);
  }

  const updates: string[] = [];
  const values: any[] = [];

  if (price !== undefined) {
    updates.push('price = ?');
    values.push(price);
  }
  if (priceAdjustment !== undefined) {
    updates.push('price_adjustment = ?');
    values.push(priceAdjustment);
  }
  if (listenerFee !== undefined) {
    updates.push('listener_fee = ?');
    values.push(listenerFee);
  }
  if (finalPrice !== null) {
    updates.push('final_price = ?');
    values.push(finalPrice);
  }
  if (invoiceStatus !== undefined) {
    updates.push('invoice_status = ?');
    values.push(invoiceStatus);
  }
  if (invoiceNumber !== undefined) {
    updates.push('invoice_number = ?');
    values.push(invoiceNumber);
  }
  if (invoiceDate !== undefined) {
    updates.push('invoice_date = ?');
    values.push(invoiceDate);
  }
  if (deliveryConfirmed !== undefined) {
    updates.push('delivery_confirmed = ?');
    values.push(deliveryConfirmed ? 1 : 0);
  }
  if (listenerCount !== undefined) {
    updates.push('listener_count = ?');
    values.push(listenerCount);
  }
  if (status !== undefined) {
    updates.push('status = ?');
    values.push(status);
  }
  if (notes !== undefined) {
    updates.push('notes = ?');
    values.push(notes);
  }
  if (contractId !== undefined) {
    updates.push('contract_id = ?');
    values.push(contractId || null);
  }
  if (placementCount !== undefined) {
    updates.push('placement_count = ?');
    values.push(Number(placementCount));
  }
  if (episodeRefs !== undefined) {
    updates.push('episode_refs = ?');
    values.push(episodeRefs ? JSON.stringify(episodeRefs) : null);
  }
  if (discount !== undefined) {
    updates.push('discount = ?');
    values.push(discount ?? 0);
  }
  if (discountType !== undefined) {
    updates.push('discount_type = ?');
    values.push(discountType || 'absolute');
  }
  if (bookingDate !== undefined) {
    updates.push('booking_date = ?');
    values.push(bookingDate || null);
  }
  if (bookingEndDate !== undefined) {
    updates.push('booking_end_date = ?');
    values.push(bookingEndDate || null);
  }
  if (totalEpisodes !== undefined) {
    updates.push('total_episodes = ?');
    values.push(totalEpisodes ? Number(totalEpisodes) : null);
  }

  if (updates.length === 0) {
    return res.status(400).json({ success: false, error: 'Keine Änderungen' });
  }

  updates.push('updated_at = datetime("now")');
  values.push(req.params.bookingId);

  db.run(`UPDATE ad_bookings SET ${updates.join(', ')} WHERE id = ?`, values);

  const booking = db.get(
    `SELECT ab.*, COALESCE(s.name, c.name) as slot_name, sp.name as sponsor_name
     FROM ad_bookings ab
     LEFT JOIN ad_slots s ON ab.slot_id = s.id
     LEFT JOIN ad_categories c ON ab.slot_id = c.id
     JOIN sponsors sp ON ab.sponsor_id = sp.id
     WHERE ab.id = ?`,
    [req.params.bookingId]
  ) as any;

  return res.json({
    success: true,
    data: {
      id: booking.id,
      slotId: booking.slot_id,
      sponsorId: booking.sponsor_id,
      episodeId: booking.episode_id,
      bookingDate: booking.booking_date,
      bookingEndDate: booking.booking_end_date,
      price: booking.price,
      priceAdjustment: booking.price_adjustment,
      listenerFee: booking.listener_fee,
      finalPrice: booking.final_price,
      invoiceStatus: booking.invoice_status,
      invoiceNumber: booking.invoice_number,
      invoiceDate: booking.invoice_date,
      deliveryConfirmed: booking.delivery_confirmed === 1,
      listenerCount: booking.listener_count,
      status: booking.status,
      notes: booking.notes,
      slotName: booking.slot_name,
      sponsorName: booking.sponsor_name,
      contractId: booking.contract_id,
      placementCount: booking.placement_count ?? 1,
      totalEpisodes: booking.total_episodes ?? null,
      episodeRefs: booking.episode_refs ? JSON.parse(booking.episode_refs) : [],
      discount: booking.discount ?? 0,
      discountType: booking.discount_type ?? 'absolute',
      createdAt: booking.created_at,
      updatedAt: booking.updated_at,
    },
  });
});

router.delete('/bookings/:bookingId', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.run('DELETE FROM ad_bookings WHERE id = ?', [req.params.bookingId]);
  return res.json({ success: true });
});

// ============================================================
// ALLE SLOTS (für Episoden-Editor v2 Buchungsformular)
// ============================================================

router.get('/slots', requirePermission('canViewSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  // Gibt Werbekategorien als buchbare Slot-Typen zurück
  const categories = db.all(`
    SELECT * FROM ad_categories
    WHERE is_active = 1
    ORDER BY sort_order ASC, name ASC
  `) as any[];
  return res.json({
    success: true,
    data: categories.map((c: any) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      color: c.color,
      position: c.default_position,
      defaultPosition: c.default_position,
      duration: c.default_duration,
      isExclusive: !!c.is_exclusive,
      basePrice: c.base_price,
      pricePerEpisode: c.price_per_episode,
      pricePer1000: c.price_per_1000_listens,
      currency: c.currency || 'EUR',
      presentationTemplate: c.presentation_template,
      isActive: !!c.is_active,
    })),
  });
});

// ============================================================
// BUCHUNGSBESTÄTIGUNG ALS PDF
// ============================================================

router.get('/bookings/:bookingId/confirmation-pdf', requirePermission('canViewSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const booking = db.get(`
    SELECT ab.*,
           COALESCE(s.name, c.name) as slot_name,
           COALESCE(s.category, c.default_position) as slot_position,
           COALESCE(s.duration, c.default_duration) as slot_duration,
           c.base_price as cat_base_price, c.price_per_episode as cat_price_per_episode, c.price_per_1000_listens as cat_price_per_1000,
           sp.name as sponsor_name, sp.company as sponsor_company, sp.contact_name, sp.contact_email, sp.website, sp.color as sponsor_color,
           sp.customer_number,
           e.title as episode_title, e.number as episode_number, e.publish_date
    FROM ad_bookings ab
    LEFT JOIN ad_slots s ON ab.slot_id = s.id
    LEFT JOIN ad_categories c ON ab.slot_id = c.id
    JOIN sponsors sp ON ab.sponsor_id = sp.id
    LEFT JOIN episodes e ON ab.episode_id = e.id
    WHERE ab.id = ?
  `, [req.params.bookingId]) as any;

  if (!booking) return res.status(404).json({ success: false, error: 'Buchung nicht gefunden' });

  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  doc.on('end', () => {
    const pdfBuffer = Buffer.concat(chunks);
    const filename = `Buchungsbestaetigung_${booking.sponsor_name.replace(/[^a-zA-Z0-9]/g, '_')}_${booking.id.slice(0, 8)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  });

  const accentColor = booking.sponsor_color || '#7c3aed';
  const now = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Header
  doc.rect(0, 0, doc.page.width, 80).fill(accentColor);
  doc.fillColor('white').fontSize(22).font('Helvetica-Bold').text('Buchungsbestätigung', 50, 25);
  doc.fontSize(10).font('Helvetica').text(`Erstellt am ${now}`, 50, 55);

  // Sponsor-Block
  doc.fillColor('#1a1a2e').rect(50, 100, doc.page.width - 100, 80).fill('#f8f8ff');
  doc.fillColor('#333').fontSize(14).font('Helvetica-Bold').text('Sponsor', 65, 112);
  doc.fontSize(11).font('Helvetica').text(booking.sponsor_name || '–', 65, 130);
  if (booking.sponsor_company) doc.text(booking.sponsor_company, 65, 145);
  if (booking.contact_name) doc.text(`Ansprechpartner: ${booking.contact_name}`, 65, 160);
  if (booking.contact_email) doc.text(`E-Mail: ${booking.contact_email}`, 350, 130);
  if (booking.website) doc.text(`Web: ${booking.website}`, 350, 145);

  // Buchungsdetails
  doc.fillColor('#333').fontSize(14).font('Helvetica-Bold').text('Buchungsdetails', 50, 200);
  doc.moveTo(50, 218).lineTo(doc.page.width - 50, 218).strokeColor(accentColor).lineWidth(2).stroke();

  // Preismodell ableiten
  const priceModelLabel = booking.cat_price_per_episode ? 'Pro Folge' : booking.cat_price_per_1000 ? 'CPM (pro 1.000 Hörer)' : booking.cat_base_price ? 'Basis-Preis' : '–';

  const details = [
    ['Buchungs-ID', booking.id.slice(0, 8).toUpperCase()],
    booking.customer_number ? ['Kundennummer', booking.customer_number] : null,
    ['Werbeplatz', `${booking.slot_name || '–'} (${booking.slot_position || '–'})`],
    ['Preismodell', priceModelLabel],
    ['Dauer', booking.slot_duration ? `${booking.slot_duration} Sekunden` : '–'],
    ['Episode', booking.episode_title ? `#${booking.episode_number || ''} ${booking.episode_title}` : '–'],
    ['Buchungszeitraum', booking.booking_date ? `${new Date(booking.booking_date).toLocaleDateString('de-DE')}${booking.booking_end_date ? ' – ' + new Date(booking.booking_end_date).toLocaleDateString('de-DE') : ''}` : '–'],
    ['Status', booking.status || '–'],
    ['Rechnungsstatus', booking.invoice_status || '–'],
  ].filter(Boolean) as [string, string][];

  let y = 230;
  details.forEach(([label, value], i) => {
    if (i % 2 === 0) doc.rect(50, y, doc.page.width - 100, 22).fill('#f0f0f8');
    doc.fillColor('#555').fontSize(9).font('Helvetica-Bold').text(label, 60, y + 6);
    doc.fillColor('#222').fontSize(9).font('Helvetica').text(String(value), 200, y + 6, { width: 300 });
    y += 22;
  });

  // Preisblock
  y += 15;
  doc.fillColor('#333').fontSize(14).font('Helvetica-Bold').text('Preisübersicht', 50, y);
  y += 18;
  doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor(accentColor).lineWidth(2).stroke();
  y += 10;

  const priceRows: [string, string][] = [
    ['Basispreis', `${(booking.price || 0).toFixed(2)} €`],
    ...(booking.price_adjustment && booking.price_adjustment !== 0 ? [['Preisanpassung', `${Number(booking.price_adjustment).toFixed(2)} €`] as [string, string]] : []),
    ...(booking.listener_fee && booking.listener_fee > 0 ? [['Hörerbeteiligung (Fee/1.000 Hörer)', `${Number(booking.listener_fee).toFixed(2)} €`] as [string, string]] : []),
    ...(booking.discount && booking.discount > 0 ? [[`Rabatt${booking.discount_type === 'percent' ? ` (${booking.discount}%)` : ''}`, `-${(booking.discount_type === 'percent' ? (booking.price || 0) * booking.discount / 100 : booking.discount).toFixed(2)} €`] as [string, string]] : []),
    ['Gesamtpreis', `${(booking.final_price || booking.price || 0).toFixed(2)} €`],
  ];

  priceRows.forEach(([label, value], i) => {
    const isFinal = i === priceRows.length - 1;
    if (isFinal) {
      doc.rect(50, y, doc.page.width - 100, 26).fill(accentColor);
      doc.fillColor('white').fontSize(11).font('Helvetica-Bold').text(label, 60, y + 7);
      doc.text(value, doc.page.width - 150, y + 7);
    } else {
      doc.fillColor('#555').fontSize(10).font('Helvetica').text(label, 60, y + 5);
      doc.fillColor('#222').text(value, doc.page.width - 150, y + 5);
    }
    y += isFinal ? 26 : 22;
  });

  if (booking.notes) {
    y += 20;
    doc.fillColor('#333').fontSize(12).font('Helvetica-Bold').text('Notizen', 50, y);
    y += 18;
    doc.fillColor('#555').fontSize(10).font('Helvetica').text(booking.notes, 50, y, { width: doc.page.width - 100 });
  }

  // Footer
  doc.fillColor('#aaa').fontSize(8).text(
    `PodCore v2.12.0 · Buchungsbestätigung · ${now}`,
    50, doc.page.height - 40, { align: 'center', width: doc.page.width - 100 }
  );

  doc.end();
});

// ============================================================
// BOOKING CALENDAR (v2.12.0)
// ============================================================

router.get('/calendar/bookings', requirePermission('canViewSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { from, to } = req.query;

  let query = `
    SELECT ab.*,
           COALESCE(s.name, c.name) as slot_name,
           COALESCE(s.category, c.default_position) as slot_position,
           sp.name as sponsor_name, sp.company as sponsor_company, sp.color as sponsor_color,
           e.title as episode_title, e.number as episode_number,
           c.base_price as cat_base_price,
           c.price_per_episode as cat_price_per_episode,
           c.price_per_1000_listens as cat_price_per_1000
    FROM ad_bookings ab
    LEFT JOIN ad_slots s ON ab.slot_id = s.id
    LEFT JOIN ad_categories c ON ab.slot_id = c.id
    JOIN sponsors sp ON ab.sponsor_id = sp.id
    LEFT JOIN episodes e ON ab.episode_id = e.id
    WHERE 1=1
  `;
  const params: any[] = [];

  // Overlap-Logik: Buchung liegt im Zeitraum wenn booking_date <= to UND (booking_end_date IS NULL OR booking_end_date >= from)
  if (from && to) {
    query += ' AND ab.booking_date <= ? AND (ab.booking_end_date IS NULL OR ab.booking_end_date >= ?)';
    params.push(to, from);
  } else if (from) {
    query += ' AND (ab.booking_end_date IS NULL OR ab.booking_end_date >= ?)';
    params.push(from);
  } else if (to) {
    query += ' AND ab.booking_date <= ?';
    params.push(to);
  }

  query += ' ORDER BY ab.booking_date ASC';

  const bookings = db.all(query, params) as any[];

  // Verträge laden
  let contractQuery = `
    SELECT sc.*, sp.name as sponsor_name, sp.company as sponsor_company, sp.color as sponsor_color
    FROM sponsor_contracts sc
    JOIN sponsors sp ON sc.sponsor_id = sp.id
    WHERE 1=1
  `;
  const contractParams: any[] = [];
  if (from) { contractQuery += ' AND (sc.contract_end IS NULL OR sc.contract_end >= ?)'; contractParams.push(from); }
  if (to) { contractQuery += ' AND (sc.contract_start IS NULL OR sc.contract_start <= ?)'; contractParams.push(to); }
  contractQuery += ' ORDER BY sc.contract_start ASC';
  const contracts = db.all(contractQuery, contractParams) as any[];

  return res.json({
    success: true,
    data: {
      contracts: contracts.map((c: any) => ({
        id: c.id,
        type: 'contract',
        sponsorId: c.sponsor_id,
        sponsorName: c.sponsor_name,
        sponsorCompany: c.sponsor_company,
        sponsorColor: c.sponsor_color || '#7c3aed',
        startDate: c.contract_start,
        endDate: c.contract_end,
        contactPerson: c.contact_person,
        contactEmail: c.contact_email,
        status: c.status,
        notes: c.notes,
      })),
      bookings: bookings.map((b: any) => ({
        id: b.id,
        type: 'booking',
        slotId: b.slot_id,
        sponsorId: b.sponsor_id,
        sponsorName: b.sponsor_name,
        sponsorCompany: b.sponsor_company,
        sponsorColor: b.sponsor_color || '#7c3aed',
        episodeId: b.episode_id,
        episodeTitle: b.episode_title,
        episodeNumber: b.episode_number,
        date: b.booking_date,
        endDate: b.booking_end_date,
        slotName: b.slot_name,
        position: b.slot_position,
        price: b.price,
        finalPrice: b.final_price,
        invoiceStatus: b.invoice_status,
        status: b.status,
        deliveryConfirmed: b.delivery_confirmed === 1,
        basePrice: b.cat_base_price,
        pricePerEpisode: b.cat_price_per_episode,
        pricePer1000: b.cat_price_per_1000,
        createdAt: b.created_at,
        updatedAt: b.updated_at,
      })),
    },
  });
});

// ============================================================
// SAMMEL-BUCHUNGSBESTÄTIGUNG ALS PDF (alle Buchungen eines Sponsors)
// ============================================================

router.get('/:sponsorId/bookings/confirmation-pdf-all', requirePermission('canViewSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const sponsor = db.get('SELECT * FROM sponsors WHERE id = ?', [req.params.sponsorId]) as any;
  if (!sponsor) return res.status(404).json({ success: false, error: 'Sponsor nicht gefunden' });

  const filterStatus = req.query.filter as string | undefined;
  let query = `
    SELECT ab.*,
           COALESCE(s.name, c.name) as slot_name,
           COALESCE(s.category, c.default_position) as slot_position,
           COALESCE(s.duration, c.default_duration) as slot_duration,
           c.base_price as cat_base_price, c.price_per_episode as cat_price_per_episode, c.price_per_1000_listens as cat_price_per_1000,
           sc.contract_start, sc.contract_end
    FROM ad_bookings ab
    LEFT JOIN ad_slots s ON ab.slot_id = s.id
    LEFT JOIN ad_categories c ON ab.slot_id = c.id
    LEFT JOIN sponsor_contracts sc ON ab.contract_id = sc.id
    WHERE ab.sponsor_id = ?
  `;
  const params: any[] = [req.params.sponsorId];
  if (filterStatus && filterStatus !== 'alle') {
    query += ' AND ab.invoice_status = ?';
    params.push(filterStatus);
  }
  query += ' ORDER BY ab.booking_date ASC';
  const bookings = db.all(query, params) as any[];

  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ margin: 50, size: 'A4', autoFirstPage: false });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  doc.on('end', () => {
    const pdfBuffer = Buffer.concat(chunks);
    const filename = `Buchungsbestaetigung_Alle_${sponsor.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  });

  const accentColor = sponsor.color || '#7c3aed';
  const now = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const pageW = 595.28;
  const m = 50;
  const tblW = pageW - m * 2;

  if (bookings.length === 0) {
    doc.addPage();
    doc.rect(0, 0, pageW, 80).fill(accentColor);
    doc.fillColor('white').fontSize(20).font('Helvetica-Bold').text('Buchungsbestätigungen', m, 25);
    doc.fontSize(10).font('Helvetica').text(`${sponsor.name} · Erstellt am ${now}`, m, 55);
    doc.fillColor('#555').fontSize(12).text('Keine Buchungen vorhanden.', m, 120);
    doc.end();
    return;
  }

  bookings.forEach((booking: any, idx: number) => {
    doc.addPage();
    const priceModelLabel = booking.cat_price_per_episode ? 'Pro Folge'
      : booking.cat_price_per_1000 ? 'CPM (pro 1.000 Hörer)'
      : booking.cat_base_price ? 'Basis-Preis' : '–';

    // Header
    doc.rect(0, 0, pageW, 80).fill(accentColor);
    doc.fillColor('white').fontSize(18).font('Helvetica-Bold').text('Buchungsbestätigung', m, 20);
    doc.fontSize(9).font('Helvetica').text(`${idx + 1} von ${bookings.length} · Erstellt am ${now}`, m, 48);
    if (filterStatus && filterStatus !== 'alle') {
      doc.text(`Filter: ${filterStatus}`, m, 60);
    }

    // Sponsor-Block
    doc.fillColor('#f8f8ff').rect(m, 95, tblW, 70).fill('#f8f8ff');
    doc.fillColor('#333').fontSize(12).font('Helvetica-Bold').text('Sponsor', m + 10, 103);
    doc.fontSize(10).font('Helvetica').fillColor('#555');
    doc.text(sponsor.name || '–', m + 10, 120);
    if (sponsor.company) doc.text(sponsor.company, m + 10, 134);
    if (sponsor.customer_number) {
      doc.fillColor('#888').fontSize(9).text(`Kundennummer: ${sponsor.customer_number}`, m + tblW / 2, 120);
    }
    if (sponsor.contact_name) doc.text(`Ansprechpartner: ${sponsor.contact_name}`, m + tblW / 2, 134);
    if (sponsor.contact_email) doc.fillColor('#555').text(`E-Mail: ${sponsor.contact_email}`, m + tblW / 2, 148);

    // Vertragszeitraum (falls vorhanden)
    let yPos = 180;
    if (booking.contract_start || booking.contract_end) {
      doc.fillColor('#333').fontSize(11).font('Helvetica-Bold').text('Vertragslaufzeit', m, yPos);
      yPos += 16;
      doc.moveTo(m, yPos).lineTo(pageW - m, yPos).strokeColor(accentColor).lineWidth(1.5).stroke();
      yPos += 8;
      const contractStr = [
        booking.contract_start ? new Date(booking.contract_start).toLocaleDateString('de-DE') : '?',
        '–',
        booking.contract_end ? new Date(booking.contract_end).toLocaleDateString('de-DE') : '?',
      ].join(' ');
      doc.fillColor('#555').fontSize(10).font('Helvetica').text(contractStr, m, yPos);
      yPos += 24;
    }

    // Buchungsdetails
    doc.fillColor('#333').fontSize(11).font('Helvetica-Bold').text('Buchungsdetails', m, yPos);
    yPos += 16;
    doc.moveTo(m, yPos).lineTo(pageW - m, yPos).strokeColor(accentColor).lineWidth(1.5).stroke();
    yPos += 8;

    const details: [string, string][] = [
      ['Buchungs-ID', booking.id.slice(0, 8).toUpperCase()],
      ['Werbeplatz', `${booking.slot_name || '–'} (${booking.slot_position || '–'})`],
      ['Preismodell', priceModelLabel],
      ['Buchungszeitraum', booking.booking_date
        ? `${new Date(booking.booking_date).toLocaleDateString('de-DE')}${booking.booking_end_date ? ' – ' + new Date(booking.booking_end_date).toLocaleDateString('de-DE') : ''}`
        : '–'],
      ['Platzierungen', String(booking.placement_count || 1)],
      ['Status', booking.status || '–'],
      ['Rechnungsstatus', booking.invoice_status || '–'],
    ];

    // Folgenreferenzen
    let episodeRefsArr: any[] = [];
    if (booking.episode_refs) {
      try { episodeRefsArr = JSON.parse(booking.episode_refs); } catch (_) {}
    }

    details.forEach(([label, value], i) => {
      if (i % 2 === 0) doc.rect(m, yPos, tblW, 20).fill('#f0f0f8');
      doc.fillColor('#555').fontSize(9).font('Helvetica-Bold').text(label, m + 8, yPos + 5);
      doc.fillColor('#222').fontSize(9).font('Helvetica').text(String(value), m + 180, yPos + 5, { width: tblW - 190 });
      yPos += 20;
    });

    // Folgenangaben
    if (episodeRefsArr.length > 0) {
      yPos += 10;
      doc.fillColor('#333').fontSize(10).font('Helvetica-Bold').text('Folgenangaben', m, yPos);
      yPos += 14;
      episodeRefsArr.forEach((ref: any, ri: number) => {
        if (ri % 2 === 0) doc.rect(m, yPos, tblW, 18).fill('#f8f8ff');
        const refLabel = ref.episodeTitle || ref.episodeId || `Folge ${ri + 1}`;
        const refCount = ref.count ? ` · ${ref.count}× platziert` : '';
        doc.fillColor('#444').fontSize(9).font('Helvetica').text(`${refLabel}${refCount}`, m + 8, yPos + 4, { width: tblW - 16 });
        yPos += 18;
      });
    }

    // Preisblock
    yPos += 15;
    doc.fillColor('#333').fontSize(11).font('Helvetica-Bold').text('Preisübersicht', m, yPos);
    yPos += 16;
    doc.moveTo(m, yPos).lineTo(pageW - m, yPos).strokeColor(accentColor).lineWidth(1.5).stroke();
    yPos += 8;

    const priceRows: [string, string, boolean][] = [
      ['Buchungspreis', `${(booking.price || 0).toFixed(2)} €`, false],
      ...(booking.price_adjustment && booking.price_adjustment !== 0 ? [['Preisanpassung', `${Number(booking.price_adjustment).toFixed(2)} €`, false] as [string, string, boolean]] : []),
      ...(booking.listener_fee && booking.listener_fee > 0 ? [['Hörerbeteiligung (Fee/1.000 Hörer)', `${Number(booking.listener_fee).toFixed(2)} €`, false] as [string, string, boolean]] : []),
      ...(booking.discount && booking.discount > 0 ? [[`Rabatt${booking.discount_type === 'percent' ? ` (${booking.discount}%)` : ''}`, `-${(booking.discount_type === 'percent' ? (booking.price || 0) * booking.discount / 100 : booking.discount).toFixed(2)} €`, false] as [string, string, boolean]] : []),
      ['Gesamtpreis', `${(booking.final_price || booking.price || 0).toFixed(2)} €`, true],
    ];
    priceRows.forEach(([label, value, isFinal]) => {
      if (isFinal) {
        doc.rect(m, yPos, tblW, 24).fill(accentColor);
        doc.fillColor('white').fontSize(11).font('Helvetica-Bold').text(label, m + 8, yPos + 6);
        doc.text(value, pageW - m - 80, yPos + 6, { width: 70, align: 'right' });
        yPos += 24;
      } else {
        doc.fillColor('#555').fontSize(10).font('Helvetica').text(label, m + 8, yPos + 4);
        doc.fillColor('#222').text(value, pageW - m - 80, yPos + 4, { width: 70, align: 'right' });
        yPos += 20;
      }
    });

    if (booking.notes) {
      yPos += 12;
      doc.fillColor('#333').fontSize(10).font('Helvetica-Bold').text('Notizen', m, yPos);
      yPos += 14;
      doc.fillColor('#555').fontSize(9).font('Helvetica').text(booking.notes, m, yPos, { width: tblW });
    }

    // Footer
    doc.fillColor('#aaa').fontSize(8).text(
      `PodCore · Buchungsbestätigung · ${sponsor.name} · ${now}`,
      m, doc.page.height - 35, { align: 'center', width: tblW }
    );
  });

  doc.end();
});

// ── GET /:sponsorId/dossier-pdf — Sponsor-Dossier als PDF ──────────────────
router.get('/:sponsorId/dossier-pdf', requirePermission('canViewSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { sponsorId } = req.params;
  const {
    title: rawTitle,
    stammdaten = '1',
    contracts: inclContracts = '1',
    bookings: inclBookings = '1',
    billing: inclBilling = '1',
    notes: inclNotes = '1',
  } = req.query as Record<string, string>;

  const sponsor = db.get('SELECT * FROM sponsors WHERE id = ?', [sponsorId]) as any;
  if (!sponsor) return res.status(404).json({ success: false, error: 'Sponsor nicht gefunden' });

  const contracts = db.all('SELECT * FROM sponsor_contracts WHERE sponsor_id = ? ORDER BY contract_start DESC', [sponsorId]) as any[];
  const bookings = db.all(
    `SELECT ab.*, COALESCE(s.name, c.name) as slot_name
     FROM ad_bookings ab
     LEFT JOIN ad_slots s ON ab.slot_id = s.id
     LEFT JOIN ad_categories c ON ab.slot_id = c.id
     WHERE ab.sponsor_id = ? ORDER BY ab.booking_date DESC`,
    [sponsorId]
  ) as any[];

  const PDFDocument = require('pdfkit');
  const fs = require('fs');
  const path = require('path');
  const { DATA_DIR } = require('../database');
  // Layout-System integrieren
  let dossierLayout: any = null;
  try {
    const { getDefaultLayoutForType } = require('../pdfLayouts');
    dossierLayout = getDefaultLayoutForType('sponsor_dossier');
  } catch (_) {}

  const settingsRow = db.get("SELECT value FROM settings WHERE key = 'app'") as any;
  const settings = settingsRow ? JSON.parse(settingsRow.value) : {};
  const podcastName = settings?.branding?.podcastName || settings?.general?.podcastName || 'PodCore';
  let logoPath: string | null = null;
  const brandingDir = path.join(DATA_DIR, 'branding');
  if (fs.existsSync(brandingDir)) {
    const lf = fs.readdirSync(brandingDir).find((f: string) => f.startsWith('logo.'));
    if (lf) logoPath = path.join(brandingDir, lf);
  }

  const docTitle = rawTitle ? decodeURIComponent(rawTitle) : `Sponsor-Dossier ${sponsor.name}`;
  const now = new Date().toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const m = dossierLayout?.pageMargin ?? 40;
  const accentColor = dossierLayout?.colors?.secondary ?? '#7c3aed';
  const headerBgColor = dossierLayout?.colors?.background ?? '#1e3a5f';
  const headerTextColor = dossierLayout?.colors?.headerText ?? '#ffffff';
  const lightGray = '#f0f0f0';

  const doc = new PDFDocument({ margin: m, size: 'A4', autoFirstPage: true });
  const filename = `Sponsor-Dossier_${sponsor.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  doc.on('end', () => res.send(Buffer.concat(chunks)));

  const pageW = doc.page.width;
  const contentW = pageW - 2 * m;

  // Header mit Layout-Farben
  const headerH = dossierLayout?.headerHeight ?? 70;
  doc.rect(0, 0, doc.page.width, headerH).fill(headerBgColor);
  if (logoPath && fs.existsSync(logoPath)) {
    try { doc.image(logoPath, m, 12, { height: 36 }); } catch (_) {}
  }
  doc.fontSize(18).font('Helvetica-Bold').fillColor(headerTextColor).text(docTitle, m, 14, { align: 'right', width: contentW });
  doc.fontSize(9).font('Helvetica').fillColor(headerTextColor).opacity(0.7).text(`${podcastName} \u00b7 Erstellt am ${now}`, m, 40, { align: 'right', width: contentW });
  doc.opacity(1);
  doc.y = headerH + 12;
  doc.rect(m, doc.y, contentW, 1).fill(accentColor);
  doc.moveDown(1);

  const sectionTitle = (title: string) => {
    doc.moveDown(0.5);
    const sy = doc.y;
    doc.rect(m, sy, contentW, 20).fill(accentColor);
    doc.fontSize(11).font('Helvetica-Bold').fillColor('white').text(title, m + 8, sy + 4, { width: contentW - 16 });
    doc.y = sy + 22;
    doc.moveDown(0.3);
  };

  const infoRow = (label: string, value: string) => {
    const yy = doc.y;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#555').text(label + ':', m, yy, { width: 140, continued: false });
    doc.fontSize(9).font('Helvetica').fillColor('#222').text(value || '\u2014', m + 145, yy, { width: contentW - 145 });
    doc.y = doc.y + 2;
  };

  // Stammdaten
  if (stammdaten === '1') {
    sectionTitle('Stammdaten');
    infoRow('Name', sponsor.name);
    infoRow('Unternehmen', sponsor.company || '\u2014');
    if (sponsor.customer_number) infoRow('Kundennummer', sponsor.customer_number);
    infoRow('Status', sponsor.status || '\u2014');
    infoRow('Kategorie', sponsor.category || '\u2014');
    if (sponsor.contact_name) infoRow('Ansprechpartner', sponsor.contact_name);
    if (sponsor.contact_email) infoRow('E-Mail', sponsor.contact_email);
    if (sponsor.contact_phone) infoRow('Telefon', sponsor.contact_phone);
    if (sponsor.website) infoRow('Website', sponsor.website);
    if (inclNotes === '1' && sponsor.notes) {
      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#555').text('Notizen:', m);
      doc.fontSize(9).font('Helvetica').fillColor('#333').text(sponsor.notes, m + 10, doc.y, { width: contentW - 10 });
    }
  }

  // Vertr\u00e4ge
  if (inclContracts === '1' && contracts.length > 0) {
    sectionTitle(`Vertr\u00e4ge (${contracts.length})`);
    contracts.forEach((c: any, i: number) => {
      if (i > 0) { doc.moveDown(0.2); doc.rect(m, doc.y, contentW, 0.5).fill('#ddd'); doc.moveDown(0.2); }
      const from = c.contract_start ? new Date(c.contract_start).toLocaleDateString('de-DE') : '\u2014';
      const to = c.contract_end ? new Date(c.contract_end).toLocaleDateString('de-DE') : '\u2014';
      infoRow('Laufzeit', `${from} \u2013 ${to}`);
      if (c.sponsoring_type) infoRow('Sponsoring-Typ', c.sponsoring_type);
      if (c.contract_value) infoRow('Vertragswert', `${Number(c.contract_value).toFixed(2)} \u20ac`);
      if (c.contact_person) infoRow('Ansprechpartner', c.contact_person);
      if (c.notes) infoRow('Notizen', c.notes);
    });
  }

  // Buchungen
  if (inclBookings === '1' && bookings.length > 0) {
    sectionTitle(`Buchungen (${bookings.length})`);
    const cols = [m, m + 120, m + 220, m + 310, m + 390];
    const hY = doc.y;
    doc.rect(m, hY, contentW, 16).fill(lightGray);
    ['Slot', 'Zeitraum', 'Status', 'Rechnung', 'Preis'].forEach((h, i) => {
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#333').text(h, cols[i], hY + 3, { width: 90 });
    });
    doc.y = hY + 18;
    bookings.forEach((b: any, i: number) => {
      if (doc.y > doc.page.height - 80) { doc.addPage(); }
      const bg = i % 2 === 0 ? 'white' : '#fafafa';
      const rY = doc.y;
      doc.rect(m, rY, contentW, 15).fill(bg);
      const price = b.final_price ?? b.price ?? 0;
      const from = b.booking_date ? new Date(b.booking_date).toLocaleDateString('de-DE') : '\u2014';
      const to = b.booking_end_date ? new Date(b.booking_end_date).toLocaleDateString('de-DE') : '';
      const dateStr = to ? `${from}\u2013${to}` : from;
      doc.fontSize(8).font('Helvetica').fillColor('#222');
      doc.text(b.slot_name || '\u2014', cols[0], rY + 2, { width: 115, ellipsis: true });
      doc.text(dateStr, cols[1], rY + 2, { width: 95, ellipsis: true });
      doc.text(b.status || 'geplant', cols[2], rY + 2, { width: 85 });
      doc.text(b.invoice_status || 'offen', cols[3], rY + 2, { width: 75 });
      doc.text(price > 0 ? `${Number(price).toFixed(2)} \u20ac` : '\u2014', cols[4], rY + 2, { width: 80, align: 'right' });
      doc.y = rY + 17;
    });
  }

  // Abrechnungs\u00fcbersicht
  if (inclBilling === '1' && bookings.length > 0) {
    sectionTitle('Abrechnungs\u00fcbersicht');
    const total = bookings.reduce((s: number, b: any) => s + (b.final_price ?? b.price ?? 0), 0);
    const paid = bookings.filter((b: any) => b.invoice_status === 'bezahlt').reduce((s: number, b: any) => s + (b.final_price ?? b.price ?? 0), 0);
    const open = bookings.filter((b: any) => !b.invoice_status || b.invoice_status === 'offen').reduce((s: number, b: any) => s + (b.final_price ?? b.price ?? 0), 0);
    const sent = bookings.filter((b: any) => b.invoice_status === 'versendet').reduce((s: number, b: any) => s + (b.final_price ?? b.price ?? 0), 0);
    const withDiscount = bookings.filter((b: any) => (b.discount ?? 0) > 0).length;
    const cpmBookings = bookings.filter((b: any) => b.price_model === 'cpm' || (b.listener_count && b.listener_count > 0)).length;
    infoRow('Gesamtumsatz', `${total.toFixed(2)} \u20ac`);
    infoRow('Davon bezahlt', `${paid.toFixed(2)} \u20ac`);
    infoRow('Davon versendet', `${sent.toFixed(2)} \u20ac`);
    infoRow('Davon offen', `${open.toFixed(2)} \u20ac`);
    infoRow('Buchungen gesamt', `${bookings.length}`);
    if (withDiscount > 0) infoRow('Buchungen mit Rabatt', `${withDiscount}`);
    if (cpmBookings > 0) infoRow('CPM-Buchungen', `${cpmBookings}`);
  }

  // Footer
  doc.moveDown(2);
  const footerY = doc.page.height - 35;
  doc.rect(m, footerY - 8, contentW, 0.5).fill('#ddd');
  doc.fontSize(8).font('Helvetica').fillColor('#aaa').text(
    `${podcastName} \u00b7 Sponsor-Dossier \u00b7 ${sponsor.name} \u00b7 Erstellt am ${now}`,
    m, footerY, { align: 'center', width: contentW }
  );

  doc.end();
});

// ============================================================
// SPONSOR OFFERS (v2.12.8)
// ============================================================

// GET /:sponsorId/offers — alle Angebote eines Sponsors
router.get('/:sponsorId/offers', requirePermission('canViewSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const offers = db.all(
    `SELECT * FROM sponsor_offers WHERE sponsor_id = ? ORDER BY created_at DESC`,
    [req.params.sponsorId]
  ) as any[];
  return res.json({
    success: true,
    data: offers.map(o => ({
      id: o.id,
      sponsorId: o.sponsor_id,
      title: o.title,
      offerNumber: o.offer_number,
      validUntil: o.valid_until,
      status: o.status,
      introText: o.intro_text,
      outroText: o.outro_text,
      positions: o.positions ? JSON.parse(o.positions) : [],
      offerOptions: o.offer_options ? JSON.parse(o.offer_options) : null,
      totalPrice: o.total_price,
      discount: o.discount,
      discountType: o.discount_type,
      notes: o.notes,
      createdBy: o.created_by,
      createdAt: o.created_at,
      updatedAt: o.updated_at,
    }))
  });
});

// POST /:sponsorId/offers — neues Angebot erstellen
router.post('/:sponsorId/offers', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const {
    title, offerNumber, validUntil, introText, outroText,
    positions = [], discount = 0, discountType = 'absolute', notes, offerOptions = null
  } = req.body;
  if (!title) return res.status(400).json({ success: false, error: 'Titel erforderlich' });
  const posArr = Array.isArray(positions) ? positions : [];
  // Gesamtpreis berechnen: aus Positionen oder aus offerOptions
  let totalPrice = 0;
  if (offerOptions && Array.isArray(offerOptions) && offerOptions.length > 0) {
    // Mehrfach-Optionen: Gesamtpreis = Maximum aller Optionen
    totalPrice = Math.max(...offerOptions.map((opt: any) => {
      const optSub = (opt.positions || []).reduce((s: number, p: any) => s + ((p.unitPrice || 0) * (p.quantity || 1)), 0);
      const optDisc = (opt.discountType || discountType) === 'percent' ? optSub * ((opt.discount || discount) / 100) : (opt.discount || discount || 0);
      return Math.max(0, optSub - optDisc);
    }));
  } else {
    const subtotal = posArr.reduce((s: number, p: any) => s + ((p.unitPrice || 0) * (p.quantity || 1)), 0);
    const discountAmt = discountType === 'percent' ? subtotal * (discount / 100) : (discount || 0);
    totalPrice = Math.max(0, subtotal - discountAmt);
  }
  const id = uuidv4();
  // Angebotsnummer generieren wenn nicht angegeben
  const autoNumber = offerNumber || `ANG-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
  db.run(
    `INSERT INTO sponsor_offers (id, sponsor_id, title, offer_number, valid_until, status, intro_text, outro_text, positions, total_price, discount, discount_type, notes, created_by, offer_options)
     VALUES (?, ?, ?, ?, ?, 'entwurf', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, req.params.sponsorId, title, autoNumber, validUntil || null,
     introText || null, outroText || null, JSON.stringify(posArr),
     totalPrice, discount || 0, discountType || 'absolute', notes || null,
     (req as any).user?.id || null,
     offerOptions ? JSON.stringify(offerOptions) : null]
  );
  const offer = db.get('SELECT * FROM sponsor_offers WHERE id = ?', [id]) as any;
  return res.status(201).json({
    success: true,
    data: {
      id: offer.id, sponsorId: offer.sponsor_id, title: offer.title,
      offerNumber: offer.offer_number, validUntil: offer.valid_until,
      status: offer.status, introText: offer.intro_text, outroText: offer.outro_text,
      positions: offer.positions ? JSON.parse(offer.positions) : [],
      offerOptions: offer.offer_options ? JSON.parse(offer.offer_options) : null,
      totalPrice: offer.total_price, discount: offer.discount,
      discountType: offer.discount_type, notes: offer.notes,
      createdAt: offer.created_at, updatedAt: offer.updated_at,
    }
  });
});

// PUT /offers/:offerId — Angebot bearbeiten
router.put('/offers/:offerId', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const {
    title, offerNumber, validUntil, status, introText, outroText,
    positions, discount, discountType, notes, offerOptions
  } = req.body;
  const existing = db.get('SELECT * FROM sponsor_offers WHERE id = ?', [req.params.offerId]) as any;
  if (!existing) return res.status(404).json({ success: false, error: 'Angebot nicht gefunden' });
  const posArr = positions !== undefined ? (Array.isArray(positions) ? positions : []) : JSON.parse(existing.positions || '[]');
  const eff_discount = discount !== undefined ? discount : existing.discount;
  const eff_discountType = discountType !== undefined ? discountType : existing.discount_type;
  // Gesamtpreis berechnen
  let totalPrice = 0;
  const effOfferOptions = offerOptions !== undefined ? offerOptions : (existing.offer_options ? JSON.parse(existing.offer_options) : null);
  if (effOfferOptions && Array.isArray(effOfferOptions) && effOfferOptions.length > 0) {
    totalPrice = Math.max(...effOfferOptions.map((opt: any) => {
      const optSub = (opt.positions || []).reduce((s: number, p: any) => s + ((p.unitPrice || 0) * (p.quantity || 1)), 0);
      const optDisc = (opt.discountType || eff_discountType) === 'percent' ? optSub * ((opt.discount || eff_discount) / 100) : (opt.discount || eff_discount || 0);
      return Math.max(0, optSub - optDisc);
    }));
  } else {
    const subtotal = posArr.reduce((s: number, p: any) => s + ((p.unitPrice || 0) * (p.quantity || 1)), 0);
    const discountAmt = eff_discountType === 'percent' ? subtotal * (eff_discount / 100) : (eff_discount || 0);
    totalPrice = Math.max(0, subtotal - discountAmt);
  }
  db.run(
    `UPDATE sponsor_offers SET
      title = COALESCE(?, title),
      offer_number = COALESCE(?, offer_number),
      valid_until = ?,
      status = COALESCE(?, status),
      intro_text = ?,
      outro_text = ?,
      positions = ?,
      total_price = ?,
      discount = ?,
      discount_type = ?,
      notes = ?,
      offer_options = ?,
      updated_at = datetime('now')
     WHERE id = ?`,
    [title || null, offerNumber || null,
     validUntil !== undefined ? (validUntil || null) : existing.valid_until,
     status || null,
     introText !== undefined ? (introText || null) : existing.intro_text,
     outroText !== undefined ? (outroText || null) : existing.outro_text,
     JSON.stringify(posArr), totalPrice, eff_discount, eff_discountType,
     notes !== undefined ? (notes || null) : existing.notes,
     effOfferOptions ? JSON.stringify(effOfferOptions) : null,
     req.params.offerId]
  );
  const updated = db.get('SELECT * FROM sponsor_offers WHERE id = ?', [req.params.offerId]) as any;
  return res.json({
    success: true,
    data: {
      id: updated.id, sponsorId: updated.sponsor_id, title: updated.title,
      offerNumber: updated.offer_number, validUntil: updated.valid_until,
      status: updated.status, introText: updated.intro_text, outroText: updated.outro_text,
      positions: updated.positions ? JSON.parse(updated.positions) : [],
      offerOptions: updated.offer_options ? JSON.parse(updated.offer_options) : null,
      totalPrice: updated.total_price, discount: updated.discount,
      discountType: updated.discount_type, notes: updated.notes,
      createdAt: updated.created_at, updatedAt: updated.updated_at,
    }
  });
});

// DELETE /offers/:offerId — Angebot löschen
router.delete('/offers/:offerId', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.run('DELETE FROM sponsor_offers WHERE id = ?', [req.params.offerId]);
  return res.json({ success: true });
});

// POST /offers/:offerId/accept — Angebot annehmen → Buchungen + optional Sponsor updaten
router.post('/offers/:offerId/accept', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const offer = db.get('SELECT * FROM sponsor_offers WHERE id = ?', [req.params.offerId]) as any;
  if (!offer) return res.status(404).json({ success: false, error: 'Angebot nicht gefunden' });
  const {
    createBookings = true,
    updateContactInfo = false,
    updateNotes = false,
    contractId = null,
    selectedOptionIndex = null, // Index der gewählten Variante (bei offerOptions)
  } = req.body;
  // Positionen bestimmen: aus offerOptions (wenn vorhanden und Variante gewählt) oder aus positions
  const offerOptions = offer.offer_options ? JSON.parse(offer.offer_options) : null;
  let positions: any[];
  let effectiveDiscount = offer.discount || 0;
  let effectiveDiscountType = offer.discount_type || 'absolute';
  if (offerOptions && Array.isArray(offerOptions) && offerOptions.length > 0) {
    const optIdx = selectedOptionIndex !== null ? selectedOptionIndex : 0;
    const selectedOpt = offerOptions[Math.min(optIdx, offerOptions.length - 1)];
    positions = selectedOpt?.positions || [];
    effectiveDiscount = parseFloat(selectedOpt?.discount || 0);
    effectiveDiscountType = selectedOpt?.discountType || 'absolute';
  } else {
    positions = offer.positions ? JSON.parse(offer.positions) : [];
  }
  const createdBookingIds: string[] = [];
  // Buchungen aus Positionen anlegen
  if (createBookings && positions.length > 0) {
    for (const pos of positions) {
      const bookingId = uuidv4();
      const unitPrice = Number(pos.unitPrice) || 0;
      const qty = Number(pos.quantity) || 1;
      const posDiscount = effectiveDiscountType === 'percent'
        ? unitPrice * qty * (effectiveDiscount / 100)
        : (effectiveDiscount / Math.max(positions.length, 1));
      const finalPrice = Math.max(0, unitPrice * qty - posDiscount);
      db.run(
        `INSERT INTO ad_bookings (id, slot_id, sponsor_id, booking_date, booking_end_date, price, price_adjustment, listener_fee, final_price, status, invoice_status, notes, contract_id, placement_count, episode_refs, discount, discount_type, listener_count)
         VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, 'geplant', 'offen', ?, ?, ?, ?, ?, ?, NULL)`,
        [
          bookingId,
          pos.slotId || pos.categoryId || 'angebot',
          offer.sponsor_id,
          offer.valid_until || new Date().toISOString().slice(0, 10),
          null,
          unitPrice * qty,
          finalPrice,
          `[Angebot ${offer.offer_number}] ${pos.description || pos.title || ''}${offer.intro_text ? ' – ' + offer.intro_text : ''}`.trim(),
          contractId || offer.contract_id || null,
          qty,
          pos.episodeRefs ? JSON.stringify(pos.episodeRefs) : null,
          effectiveDiscount,
          effectiveDiscountType,
        ]
      );
      createdBookingIds.push(bookingId);
    }
  }
  // Optional: Kontaktdaten aus Angebot in Sponsor übernehmen
  if (updateContactInfo && offer.contact_name) {
    db.run(`UPDATE sponsors SET contact_name = ?, updated_at = datetime('now') WHERE id = ?`,
      [offer.contact_name, offer.sponsor_id]);
  }
  // Optional: Notizen in Sponsor übernehmen
  if (updateNotes && offer.notes) {
    const sponsor = db.get('SELECT notes FROM sponsors WHERE id = ?', [offer.sponsor_id]) as any;
    const combinedNotes = [sponsor?.notes, `[Angebot ${offer.offer_number}] ${offer.notes}`].filter(Boolean).join('\n\n');
    db.run(`UPDATE sponsors SET notes = ?, updated_at = datetime('now') WHERE id = ?`,
      [combinedNotes, offer.sponsor_id]);
  }
  // Angebot-Status auf 'angenommen' setzen
  db.run(`UPDATE sponsor_offers SET status = 'angenommen', updated_at = datetime('now') WHERE id = ?`,
    [req.params.offerId]);
  return res.json({
    success: true,
    data: { createdBookings: createdBookingIds.length, bookingIds: createdBookingIds }
  });
});

// POST /offers/:offerId/archive — Angebot archivieren
router.post('/offers/:offerId/archive', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const offer = db.get('SELECT * FROM sponsor_offers WHERE id = ?', [req.params.offerId]) as any;
  if (!offer) return res.status(404).json({ success: false, error: 'Angebot nicht gefunden' });
  db.run(`UPDATE sponsor_offers SET status = 'archiviert', updated_at = datetime('now') WHERE id = ?`, [req.params.offerId]);
  return res.json({ success: true });
});

// GET /offers/:offerId/pdf — Angebots-PDF exportieren
router.get('/offers/:offerId/pdf', requirePermission('canViewSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const offer = db.get('SELECT * FROM sponsor_offers WHERE id = ?', [req.params.offerId]) as any;
  if (!offer) return res.status(404).json({ success: false, error: 'Angebot nicht gefunden' });
  const sponsor = db.get('SELECT * FROM sponsors WHERE id = ?', [offer.sponsor_id]) as any;
  if (!sponsor) return res.status(404).json({ success: false, error: 'Sponsor nicht gefunden' });
  // Positionen sicher parsen und Werte normalisieren
  let positions: any[] = [];
  try {
    const raw = offer.positions ? JSON.parse(offer.positions) : [];
    positions = raw.map((p: any) => ({
      ...p,
      quantity: Number(p.quantity) || 1,
      unitPrice: Number(p.unitPrice) || 0,
    }));
  } catch (_) { positions = []; }
  try {
    const { getDefaultLayoutForType } = require('../pdfLayouts');
    // Suche nach einem speziellen Preislisten-Layout oder nutze das Standard-Angebot-Layout
    let layout = db.get("SELECT * FROM pdf_layouts WHERE export_type = 'sponsor_offer' AND is_default = 1") as any;
    if (layout) {
      try {
        layout.colors = JSON.parse(layout.colors);
        layout.header = JSON.parse(layout.header);
        layout.footer = JSON.parse(layout.footer);
      } catch(e) {}
    } else {
      layout = getDefaultLayoutForType('sponsor_offer');
    }
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50, size: 'A4', autoFirstPage: true });
    // Error-Handler VOR dem Pipen registrieren
    doc.on('error', (err: any) => {
      console.error('[Angebots-PDF Stream-Fehler]', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'PDF-Stream-Fehler: ' + err.message });
      }
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Angebot-${offer.offer_number || offer.id}.pdf"`);
    doc.pipe(res);
    const primaryColor = layout?.colors?.primary || '#7c3aed';
    const m = 50;
    const contentW = doc.page.width - m * 2;
    const now = new Date().toLocaleDateString('de-DE');
    // Settings: Podcastname, Firmenname, Logo
    const settings = db.get('SELECT value FROM settings WHERE key = ?', ['app']) as any;
    let podcastName = 'PodCore';
    let companyName = '';
    try {
      const s = JSON.parse(settings?.value || '{}');
      podcastName = s?.branding?.podcastName || s?.general?.podcastName || 'PodCore';
      companyName = s?.branding?.companyName || s?.general?.companyName || '';
    } catch (_) {}
    // Logo laden
    const fs = require('fs');
    const path = require('path');
    const { DATA_DIR } = require('../database');
    let logoPath: string | null = null;
    try {
      const brandingDir = path.join(DATA_DIR, 'branding');
      if (fs.existsSync(brandingDir)) {
        const lf = fs.readdirSync(brandingDir).find((f: string) => f.match(/^logo\.(png|jpg|jpeg|svg)$/i));
        if (lf) logoPath = path.join(brandingDir, lf);
      }
    } catch (_) {}
    // Header
    doc.rect(0, 0, doc.page.width, 90).fill(primaryColor);
    // Logo links
    if (logoPath && fs.existsSync(logoPath)) {
      try { doc.image(logoPath, m, 15, { height: 40 }); } catch (_) {}
    }
    // Titel rechts
    doc.fontSize(22).font('Helvetica-Bold').fillColor('#fff')
      .text('ANGEBOT', m, 18, { align: 'right', width: contentW });
    // Podcastname + Firmenname
    const headerLine2 = companyName ? `${podcastName} · ${companyName}` : podcastName;
    doc.fontSize(9).font('Helvetica').fillColor('rgba(255,255,255,0.85)')
      .text(`${headerLine2} · ${now}`, m, 52, { align: 'right', width: contentW });
    doc.fontSize(9).font('Helvetica').fillColor('rgba(255,255,255,0.85)')
      .text(`Angebotsnummer: ${offer.offer_number || '–'}`, m, 65, { align: 'right', width: contentW });
    // Sponsor-Info
    // Sponsor-Info
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a2e')
      .text(`Angebot für: ${sponsor.name}`, m, 108);
    if (sponsor.company) {
      doc.fontSize(10).font('Helvetica').fillColor('#555')
        .text(sponsor.company, m, 126);
    }
    let infoY = sponsor.company ? 140 : 126;
    if (sponsor.contact_name) {
      doc.fontSize(10).font('Helvetica').fillColor('#555')
        .text(`Ansprechpartner: ${sponsor.contact_name}`, m, infoY);
      infoY += 14;
    }
    if (offer.valid_until) {
      doc.fontSize(10).font('Helvetica').fillColor('#555')
        .text(`Gültig bis: ${new Date(offer.valid_until).toLocaleDateString('de-DE')}`, m, infoY);
      infoY += 14;
    }
    let y = infoY + 16;
    // Intro-Text
    if (offer.intro_text) {
      doc.fontSize(11).font('Helvetica').fillColor('#333')
        .text(offer.intro_text, m, y, { width: contentW });
      y += doc.heightOfString(offer.intro_text, { width: contentW }) + 20;
    }
    // Angebots-Titel
    doc.fontSize(16).font('Helvetica-Bold').fillColor(primaryColor)
      .text(offer.title, m, y);
    y += 30;
    // Positionen-Tabelle
    if (positions.length > 0) {
      // Tabellen-Header
      doc.rect(m, y, contentW, 22).fill(primaryColor);
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#fff');
      doc.text('Pos.', m + 5, y + 7, { width: 25 });
      doc.text('Beschreibung', m + 35, y + 7, { width: contentW - 215 });
      doc.text('Menge', m + contentW - 175, y + 7, { width: 40, align: 'right' });
      doc.text('Einzelpreis', m + contentW - 130, y + 7, { width: 65, align: 'right' });
      doc.text('Gesamt', m + contentW - 60, y + 7, { width: 60, align: 'right' });
      y += 22;
      let subtotal = 0;
      positions.forEach((pos: any, idx: number) => {
        // Sicherheitskonvertierung: Werte können als Strings aus der DB kommen
        const qty = Number(pos.quantity) || 1;
        const unitPrice = Number(pos.unitPrice) || 0;
        const lineTotal = qty * unitPrice;
        subtotal += lineTotal;
        const rowH = 20;
        // Seitenüberlauf prüfen: neue Seite wenn nötig
        if (y + rowH > doc.page.height - 80) {
          doc.addPage();
          y = 50;
        }
        if (idx % 2 === 0) doc.rect(m, y, contentW, rowH).fill('#f8f8ff');
        else doc.rect(m, y, contentW, rowH).fill('#fff');
        doc.fontSize(9).font('Helvetica').fillColor('#333');
        doc.text(`${idx + 1}.`, m + 5, y + 6, { width: 25 });
        doc.text(pos.description || pos.title || '–', m + 35, y + 6, { width: contentW - 215 });
        doc.text(String(qty), m + contentW - 175, y + 6, { width: 40, align: 'right' });
        doc.text(`${unitPrice.toFixed(2)} €`, m + contentW - 130, y + 6, { width: 65, align: 'right' });
        doc.text(`${lineTotal.toFixed(2)} €`, m + contentW - 60, y + 6, { width: 60, align: 'right' });
        y += rowH;
      });
      // Trennlinie
      doc.rect(m, y, contentW, 1).fill('#ddd');
      y += 10;
      // Zwischensumme
      doc.fontSize(10).font('Helvetica').fillColor('#333')
        .text('Zwischensumme:', m + contentW - 200, y, { width: 135, align: 'right' })
        .text(`${subtotal.toFixed(2)} €`, m + contentW - 62, y, { width: 60, align: 'right' });
      y += 16;
      // Rabatt
      const effDiscount = Number(offer.discount) || 0;
      if (effDiscount > 0) {
        const discAmt = offer.discount_type === 'percent'
          ? subtotal * (effDiscount / 100)
          : effDiscount;
        const discLabel = offer.discount_type === 'percent'
          ? `Rabatt (${effDiscount}%):`
          : 'Rabatt:';
        doc.fontSize(10).font('Helvetica').fillColor('#e53e3e')
          .text(discLabel, m + contentW - 200, y, { width: 135, align: 'right' })
          .text(`-${discAmt.toFixed(2)} €`, m + contentW - 62, y, { width: 60, align: 'right' });
        y += 16;
      }
      // Gesamtpreis
      const totalPrice = Number(offer.total_price) || subtotal;
      doc.rect(m + contentW - 240, y - 2, 240, 24).fill(primaryColor);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#fff')
        .text('Gesamtpreis (netto):', m + contentW - 235, y + 5, { width: 170, align: 'right' })
        .text(`${totalPrice.toFixed(2)} €`, m + contentW - 62, y + 5, { width: 60, align: 'right' });
      y += 30;
    }
    // Outro-Text
    if (offer.outro_text) {
      y += 10;
      doc.fontSize(11).font('Helvetica').fillColor('#333')
        .text(offer.outro_text, m, y, { width: contentW });
      y += doc.heightOfString(offer.outro_text, { width: contentW }) + 10;
    }
    // Notizen
    if (offer.notes) {
      y += 10;
      doc.fontSize(9).font('Helvetica').fillColor('#888')
        .text(`Hinweis: ${offer.notes}`, m, y, { width: contentW });
    }
    // Footer
    const footerY = doc.page.height - 35;
    doc.rect(m, footerY - 8, contentW, 0.5).fill('#ddd');
    doc.fontSize(8).font('Helvetica').fillColor('#aaa')
      .text(`${podcastName} · Angebot ${offer.offer_number || ''} · ${sponsor.name} · Erstellt am ${now}`,
        m, footerY, { align: 'center', width: contentW });
    doc.end();
  } catch (err: any) {
    console.error('[Angebots-PDF]', err);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: 'PDF-Fehler: ' + err.message });
    }
  }
});

// GET /price-list-pdf — Preisliste als PDF exportieren
router.get('/price-list-pdf', requirePermission('canViewSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { title: rawTitle = 'Preisliste', description: rawDesc = '' } = req.query as Record<string, string>;
  const categories = db.all(`SELECT * FROM ad_categories WHERE is_active = 1 ORDER BY name ASC`) as any[];
  try {
    const { getDefaultLayoutForType } = require('../pdfLayouts');
    // Suche nach einem speziellen Preislisten-Layout oder nutze das Standard-Angebot-Layout
    let layout = db.get("SELECT * FROM pdf_layouts WHERE export_type = 'sponsor_offer' AND is_default = 1") as any;
    if (layout) {
      try {
        layout.colors = JSON.parse(layout.colors);
        layout.header = JSON.parse(layout.header);
        layout.footer = JSON.parse(layout.footer);
      } catch(e) {}
    } else {
      layout = getDefaultLayoutForType('sponsor_offer');
    }
    const PDFDocument = require('pdfkit');
    const fs = require('fs');
    const path = require('path');
    const { DATA_DIR } = require('../database');
    const doc = new PDFDocument({ margin: 50, size: 'A4', autoFirstPage: true });
    doc.on('error', (err: any) => {
      console.error('[Preisliste-PDF]', err);
      if (!res.headersSent) res.status(500).json({ success: false, error: err.message });
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Preisliste.pdf"`);
    doc.pipe(res);
    const primaryColor = layout?.colors?.primary || '#7c3aed';
    const m = 50;
    const contentW = doc.page.width - m * 2;
    const now = new Date().toLocaleDateString('de-DE');
    // Settings
    const settings = db.get('SELECT value FROM settings WHERE key = ?', ['app']) as any;
    let podcastName = 'PodCore';
    let companyName = '';
    try {
      const s = JSON.parse(settings?.value || '{}');
      podcastName = s?.branding?.podcastName || s?.general?.podcastName || 'PodCore';
      companyName = s?.branding?.companyName || s?.general?.companyName || '';
    } catch (_) {}
    // Logo
    let logoPath: string | null = null;
    try {
      const brandingDir = path.join(DATA_DIR, 'branding');
      if (fs.existsSync(brandingDir)) {
        const lf = fs.readdirSync(brandingDir).find((f: string) => f.match(/^logo\.(png|jpg|jpeg|svg)$/i));
        if (lf) logoPath = path.join(brandingDir, lf);
      }
    } catch (_) {}
    // Header
    doc.rect(0, 0, doc.page.width, 90).fill(primaryColor);
    if (logoPath && fs.existsSync(logoPath)) {
      try { doc.image(logoPath, m, 15, { height: 40 }); } catch (_) {}
    }
    doc.fontSize(22).font('Helvetica-Bold').fillColor('#fff')
      .text(rawTitle || 'PREISLISTE', m, 18, { align: 'right', width: contentW });
    const headerLine2 = companyName ? `${podcastName} · ${companyName}` : podcastName;
    doc.fontSize(9).font('Helvetica').fillColor('rgba(255,255,255,0.85)')
      .text(`${headerLine2} · ${now}`, m, 55, { align: 'right', width: contentW });
    let y = 110;
    // Beschreibung
    if (rawDesc) {
      doc.fontSize(11).font('Helvetica').fillColor('#333')
        .text(rawDesc, m, y, { width: contentW });
      y += doc.heightOfString(rawDesc, { width: contentW }) + 20;
    }
    // Tabellen-Header
    doc.rect(m, y, contentW, 22).fill(primaryColor);
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#fff');
    const col1 = 250; // Werbeplatz
    const col2 = 80;  // Position
    const col3 = 60;  // Dauer
    const col4 = 80;  // Basispreis
    const col5 = 80;  // Pro Folge
    const col6 = 100; // Hörerbeteiligung (CPM)
    
    doc.text('Werbeplatz', m + 5, y + 7, { width: col1 });
    doc.text('Position', m + 5 + col1 + 10, y + 7, { width: col2 });
    doc.text('Dauer', m + 5 + col1 + col2 + 20, y + 7, { width: col3, align: 'right' });
    doc.text('Basispreis', m + 5 + col1 + col2 + col3 + 30, y + 7, { width: col4, align: 'right' });
    doc.text('Pro Folge', m + 5 + col1 + col2 + col3 + col4 + 40, y + 7, { width: col5, align: 'right' });
    doc.text('Hörerbeteiligung', m + 5 + col1 + col2 + col3 + col4 + col5 + 50, y + 7, { width: col6, align: 'right' });
    y += 22;
    categories.forEach((cat: any, idx: number) => {
      if (y + 24 > doc.page.height - 80) { doc.addPage(); y = 50; }
      if (idx % 2 === 0) doc.rect(m, y, contentW, 24).fill('#f8f8ff');
      else doc.rect(m, y, contentW, 24).fill('#fff');
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#222')
        .text(cat.name || '–', m + 5, y + 4, { width: col1 });
      if (cat.description) {
        doc.fontSize(7).font('Helvetica').fillColor('#888')
          .text(cat.description, m + 5, y + 14, { width: col1 });
      }
      doc.fontSize(9).font('Helvetica').fillColor('#444')
        .text(cat.default_position || '–', m + 5 + col1 + 10, y + 8, { width: col2 });
      doc.text(cat.default_duration ? `${cat.default_duration}s` : '–', m + 5 + col1 + col2 + 20, y + 8, { width: col3, align: 'right' });
      doc.text(cat.base_price ? `${Number(cat.base_price).toFixed(2)} €` : '–', m + 5 + col1 + col2 + col3 + 30, y + 8, { width: col4, align: 'right' });
      doc.text(cat.price_per_episode ? `${Number(cat.price_per_episode).toFixed(2)} €` : '–', m + 5 + col1 + col2 + col3 + col4 + 40, y + 8, { width: col5, align: 'right' });
      doc.text(cat.price_per_1000 ? `${Number(cat.price_per_1000).toFixed(2)} € / 1k` : '–', m + 5 + col1 + col2 + col3 + col4 + col5 + 50, y + 8, { width: col6, align: 'right' });
      y += 24;
    });
    // Footer
    doc.fontSize(8).font('Helvetica').fillColor('#aaa')
      .text(`${podcastName} · Preisliste · Erstellt am ${now}`, m, doc.page.height - 35, { align: 'center', width: contentW });
    doc.end();
  } catch (err: any) {
    console.error('[Preisliste-PDF]', err);
    if (!res.headersSent) res.status(500).json({ success: false, error: 'PDF-Fehler: ' + err.message });
  }
});

export default router;
