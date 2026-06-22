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
  const { position, confirmed, publishDate, listens, notes, episodeTitle, episodeNumber } = req.body;

  db.run(`UPDATE ad_placements SET position = COALESCE(?, position), confirmed = COALESCE(?, confirmed), publish_date = ?, listens = ?, notes = ?, episode_title = COALESCE(?, episode_title), episode_number = COALESCE(?, episode_number) WHERE id = ?`,
    [position ?? null, confirmed !== undefined ? (confirmed ? 1 : 0) : null, publishDate ?? null, listens ?? null, notes ?? null, episodeTitle ?? null, episodeNumber ?? null, req.params.placementId]);

  const placement = parsePlacement(db.get('SELECT * FROM ad_placements WHERE id = ?', [req.params.placementId]));
  return res.json({ success: true, data: placement });
});

router.delete('/placements/:placementId', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.run('DELETE FROM ad_placements WHERE id = ?', [req.params.placementId]);
  return res.json({ success: true, message: 'Platzierung gelöscht' });
});

export default router;
