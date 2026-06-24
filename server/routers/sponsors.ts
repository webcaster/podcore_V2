import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth as any);

function parseSponsor(row: any) {
  if (!row) return null;
  return {
    ...row,
    tags: JSON.parse(row.tags || '[]'),
    adSlots: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    totalBudget: row.total_budget,
  };
}

function parseAdSlot(row: any) {
  if (!row) return null;
  return {
    ...row,
    bookedEpisodes: JSON.parse(row.booked_episodes || '[]'),
    placements: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sponsorId: row.sponsor_id,
    productionType: row.production_type,
    assetId: row.asset_id,
    deliveredAssetPath: row.delivered_asset_path,
    startDate: row.start_date,
    endDate: row.end_date,
    targetEpisodes: row.target_episodes,
  };
}

function parsePlacement(row: any) {
  if (!row) return null;
  return {
    ...row,
    confirmed: row.confirmed === 1,
    createdAt: row.created_at,
    adSlotId: row.ad_slot_id,
    episodeId: row.episode_id,
    episodeTitle: row.episode_title,
    episodeNumber: row.episode_number,
    publishDate: row.publish_date,
    invoiceNumber: row.invoice_number,
    invoiceDate: row.invoice_date,
    invoiceStatus: row.invoice_status || 'offen',
    invoiceNotes: row.invoice_notes,
    currency: row.currency || 'EUR',
  };
}

// ============================================================
// SPONSORS
// ============================================================

router.get('/', requirePermission('canViewSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { status, search } = req.query;
  let query = 'SELECT * FROM sponsors WHERE 1=1';
  const params: any[] = [];

  if (status) { query += ' AND status = ?'; params.push(status); }
  if (search) { query += ' AND (name LIKE ? OR company LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  query += ' ORDER BY name ASC';

  const sponsors = db.all(query, params).map((s: any) => {
    const sponsor = parseSponsor(s);
    const adSlots = db.all('SELECT * FROM ad_slots WHERE sponsor_id = ? ORDER BY created_at DESC', [s.id]).map((slot: any) => {
      const parsed = parseAdSlot(slot);
      parsed.placements = db.all('SELECT * FROM ad_placements WHERE ad_slot_id = ? ORDER BY created_at DESC', [slot.id]).map(parsePlacement);
      return parsed;
    });
    sponsor.adSlots = adSlots;
    return sponsor;
  });

  return res.json({ success: true, data: sponsors });
});

router.get('/reports/overview', requirePermission('canViewSponsorReports') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();

  const sponsors = db.all('SELECT * FROM sponsors ORDER BY name ASC', []) as any[];
  const overview = sponsors.map((s: any) => {
    const slots = db.all('SELECT * FROM ad_slots WHERE sponsor_id = ?', [s.id]) as any[];
    const allPlacements = slots.flatMap((slot: any) =>
      db.all('SELECT * FROM ad_placements WHERE ad_slot_id = ?', [slot.id]).map(parsePlacement)
    );

    const activeSlots = slots.filter((sl: any) => sl.status === 'aktiv').length;
    const confirmedPlacements = allPlacements.filter((p: any) => p.confirmed).length;
    const totalListens = allPlacements.reduce((sum: number, p: any) => sum + (p.listens || 0), 0);
    const totalRevenue = slots.reduce((sum: number, sl: any) => sum + (sl.price || 0), 0);

    return {
      id: s.id,
      name: s.name,
      company: s.company,
      status: s.status,
      totalSlots: slots.length,
      activeSlots,
      totalPlacements: allPlacements.length,
      confirmedPlacements,
      totalListens,
      totalRevenue,
      currency: s.currency,
    };
  });

  return res.json({ success: true, data: overview });
});

router.get('/:id/report', requirePermission('canViewSponsorReports') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { from, to } = req.query;

  const sponsorRow = db.get('SELECT * FROM sponsors WHERE id = ?', [req.params.id]) as any;
  if (!sponsorRow) return res.status(404).json({ success: false, error: 'Sponsor nicht gefunden' });

  const adSlots = db.all('SELECT * FROM ad_slots WHERE sponsor_id = ?', [req.params.id]) as any[];

  const adSlotReports = adSlots.map((slot: any) => {
    let placementQuery = 'SELECT * FROM ad_placements WHERE ad_slot_id = ?';
    const params: any[] = [slot.id];

    if (from) { placementQuery += ' AND (publish_date >= ? OR publish_date IS NULL)'; params.push(from); }
    if (to) { placementQuery += ' AND (publish_date <= ? OR publish_date IS NULL)'; params.push(to); }

    const placements = db.all(placementQuery, params).map(parsePlacement);
    const totalListens = placements.reduce((sum: number, p: any) => sum + (p.listens || 0), 0);

    return {
      adSlotId: slot.id,
      adSlotName: slot.name,
      category: slot.category,
      status: slot.status,
      productionType: slot.production_type,
      totalPlacements: placements.length,
      confirmedPlacements: placements.filter((p: any) => p.confirmed).length,
      placements,
      totalListens,
      price: slot.price,
      currency: slot.currency,
    };
  });

  const totalPlacements = adSlotReports.reduce((sum, r) => sum + r.totalPlacements, 0);
  const confirmedPlacements = adSlotReports.reduce((sum, r) => sum + r.confirmedPlacements, 0);
  const totalListens = adSlotReports.reduce((sum, r) => sum + (r.totalListens || 0), 0);
  const uniqueEpisodes = new Set(adSlotReports.flatMap(r => r.placements.map((p: any) => p.episodeId)));

  return res.json({
    success: true,
    data: {
      sponsorId: sponsorRow.id,
      sponsorName: sponsorRow.name,
      company: sponsorRow.company,
      period: { from: from || null, to: to || null },
      totalPlacements,
      confirmedPlacements,
      totalEpisodes: uniqueEpisodes.size,
      totalListens,
      adSlots: adSlotReports,
      generatedAt: new Date().toISOString(),
    },
  });
});

// ===== AD CATEGORIES (Werbekategorien mit Preislisten & Präsentationstext) =====
// WICHTIG: Diese Routen müssen VOR /:id stehen, sonst matcht Express /categories als id!

// GET /api/sponsors/categories — list all ad categories
router.get('/categories', requirePermission('canViewSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const categories = db.all('SELECT * FROM ad_categories ORDER BY sort_order ASC, name ASC') as any[];
  return res.json({ success: true, data: categories });
});

// POST /api/sponsors/categories — create a new ad category
router.post('/categories', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { name, description, color = '#7c3aed', defaultPosition = 'mid-roll', defaultDuration = 30,
    presentationText, presentationTemplate = 'präsentiert von',
    basePrice, pricePerEpisode, pricePer1000Listens, currency = 'EUR', sortOrder = 0 } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name erforderlich' });
  const id = uuidv4();
  db.run(`INSERT INTO ad_categories (id, name, description, color, default_position, default_duration, presentation_text, presentation_template, base_price, price_per_episode, price_per_1000_listens, currency, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, description || null, color, defaultPosition, defaultDuration, presentationText || null, presentationTemplate, basePrice || null, pricePerEpisode || null, pricePer1000Listens || null, currency, sortOrder]);
  const created = db.get('SELECT * FROM ad_categories WHERE id = ?', [id]) as any;
  return res.json({ success: true, data: created });
});

// PUT /api/sponsors/categories/:id — update an ad category
router.put('/categories/:id', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { name, description, color, defaultPosition, defaultDuration,
    presentationText, presentationTemplate, basePrice, pricePerEpisode, pricePer1000Listens, currency, isActive, sortOrder } = req.body;
  db.run(`UPDATE ad_categories SET
    name = COALESCE(?, name), description = ?,
    color = COALESCE(?, color),
    default_position = COALESCE(?, default_position), default_duration = COALESCE(?, default_duration),
    presentation_text = ?, presentation_template = COALESCE(?, presentation_template),
    base_price = ?, price_per_episode = ?, price_per_1000_listens = ?,
    currency = COALESCE(?, currency), is_active = COALESCE(?, is_active), sort_order = COALESCE(?, sort_order),
    updated_at = datetime('now') WHERE id = ?`,
    [name ?? null, description ?? null, color ?? null, defaultPosition ?? null, defaultDuration ?? null,
     presentationText ?? null, presentationTemplate ?? null, basePrice ?? null, pricePerEpisode ?? null,
     pricePer1000Listens ?? null, currency ?? null, isActive ?? null, sortOrder ?? null, req.params.id]);
  const updated = db.get('SELECT * FROM ad_categories WHERE id = ?', [req.params.id]) as any;
  return res.json({ success: true, data: updated });
});

// DELETE /api/sponsors/categories/:id — delete an ad category
router.delete('/categories/:id', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.run('DELETE FROM ad_categories WHERE id = ?', [req.params.id]);
  return res.json({ success: true });
});

// ===== EPISODE AD BOOKINGS (Gebuchte Werbungen pro Episode) =====

// GET /api/sponsors/episode-bookings/:episodeId — get all ad bookings for an episode
router.get('/episode-bookings/:episodeId', requirePermission('canViewSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const bookings = db.all(`
    SELECT b.*, sp.name as sponsor_name, sp.logo as sponsor_logo, sp.company as sponsor_company,
           s.name as slot_name, s.category as slot_category, s.script as slot_script,
           c.name as category_name, c.color as category_color, c.presentation_template as category_presentation_template
    FROM episode_ad_bookings b
    LEFT JOIN sponsors sp ON b.sponsor_id = sp.id
    LEFT JOIN ad_slots s ON b.ad_slot_id = s.id
    LEFT JOIN ad_categories c ON b.ad_category_id = c.id
    WHERE b.episode_id = ?
    ORDER BY b.sort_order ASC, b.position ASC, b.created_at ASC
  `, [req.params.episodeId]) as any[];
  return res.json({ success: true, data: bookings });
});

// POST /api/sponsors/episode-bookings — create a new episode ad booking
router.post('/episode-bookings', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { episodeId, adSlotId, adCategoryId, sponsorId, position = 'mid-roll',
    scriptText, presentationText, duration, confirmed = 0, sortOrder = 0 } = req.body;
  if (!episodeId || !adSlotId || !sponsorId) return res.status(400).json({ success: false, error: 'episodeId, adSlotId und sponsorId erforderlich' });
  const id = uuidv4();
  db.run(`INSERT INTO episode_ad_bookings (id, episode_id, ad_slot_id, ad_category_id, sponsor_id, position, script_text, presentation_text, duration, confirmed, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, episodeId, adSlotId, adCategoryId || null, sponsorId, position, scriptText || null, presentationText || null, duration || null, confirmed ? 1 : 0, sortOrder]);
  const created = db.get(`SELECT b.*, sp.name as sponsor_name, sp.logo as sponsor_logo, sp.company as sponsor_company, s.name as slot_name, c.name as category_name, c.color as category_color FROM episode_ad_bookings b LEFT JOIN sponsors sp ON b.sponsor_id = sp.id LEFT JOIN ad_slots s ON b.ad_slot_id = s.id LEFT JOIN ad_categories c ON b.ad_category_id = c.id WHERE b.id = ?`, [id]) as any;
  return res.json({ success: true, data: created });
});

// PUT /api/sponsors/episode-bookings/:id — update an episode ad booking
router.put('/episode-bookings/:id', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { position, scriptText, presentationText, duration, confirmed, sortOrder } = req.body;
  db.run(`UPDATE episode_ad_bookings SET position = COALESCE(?, position), script_text = ?, presentation_text = ?, duration = ?, confirmed = COALESCE(?, confirmed), sort_order = COALESCE(?, sort_order), updated_at = datetime('now') WHERE id = ?`,
    [position ?? null, scriptText ?? null, presentationText ?? null, duration ?? null, confirmed ?? null, sortOrder ?? null, req.params.id]);
  return res.json({ success: true });
});

// DELETE /api/sponsors/episode-bookings/:id — delete an episode ad booking
router.delete('/episode-bookings/:id', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.run('DELETE FROM episode_ad_bookings WHERE id = ?', [req.params.id]);
  return res.json({ success: true });
});

// GET /api/sponsors/available-for-episode/:episodeId — get all confirmed ad slots available for booking
router.get('/available-for-episode/:episodeId', requirePermission('canViewSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const slots = db.all(`
    SELECT s.*, sp.name as sponsor_name, sp.logo as sponsor_logo, sp.company as sponsor_company,
           c.name as category_name, c.color as category_color, c.presentation_template,
           c.presentation_text as category_presentation_text
    FROM ad_slots s
    JOIN sponsors sp ON s.sponsor_id = sp.id
    LEFT JOIN ad_categories c ON s.category_id = c.id
    WHERE s.status IN ('bestätigt', 'aktiv', 'angefragt')
    ORDER BY sp.name ASC, s.name ASC
  `) as any[];
  return res.json({ success: true, data: slots });
});

// ============================================================
// SPONSOR DETAIL (MUSS nach allen statischen Routen stehen!)
// ============================================================

router.get('/:id', requirePermission('canViewSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const row = db.get('SELECT * FROM sponsors WHERE id = ?', [req.params.id]) as any;
  if (!row) return res.status(404).json({ success: false, error: 'Sponsor nicht gefunden' });

  const sponsor = parseSponsor(row);
  sponsor.adSlots = db.all('SELECT * FROM ad_slots WHERE sponsor_id = ? ORDER BY created_at DESC', [row.id]).map((slot: any) => {
    const parsed = parseAdSlot(slot);
    parsed.placements = db.all('SELECT * FROM ad_placements WHERE ad_slot_id = ? ORDER BY created_at DESC', [slot.id]).map(parsePlacement);
    return parsed;
  });

  return res.json({ success: true, data: sponsor });
});

router.post('/', requirePermission('canCreateSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const id = uuidv4();
  const { name, company, contactName, contactEmail, contactPhone, website, logo, status = 'interessent', description, notes, tags = [], totalBudget, currency = 'EUR' } = req.body;

  if (!name || !company) return res.status(400).json({ success: false, error: 'Name und Firma erforderlich' });

  db.run('INSERT INTO sponsors (id, name, company, contact_name, contact_email, contact_phone, website, logo, status, description, notes, tags, total_budget, currency, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, name, company, contactName || null, contactEmail || null, contactPhone || null, website || null, logo || null, status, description || null, notes || null, JSON.stringify(tags), totalBudget || null, currency, req.user!.id]);

  const sponsor = parseSponsor(db.get('SELECT * FROM sponsors WHERE id = ?', [id]));
  sponsor.adSlots = [];
  return res.status(201).json({ success: true, data: sponsor });
});

router.put('/:id', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { name, company, contactName, contactEmail, contactPhone, website, logo, status, description, notes, tags, totalBudget, currency } = req.body;

  db.run(`UPDATE sponsors SET name = COALESCE(?, name), company = COALESCE(?, company), contact_name = ?, contact_email = ?, contact_phone = ?, website = ?, logo = ?, status = COALESCE(?, status), description = ?, notes = ?, tags = COALESCE(?, tags), total_budget = ?, currency = COALESCE(?, currency), updated_at = datetime('now') WHERE id = ?`,
    [name ?? null, company ?? null, contactName ?? null, contactEmail ?? null, contactPhone ?? null, website ?? null, logo ?? null, status ?? null, description ?? null, notes ?? null, tags ? JSON.stringify(tags) : null, totalBudget ?? null, currency ?? null, req.params.id]);

  const row = db.get('SELECT * FROM sponsors WHERE id = ?', [req.params.id]) as any;
  if (!row) return res.status(404).json({ success: false, error: 'Sponsor nicht gefunden' });

  const sponsor = parseSponsor(row);
  sponsor.adSlots = db.all('SELECT * FROM ad_slots WHERE sponsor_id = ?', [row.id]).map(parseAdSlot);
  return res.json({ success: true, data: sponsor });
});

router.delete('/:id', requirePermission('canDeleteSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.run('DELETE FROM sponsors WHERE id = ?', [req.params.id]);
  return res.json({ success: true, message: 'Sponsor gelöscht' });
});

// ============================================================
// AD SLOTS
// ============================================================

router.get('/:sponsorId/slots', requirePermission('canViewSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const slots = db.all('SELECT * FROM ad_slots WHERE sponsor_id = ? ORDER BY created_at DESC', [req.params.sponsorId]).map((slot: any) => {
    const parsed = parseAdSlot(slot);
    parsed.placements = db.all('SELECT * FROM ad_placements WHERE ad_slot_id = ? ORDER BY created_at DESC', [slot.id]).map(parsePlacement);
    return parsed;
  });
  return res.json({ success: true, data: slots });
});

router.post('/:sponsorId/slots', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const id = uuidv4();
  const { name, category = 'mid-roll', productionType = 'eigenproduktion', status = 'angefragt', duration, script, assetId, deliveredAssetPath, price, currency = 'EUR', startDate, endDate, targetEpisodes, notes } = req.body;

  if (!name) return res.status(400).json({ success: false, error: 'Name erforderlich' });

  db.run('INSERT INTO ad_slots (id, sponsor_id, name, category, production_type, status, duration, script, asset_id, delivered_asset_path, price, currency, start_date, end_date, target_episodes, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, req.params.sponsorId, name, category, productionType, status, duration || null, script || null, assetId || null, deliveredAssetPath || null, price || null, currency, startDate || null, endDate || null, targetEpisodes || null, notes || null]);

  const slot = parseAdSlot(db.get('SELECT * FROM ad_slots WHERE id = ?', [id]));
  slot.placements = [];
  return res.status(201).json({ success: true, data: slot });
});

router.put('/slots/:slotId', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { name, category, productionType, status, duration, script, assetId, deliveredAssetPath, price, currency, startDate, endDate, targetEpisodes, notes } = req.body;

  db.run(`UPDATE ad_slots SET name = COALESCE(?, name), category = COALESCE(?, category), production_type = COALESCE(?, production_type), status = COALESCE(?, status), duration = ?, script = ?, asset_id = ?, delivered_asset_path = ?, price = ?, currency = COALESCE(?, currency), start_date = ?, end_date = ?, target_episodes = ?, notes = ?, updated_at = datetime('now') WHERE id = ?`,
    [name ?? null, category ?? null, productionType ?? null, status ?? null, duration ?? null, script ?? null, assetId ?? null, deliveredAssetPath ?? null, price ?? null, currency ?? null, startDate ?? null, endDate ?? null, targetEpisodes ?? null, notes ?? null, req.params.slotId]);

  const slot = parseAdSlot(db.get('SELECT * FROM ad_slots WHERE id = ?', [req.params.slotId]));
  if (!slot) return res.status(404).json({ success: false, error: 'Werbeplatz nicht gefunden' });
  slot.placements = db.all('SELECT * FROM ad_placements WHERE ad_slot_id = ?', [req.params.slotId]).map(parsePlacement);
  return res.json({ success: true, data: slot });
});

router.delete('/slots/:slotId', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.run('DELETE FROM ad_slots WHERE id = ?', [req.params.slotId]);
  return res.json({ success: true, message: 'Werbeplatz gelöscht' });
});

// ============================================================
// AD PLACEMENTS
// ============================================================

router.get('/slots/:slotId/placements', requirePermission('canViewSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const placements = db.all('SELECT * FROM ad_placements WHERE ad_slot_id = ? ORDER BY created_at DESC', [req.params.slotId]).map(parsePlacement);
  return res.json({ success: true, data: placements });
});

router.post('/slots/:slotId/placements', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const id = uuidv4();
  const { episodeId, episodeTitle, episodeNumber, position = 'mid-roll', confirmed = false, publishDate, listens, notes } = req.body;

  if (!episodeId) return res.status(400).json({ success: false, error: 'Episode erforderlich' });

  db.run('INSERT INTO ad_placements (id, ad_slot_id, episode_id, episode_title, episode_number, position, confirmed, publish_date, listens, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, req.params.slotId, episodeId, episodeTitle || null, episodeNumber || null, position, confirmed ? 1 : 0, publishDate || null, listens || null, notes || null]);

  const slot = db.get('SELECT booked_episodes FROM ad_slots WHERE id = ?', [req.params.slotId]) as any;
  if (slot) {
    const booked = JSON.parse(slot.booked_episodes || '[]');
    if (!booked.includes(episodeId)) {
      booked.push(episodeId);
      db.run('UPDATE ad_slots SET booked_episodes = ? WHERE id = ?', [JSON.stringify(booked), req.params.slotId]);
    }
  }

  const placement = parsePlacement(db.get('SELECT * FROM ad_placements WHERE id = ?', [id]));
  return res.status(201).json({ success: true, data: placement });
});

router.put('/placements/:placementId', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { position, confirmed, publishDate, listens, notes, episodeTitle, episodeNumber,
    price, currency, invoiceNumber, invoiceDate, invoiceStatus, invoiceNotes } = req.body;

  db.run(
    `UPDATE ad_placements SET
      position = COALESCE(?, position),
      confirmed = COALESCE(?, confirmed),
      publish_date = ?,
      listens = ?,
      notes = ?,
      episode_title = COALESCE(?, episode_title),
      episode_number = COALESCE(?, episode_number),
      price = ?,
      currency = COALESCE(?, currency),
      invoice_number = ?,
      invoice_date = ?,
      invoice_status = COALESCE(?, invoice_status),
      invoice_notes = ?
    WHERE id = ?`,
    [
      position ?? null, confirmed !== undefined ? (confirmed ? 1 : 0) : null,
      publishDate ?? null, listens ?? null, notes ?? null,
      episodeTitle ?? null, episodeNumber ?? null,
      price !== undefined ? price : null,
      currency ?? null,
      invoiceNumber !== undefined ? invoiceNumber : null,
      invoiceDate !== undefined ? invoiceDate : null,
      invoiceStatus ?? null,
      invoiceNotes !== undefined ? invoiceNotes : null,
      req.params.placementId
    ]
  );

  const placement = parsePlacement(db.get('SELECT * FROM ad_placements WHERE id = ?', [req.params.placementId]));
  return res.json({ success: true, data: placement });
});

router.delete('/placements/:placementId', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.run('DELETE FROM ad_placements WHERE id = ?', [req.params.placementId]);
  return res.json({ success: true, message: 'Platzierung gelöscht' });
});

// ============================================================
// BILLING / ABRECHNUNG
// ============================================================

// GET /api/sponsors/:id/billing — billing summary for a sponsor
router.get('/:id/billing', requirePermission('canViewSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const sponsor = db.get('SELECT * FROM sponsors WHERE id = ?', [req.params.id]) as any;
  if (!sponsor) return res.status(404).json({ success: false, error: 'Sponsor nicht gefunden' });

  const slots = db.all('SELECT * FROM ad_slots WHERE sponsor_id = ?', [req.params.id]) as any[];
  const slotIds = slots.map((s: any) => s.id);

  let placements: any[] = [];
  if (slotIds.length > 0) {
    const placeholders = slotIds.map(() => '?').join(',');
    placements = db.all(`SELECT p.*, s.name as slot_name, s.category as slot_category FROM ad_placements p JOIN ad_slots s ON p.ad_slot_id = s.id WHERE p.ad_slot_id IN (${placeholders}) ORDER BY p.created_at DESC`, slotIds);
  }

  const totalRevenue = placements.reduce((sum: number, p: any) => sum + (p.price || 0), 0);
  const invoicedRevenue = placements.filter((p: any) => p.invoice_status === 'bezahlt').reduce((sum: number, p: any) => sum + (p.price || 0), 0);
  const openRevenue = placements.filter((p: any) => p.invoice_status === 'offen' || !p.invoice_status).reduce((sum: number, p: any) => sum + (p.price || 0), 0);

  const billingData = {
    sponsor: parseSponsor(sponsor),
    placements: placements.map(parsePlacement),
    summary: {
      totalPlacements: placements.length,
      confirmedPlacements: placements.filter((p: any) => p.confirmed === 1).length,
      totalRevenue,
      invoicedRevenue,
      openRevenue,
      currency: sponsor.currency || 'EUR',
    },
  };

  return res.json({ success: true, data: billingData });
});

// GET /api/sponsors/:id/invoice-pdf — generate invoice PDF for a sponsor
router.get('/:id/invoice-pdf', requirePermission('canViewSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const sponsor = db.get('SELECT * FROM sponsors WHERE id = ?', [req.params.id]) as any;
  if (!sponsor) return res.status(404).json({ success: false, error: 'Sponsor nicht gefunden' });

  const slots = db.all('SELECT * FROM ad_slots WHERE sponsor_id = ?', [req.params.id]) as any[];
  const slotIds = slots.map((s: any) => s.id);

  let placements: any[] = [];
  if (slotIds.length > 0) {
    const placeholders = slotIds.map(() => '?').join(',');
    placements = db.all(`SELECT p.*, s.name as slot_name, s.category as slot_category FROM ad_placements p JOIN ad_slots s ON p.ad_slot_id = s.id WHERE p.ad_slot_id IN (${placeholders}) ORDER BY p.created_at DESC`, slotIds);
  }

  // Load CI colors from settings
  const settingsRow = db.get("SELECT value FROM settings WHERE key = 'app'") as any;
  const settings = settingsRow ? JSON.parse(settingsRow.value) : {};
  const pdfSettings = settings?.pdf || {};
  const primaryColor = pdfSettings.primaryColor || '#7c3aed';
  const accentColor = pdfSettings.accentColor || '#2563eb';
  const headerBg = pdfSettings.headerBg || '#1a1a2e';

  // Load branding
  const brandingRow = db.get("SELECT value FROM settings WHERE key = 'branding'") as any;
  const branding = brandingRow ? JSON.parse(brandingRow.value) : {};
  const podcastName = branding?.podcastName || settings?.general?.podcastName || 'PodCore';

  const PDFDocument = require('pdfkit');
  const fs = require('fs');
  const path = require('path');

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Abrechnung_${sponsor.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);
  doc.pipe(res);

  // Helper: hex to rgb
  function hexToRgb(hex: string): [number, number, number] {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  }

  // Header
  const [hr, hg, hb] = hexToRgb(headerBg);
  doc.rect(0, 0, 595, 120).fill(`rgb(${hr},${hg},${hb})`);

  // Logo
  const DATA_DIR = process.env.PODCORE_DATA_DIR || require('path').join(require('os').homedir(), '.podcore');
  const logoPath = path.join(DATA_DIR, 'branding', 'logo.png');
  if (fs.existsSync(logoPath)) {
    try { doc.image(logoPath, 50, 20, { height: 50 }); } catch (_) {}
  }

  const [pr, pg, pb] = hexToRgb(primaryColor);
  doc.fillColor(`rgb(${pr},${pg},${pb})`).fontSize(20).font('Helvetica-Bold').text(podcastName, 50, 30, { align: 'right' });
  doc.fillColor('#ffffff').fontSize(11).font('Helvetica').text('Sponsoring-Abrechnung', 50, 58, { align: 'right' });
  doc.fillColor('#cccccc').fontSize(9).text(new Date().toLocaleDateString('de-DE'), 50, 76, { align: 'right' });

  doc.fillColor('#000000').moveDown(4);

  // Sponsor info
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#1a1a2e').text(sponsor.name, 50, 140);
  if (sponsor.company) doc.fontSize(11).font('Helvetica').fillColor('#555').text(sponsor.company);
  if (sponsor.contact_name) doc.text(`Ansprechpartner: ${sponsor.contact_name}`);
  if (sponsor.contact_email) doc.text(`E-Mail: ${sponsor.contact_email}`);
  doc.moveDown(1);

  // Divider
  const [ar, ag, ab] = hexToRgb(accentColor);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(`rgb(${ar},${ag},${ab})`).lineWidth(2).stroke();
  doc.moveDown(0.5);

  // Table header
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff');
  doc.rect(50, doc.y, 495, 20).fill(`rgb(${pr},${pg},${pb})`);
  const tableY = doc.y - 20;
  doc.fillColor('#ffffff').text('Episode', 55, tableY + 6, { width: 160 });
  doc.text('Position', 220, tableY + 6, { width: 80 });
  doc.text('Datum', 305, tableY + 6, { width: 80 });
  doc.text('Status', 390, tableY + 6, { width: 70 });
  doc.text('Preis', 465, tableY + 6, { width: 75, align: 'right' });
  doc.moveDown(0.5);

  // Table rows
  let totalRevenue = 0;
  let rowY = doc.y;
  placements.forEach((p: any, i: number) => {
    if (rowY > 720) {
      doc.addPage();
      rowY = 50;
    }
    const bg = i % 2 === 0 ? '#f8f9fa' : '#ffffff';
    doc.rect(50, rowY, 495, 18).fill(bg);
    doc.fillColor('#1a1a2e').fontSize(8).font('Helvetica');
    const title = p.episode_title || p.episode_id || '-';
    doc.text(title.length > 30 ? title.substring(0, 28) + '…' : title, 55, rowY + 5, { width: 160 });
    doc.text(p.position || '-', 220, rowY + 5, { width: 80 });
    doc.text(p.publish_date ? new Date(p.publish_date).toLocaleDateString('de-DE') : '-', 305, rowY + 5, { width: 80 });
    const statusColor = p.invoice_status === 'bezahlt' ? '#16a34a' : p.invoice_status === 'versendet' ? '#d97706' : '#dc2626';
    doc.fillColor(statusColor).text(p.invoice_status || 'offen', 390, rowY + 5, { width: 70 });
    const price = p.price || 0;
    totalRevenue += price;
    doc.fillColor('#1a1a2e').text(`${price.toFixed(2)} €`, 465, rowY + 5, { width: 75, align: 'right' });
    rowY += 18;
  });

  if (placements.length === 0) {
    doc.fillColor('#888').fontSize(10).text('Keine Platzierungen vorhanden.', 50, rowY + 10);
    rowY += 30;
  }

  // Total
  doc.moveDown(1);
  doc.moveTo(50, rowY + 10).lineTo(545, rowY + 10).strokeColor('#cccccc').lineWidth(1).stroke();
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#1a1a2e').text(`Gesamt: ${totalRevenue.toFixed(2)} €`, 50, rowY + 18, { align: 'right' });

  // Footer
  doc.fontSize(8).fillColor('#aaa').text(
    `Erstellt mit PodCore — ${new Date().toLocaleDateString('de-DE')}`,
    50, 780, { align: 'center' }
  );

  doc.end();
});

export default router;
