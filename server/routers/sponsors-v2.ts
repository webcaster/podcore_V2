import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';

const router = Router();
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
      notes: c.notes,
      status: c.status,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    })),
  });
});

router.post('/:sponsorId/contracts', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { contractStart, contractEnd, contactPerson, contactEmail, contactPhone, notes } = req.body;

  if (!contractStart || !contractEnd) {
    return res.status(400).json({ success: false, error: 'contractStart und contractEnd erforderlich' });
  }

  const id = uuidv4();
  db.run(
    `INSERT INTO sponsor_contracts (id, sponsor_id, contract_start, contract_end, contact_person, contact_email, contact_phone, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'aktiv')`,
    [id, req.params.sponsorId, contractStart, contractEnd, contactPerson || null, contactEmail || null, contactPhone || null, notes || null]
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
      notes: contract.notes,
      status: contract.status,
      createdAt: contract.created_at,
      updatedAt: contract.updated_at,
    },
  });
});

router.put('/contracts/:contractId', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { contractStart, contractEnd, contactPerson, contactEmail, contactPhone, notes, status } = req.body;

  db.run(
    `UPDATE sponsor_contracts SET
      contract_start = COALESCE(?, contract_start),
      contract_end = COALESCE(?, contract_end),
      contact_person = ?,
      contact_email = ?,
      contact_phone = ?,
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

  const finalPrice = resolvedPrice + (priceAdjustment || 0) + (listenerFee || 0);
  const id = uuidv4();

  db.run(
    `INSERT INTO ad_bookings (id, slot_id, sponsor_id, episode_id, booking_date, booking_end_date, price, price_adjustment, listener_fee, final_price, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'geplant', ?)`,
    [
      id,
      slotId,
      req.params.sponsorId,
      episodeId || null,
      bookingDate,
      bookingEndDate || null,
      resolvedPrice,
      priceAdjustment || 0,
      listenerFee || 0,
      finalPrice,
      notes || null,
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
  } = req.body;

  // Berechne finalPrice neu wenn Preiskomponenten geändert werden
  let finalPrice: number | null = null;
  if (price !== undefined || priceAdjustment !== undefined || listenerFee !== undefined) {
    const existing = db.get('SELECT price, price_adjustment, listener_fee FROM ad_bookings WHERE id = ?', [
      req.params.bookingId,
    ]) as any;
    finalPrice =
      (price ?? existing.price) +
      (priceAdjustment ?? existing.price_adjustment) +
      (listenerFee ?? existing.listener_fee);
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

  const priceRows = [
    ['Basispreis', `${(booking.price || 0).toFixed(2)} €`],
    ['Preisanpassung', `${(booking.price_adjustment || 0).toFixed(2)} €`],
    ['Hörerbeteiligung', `${(booking.listener_fee || 0).toFixed(2)} €`],
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

  if (from) {
    query += ' AND ab.booking_date >= ?';
    params.push(from);
  }
  if (to) {
    query += ' AND (ab.booking_end_date IS NULL AND ab.booking_date <= ? OR ab.booking_end_date >= ?)';
    params.push(to, from || to);
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

export default router;
