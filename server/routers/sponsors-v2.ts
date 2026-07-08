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
           s.name as slot_name, s.category as slot_position,
           sp.name as sponsor_name,
           e.title as episode_title, e.number as episode_number
    FROM ad_bookings ab
    JOIN ad_slots s ON ab.slot_id = s.id
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

  const finalPrice = price + (priceAdjustment || 0) + (listenerFee || 0);
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
      price,
      priceAdjustment || 0,
      listenerFee || 0,
      finalPrice,
      notes || null,
    ]
  );

  const booking = db.get(
    `SELECT ab.*, s.name as slot_name, sp.name as sponsor_name
     FROM ad_bookings ab
     JOIN ad_slots s ON ab.slot_id = s.id
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
      slotName: booking.slot_name,
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
    `SELECT ab.*, s.name as slot_name, sp.name as sponsor_name
     FROM ad_bookings ab
     JOIN ad_slots s ON ab.slot_id = s.id
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
// BOOKING CALENDAR (v2.12.0)
// ============================================================

router.get('/calendar/bookings', requirePermission('canViewSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { from, to } = req.query;

  let query = `
    SELECT ab.*, 
           s.name as slot_name, s.category as slot_position,
           sp.name as sponsor_name, sp.company as sponsor_company, sp.color as sponsor_color,
           e.title as episode_title, e.number as episode_number
    FROM ad_bookings ab
    JOIN ad_slots s ON ab.slot_id = s.id
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

  return res.json({
    success: true,
    data: {
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
        createdAt: b.created_at,
        updatedAt: b.updated_at,
      })),
    },
  });
});

export default router;
