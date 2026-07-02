import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth as any);

// ── Rechnungsnummer automatisch generieren ─────────────────────────────────────────────────
function generateInvoiceNumber(db: any): string {
  const row = db.get("SELECT value FROM settings WHERE key = 'app'") as any;
  const settings = row ? JSON.parse(row.value) : {};
  const schema = settings.invoiceSchema || {};
  const prefix = schema.prefix || 'RE';
  const sep = schema.separator || '-';
  const includeYear = schema.includeYear !== false;
  const includeMonth = schema.includeMonth === true;
  const padding = schema.paddingDigits || 3;
  const next = schema.nextNumber || 1;

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const num = String(next).padStart(padding, '0');

  const parts: string[] = [prefix];
  if (includeYear) parts.push(String(year));
  if (includeMonth) parts.push(month);
  parts.push(num);

  // Hochzählen und speichern
  const updated = { ...settings, invoiceSchema: { ...schema, nextNumber: next + 1 } };
  db.run(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, ['app', JSON.stringify(updated)]);

  return parts.join(sep);
}

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
    customerNumber: row.customer_number,
    contractStart: row.contract_start,
    contractEnd: row.contract_end,
    contactHint: row.contact_hint,
    adDelivery: row.ad_delivery,
    color: row.color,
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
    adTitle: row.name,
    adScript: row.script,
    invoiceNotes: row.invoice_notes,
    // Kategorie
    categoryId: row.category_id,
    // Flexibles Preismodell (3 Preistypen)
    basePrice: row.base_price,
    pricePerEpisode: row.price_per_episode,
    pricePer1000Listens: row.price_per_1000_listens,
    priceModel: row.price_model || 'fixed',   // 'fixed' | 'per_episode' | 'per_1000'
    // Laufzeit
    placementStart: row.placement_start,
    placementEnd: row.placement_end,
    placementLabel: row.placement_label,
  };
}

function parsePlacement(row: any) {
  if (!row) return null;
  return {
    ...row,
    confirmed: row.confirmed === 1,
    deliveryConfirmed: row.delivery_confirmed === 1,
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
    placementStart: row.placement_start,
    placementEnd: row.placement_end,
    placementLabel: row.placement_label,
    performanceNotes: row.performance_notes,
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

// GET /api/sponsors/revenue/dashboard — Einnahmen-Dashboard über alle Sponsoren
router.get('/revenue/dashboard', requirePermission('canViewSponsorReports') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { from, to, status } = req.query as any;

  const rows = db.all(`
    SELECT
      ap.*,
      s.id as sponsor_id, s.name as sponsor_name, s.company as sponsor_company, s.status as sponsor_status,
      sl.name as slot_name, sl.category as slot_category, sl.price as slot_price, sl.currency as slot_currency
    FROM ad_placements ap
    JOIN ad_slots sl ON ap.ad_slot_id = sl.id
    JOIN sponsors s ON sl.sponsor_id = s.id
    ORDER BY ap.publish_date DESC, ap.created_at DESC
  `, []) as any[];

  let filtered = rows;
  if (from) filtered = filtered.filter((r: any) => !r.publish_date || r.publish_date >= from);
  if (to) filtered = filtered.filter((r: any) => !r.publish_date || r.publish_date <= to);
  if (status) filtered = filtered.filter((r: any) => (r.invoice_status || 'offen') === status);

  const getPrice = (r: any) => r.price || r.slot_price || 0;
  const totalRevenue = filtered.reduce((sum: number, r: any) => sum + getPrice(r), 0);
  const paidRevenue = filtered.filter((r: any) => r.invoice_status === 'bezahlt').reduce((sum: number, r: any) => sum + getPrice(r), 0);
  const openRevenue = filtered.filter((r: any) => !r.invoice_status || r.invoice_status === 'offen').reduce((sum: number, r: any) => sum + getPrice(r), 0);
  const sentRevenue = filtered.filter((r: any) => r.invoice_status === 'versendet').reduce((sum: number, r: any) => sum + getPrice(r), 0);

  const bySponsor: Record<string, any> = {};
  filtered.forEach((r: any) => {
    if (!bySponsor[r.sponsor_id]) {
      bySponsor[r.sponsor_id] = { sponsorId: r.sponsor_id, sponsorName: r.sponsor_name, sponsorCompany: r.sponsor_company, sponsorStatus: r.sponsor_status, placements: 0, totalRevenue: 0, paidRevenue: 0, openRevenue: 0, sentRevenue: 0, currency: r.slot_currency || 'EUR' };
    }
    const price = getPrice(r);
    bySponsor[r.sponsor_id].placements++;
    bySponsor[r.sponsor_id].totalRevenue += price;
    if (r.invoice_status === 'bezahlt') bySponsor[r.sponsor_id].paidRevenue += price;
    else if (r.invoice_status === 'versendet') bySponsor[r.sponsor_id].sentRevenue += price;
    else bySponsor[r.sponsor_id].openRevenue += price;
  });

  const byMonth: Record<string, any> = {};
  filtered.forEach((r: any) => {
    const month = r.publish_date ? r.publish_date.substring(0, 7) : 'Kein Datum';
    if (!byMonth[month]) byMonth[month] = { month, totalRevenue: 0, placements: 0 };
    byMonth[month].totalRevenue += getPrice(r);
    byMonth[month].placements++;
  });

  const byCategory: Record<string, any> = {};
  filtered.forEach((r: any) => {
    const cat = r.slot_category || 'Unbekannt';
    if (!byCategory[cat]) byCategory[cat] = { category: cat, totalRevenue: 0, placements: 0 };
    byCategory[cat].totalRevenue += getPrice(r);
    byCategory[cat].placements++;
  });

  // Slot-Auslastung: alle Slots laden und Belegung berechnen
  const allSlots = db.all(`
    SELECT sl.*, s.name as sponsor_name, s.company as sponsor_company, s.color as sponsor_color,
      COUNT(ap.id) as placement_count,
      COALESCE(sl.base_price, sl.price, 0) as effective_price
    FROM ad_slots sl
    JOIN sponsors s ON sl.sponsor_id = s.id
    LEFT JOIN ad_placements ap ON ap.ad_slot_id = sl.id
    GROUP BY sl.id
    ORDER BY s.name, sl.name
  `, []) as any[];

  // Episoden-Buchungen für Auslastung
  const episodeBookings = db.all(`
    SELECT eab.*, s.name as sponsor_name, s.color as sponsor_color
    FROM episode_ad_bookings eab
    JOIN sponsors s ON eab.sponsor_id = s.id
    ORDER BY eab.created_at DESC
  `, []) as any[];

  // Ø TKP berechnen (nur Slots mit pricePer1000Listens)
  const tkpSlots = allSlots.filter((sl: any) => sl.price_per_1000_listens > 0);
  const avgTkp = tkpSlots.length > 0
    ? tkpSlots.reduce((sum: number, sl: any) => sum + sl.price_per_1000_listens, 0) / tkpSlots.length
    : 0;

  // Aktive Slots (mit Buchungen im Zeitraum)
  const activeSlotIds = new Set(filtered.map((r: any) => r.ad_slot_id));
  const activeSlotCount = activeSlotIds.size;

  // Slot-Auslastung: Buchungen pro Slot
  const slotUtilization = allSlots.map((sl: any) => {
    const slotPlacements = filtered.filter((r: any) => r.ad_slot_id === sl.id);
    const slotBookings = episodeBookings.filter((b: any) => b.slot_id === sl.id);
    return {
      id: sl.id, name: sl.name, sponsorName: sl.sponsor_name, sponsorCompany: sl.sponsor_company,
      sponsorColor: sl.sponsor_color || '#7c3aed',
      placements: slotPlacements.length, bookings: slotBookings.length,
      totalRevenue: slotPlacements.reduce((s: number, r: any) => s + (r.price || r.slot_price || 0), 0),
      status: sl.status || 'aktiv', isExclusive: sl.is_exclusive === 1,
      categoryId: sl.category_id, startDate: sl.placement_start, endDate: sl.placement_end,
      basePrice: sl.base_price || sl.price || 0, pricePerEpisode: sl.price_per_episode || 0,
      pricePer1000Listens: sl.price_per_1000_listens || 0,
    };
  });

  return res.json({
    success: true,
    data: {
      summary: {
        totalRevenue, paidRevenue, openRevenue, sentRevenue,
        totalPlacements: filtered.length,
        activeSlots: activeSlotCount,
        totalSlots: allSlots.length,
        avgTkp,
        utilizationRate: allSlots.length > 0 ? (activeSlotCount / allSlots.length) * 100 : 0,
      },
      bySponsor: Object.values(bySponsor).sort((a: any, b: any) => b.totalRevenue - a.totalRevenue),
      byMonth: Object.values(byMonth).sort((a: any, b: any) => a.month.localeCompare(b.month)),
      byCategory: Object.values(byCategory).sort((a: any, b: any) => b.totalRevenue - a.totalRevenue),
      statusBreakdown: {
        offen: filtered.filter((r: any) => !r.invoice_status || r.invoice_status === 'offen').length,
        versendet: filtered.filter((r: any) => r.invoice_status === 'versendet').length,
        bezahlt: filtered.filter((r: any) => r.invoice_status === 'bezahlt').length,
      },
      slotUtilization,
      placements: filtered.map((r: any) => ({
        id: r.id, sponsorId: r.sponsor_id, sponsorName: r.sponsor_name, sponsorCompany: r.sponsor_company,
        slotName: r.slot_name, category: r.slot_category, position: r.position, episodeTitle: r.episode_title,
        publishDate: r.publish_date, price: getPrice(r), currency: r.slot_currency || 'EUR',
        invoiceStatus: r.invoice_status || 'offen', invoiceNumber: r.invoice_number,
        placementLabel: r.placement_label, placementStart: r.placement_start, placementEnd: r.placement_end,
        confirmed: r.confirmed === 1,
      })),
    },
  });
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
  const categories = db.all('SELECT * FROM ad_categories ORDER BY sort_order ASC, name ASC').map((cat: any) => ({
    ...cat,
    // camelCase aliases so frontend can use both naming conventions
    basePrice: cat.base_price,
    pricePerEpisode: cat.price_per_episode,
    pricePer1000Listens: cat.price_per_1000_listens,
    defaultPosition: cat.default_position,
    defaultDuration: cat.default_duration,
    presentationTemplate: cat.presentation_template,
    isExclusive: cat.is_exclusive === 1,
    isActive: cat.is_active === 1,
    sortOrder: cat.sort_order,
    createdAt: cat.created_at,
    updatedAt: cat.updated_at,
  }));
  return res.json({ success: true, data: categories });
});

// POST /api/sponsors/categories — create a new ad category
router.post('/categories', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { name, description, color = '#7c3aed', defaultPosition = 'mid-roll', defaultDuration = 30,
    presentationTemplate = 'präsentiert von', isExclusive = 0,
    basePrice, pricePerEpisode, pricePer1000Listens, currency = 'EUR', sortOrder = 0 } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name erforderlich' });
  const id = uuidv4();
  db.run(`INSERT INTO ad_categories (id, name, description, color, default_position, default_duration, presentation_template, is_exclusive, base_price, price_per_episode, price_per_1000_listens, currency, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, description || null, color, defaultPosition, defaultDuration, presentationTemplate, isExclusive ? 1 : 0, basePrice || null, pricePerEpisode || null, pricePer1000Listens || null, currency, sortOrder]);
  const created = db.get('SELECT * FROM ad_categories WHERE id = ?', [id]) as any;
  return res.json({ success: true, data: created });
});

// PUT /api/sponsors/categories/:id — update an ad category
router.put('/categories/:id', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { name, description, color, defaultPosition, defaultDuration,
    presentationTemplate, isExclusive, basePrice, pricePerEpisode, pricePer1000Listens, currency, isActive, sortOrder } = req.body;
  db.run(`UPDATE ad_categories SET
    name = COALESCE(?, name), description = ?,
    color = COALESCE(?, color),
    default_position = COALESCE(?, default_position), default_duration = COALESCE(?, default_duration),
    presentation_template = COALESCE(?, presentation_template), is_exclusive = COALESCE(?, is_exclusive),
    base_price = ?, price_per_episode = ?, price_per_1000_listens = ?,
    currency = COALESCE(?, currency), is_active = COALESCE(?, is_active), sort_order = COALESCE(?, sort_order),
    updated_at = datetime('now') WHERE id = ?`,
    [name ?? null, description ?? null, color ?? null, defaultPosition ?? null, defaultDuration ?? null,
     presentationTemplate ?? null, isExclusive ?? null, basePrice ?? null, pricePerEpisode ?? null,
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
    scriptText, presentationText, duration, confirmed = 0, sortOrder = 0,
    startDate, endDate, timePosition } = req.body;
  
  if (!adSlotId || !sponsorId) return res.status(400).json({ success: false, error: 'adSlotId und sponsorId erforderlich' });
  
  // Exclusivity Check for date range if no episodeId is provided
  if (!episodeId && startDate && adCategoryId) {
    const category = db.get('SELECT is_exclusive FROM ad_categories WHERE id = ?', [adCategoryId]);
    if (category?.is_exclusive) {
      const conflict = db.get(`
        SELECT b.id FROM episode_ad_bookings b
        LEFT JOIN ad_slots s ON b.ad_slot_id = s.id
        WHERE b.ad_category_id = ? 
        AND (
          (s.start_date <= ? AND s.end_date >= ?) OR
          (s.start_date <= ? AND s.end_date >= ?) OR
          (? <= s.start_date AND ? >= s.end_date)
        )
      `, [adCategoryId, startDate, startDate, endDate, endDate, startDate, endDate]);
      
      if (conflict) {
        return res.status(400).json({ success: false, error: 'Exklusive Kategorie ist in diesem Zeitraum bereits belegt.' });
      }
    }
  }

  const id = uuidv4();
  db.run(`INSERT INTO episode_ad_bookings (id, episode_id, ad_slot_id, ad_category_id, sponsor_id, position, script_text, presentation_text, duration, confirmed, sort_order, time_position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, episodeId || null, adSlotId, adCategoryId || null, sponsorId, position, scriptText || null, presentationText || null, duration || null, confirmed ? 1 : 0, sortOrder, timePosition ?? null]);
  
  const created = db.get(`SELECT b.*, sp.name as sponsor_name, sp.logo as sponsor_logo, sp.company as sponsor_company, s.name as slot_name, c.name as category_name, c.color as category_color FROM episode_ad_bookings b LEFT JOIN sponsors sp ON b.sponsor_id = sp.id LEFT JOIN ad_slots s ON b.ad_slot_id = s.id LEFT JOIN ad_categories c ON b.ad_category_id = c.id WHERE b.id = ?`, [id]) as any;
  return res.json({ success: true, data: created });
});

// PUT /api/sponsors/episode-bookings/:id — update an episode ad booking
router.put('/episode-bookings/:id', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { position, scriptText, presentationText, duration, confirmed, sortOrder, timePosition } = req.body;
  db.run(`UPDATE episode_ad_bookings SET position = COALESCE(?, position), script_text = ?, presentation_text = ?, duration = ?, confirmed = COALESCE(?, confirmed), sort_order = COALESCE(?, sort_order), time_position = ?, updated_at = datetime('now') WHERE id = ?`,
    [position ?? null, scriptText ?? null, presentationText ?? null, duration ?? null, confirmed ?? null, sortOrder ?? null, timePosition ?? null, req.params.id]);
  return res.json({ success: true });
});

// DELETE /api/sponsors/episode-bookings/:id — delete an episode ad booking
router.delete('/episode-bookings/:id', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const existing = db.get('SELECT id FROM episode_ad_bookings WHERE id = ?', [req.params.id]) as any;
  if (!existing) return res.status(404).json({ success: false, error: 'Buchung nicht gefunden' });
  db.run('DELETE FROM episode_ad_bookings WHERE id = ?', [req.params.id]);
  return res.json({ success: true, data: null });
});

// GET /api/sponsors/available-for-episode/:episodeId — get all confirmed ad slots available for booking
router.get('/available-for-episode/:episodeId', requirePermission('canViewSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const episode = db.get('SELECT publish_date, recording_date FROM episodes WHERE id = ?', [req.params.episodeId]) as any;
  // Verwende publish_date oder recording_date als Referenzdatum
  const pubDate = episode?.publish_date || episode?.recording_date || null;

  // 1. Alle Slots laden – alle Status außer 'abgelehnt'/'archiviert' sind buchbar
  const slots = db.all(`
    SELECT s.*, 
           sp.name as sponsor_name, sp.logo as sponsor_logo, sp.company as sponsor_company,
           sp.contract_start, sp.contract_end,
           c.name as category_name, c.color as category_color, c.default_position,
           c.presentation_template, c.is_exclusive, c.base_price, c.price_per_episode
    FROM ad_slots s
    JOIN sponsors sp ON s.sponsor_id = sp.id
    LEFT JOIN ad_categories c ON s.category_id = c.id
    WHERE s.status NOT IN ('abgelehnt', 'archiviert', 'storniert')
    ORDER BY sp.name ASC, s.name ASC
  `) as any[];

  // Ist die Episode ein Entwurf ohne Datum? Dann Datum-Filter großzügig handhaben
  const isDraftWithoutDate = !pubDate;

  // 2. Filtern nach Verfügbarkeit
  const availableSlots = slots.filter(slot => {
    // a) Slot-eigener Zeitraum: nur prüfen wenn Episode ein Datum hat
    if (!isDraftWithoutDate && pubDate) {
      if (slot.start_date && slot.end_date) {
        if (pubDate < slot.start_date || pubDate > slot.end_date) return false;
      } else if (slot.start_date && pubDate < slot.start_date) {
        return false;
      } else if (slot.end_date && pubDate > slot.end_date) {
        return false;
      }
    }
    // Bei Entwurf ohne Datum: Slot ist verfügbar wenn Zeitraum noch nicht abgelaufen ist
    if (isDraftWithoutDate && slot.end_date) {
      const today = new Date().toISOString().split('T')[0];
      if (slot.end_date < today) return false; // Abgelaufene Slots ausblenden
    }

    // b) Vertragslaufzeit des Sponsors: nur prüfen wenn Episode ein Datum hat
    if (!isDraftWithoutDate && pubDate && slot.contract_start && slot.contract_end) {
      if (pubDate < slot.contract_start || pubDate > slot.contract_end) return false;
    }
    // Bei Entwurf ohne Datum: Vertrag muss noch aktiv sein
    if (isDraftWithoutDate && slot.contract_end) {
      const today = new Date().toISOString().split('T')[0];
      if (slot.contract_end < today) return false;
    }

    // c) Exklusivitäts-Check: nur wenn Episode ein konkretes Datum hat
    if (slot.is_exclusive && pubDate && !isDraftWithoutDate) {
      const existingBookings = db.get(`
        SELECT COUNT(*) as count 
        FROM episode_ad_bookings b
        JOIN episodes e ON b.episode_id = e.id
        WHERE b.ad_category_id = ? AND e.publish_date = ? AND b.episode_id != ?
      `, [slot.category_id, pubDate, req.params.episodeId]) as any;
      if (existingBookings?.count > 0) return false;
    }

    // d) Bereits für diese Episode gebucht?
    const alreadyBooked = db.get(
      'SELECT id FROM episode_ad_bookings WHERE episode_id = ? AND ad_slot_id = ?',
      [req.params.episodeId, slot.id]
    );
    if (alreadyBooked) return false;

    return true;
  });

  // 3. Alle aktiven Sponsoren für Sonderbuchung zurückgeben
  const allSponsors = db.all(`
    SELECT sp.id, sp.name, sp.company, sp.contract_start, sp.contract_end,
           sp.status, sp.logo
    FROM sponsors sp
    WHERE sp.status NOT IN ('inaktiv', 'archiviert')
    ORDER BY sp.name ASC
  `) as any[];

  const categories = db.all(`
    SELECT id, name, color, default_position, base_price, price_per_episode, is_exclusive
    FROM ad_categories
    ORDER BY name ASC
  `) as any[];

  return res.json({ 
    success: true, 
    data: availableSlots,
    allSponsors,
    categories
  });
});

// POST /api/sponsors/special-booking — Sonderbuchung direkt ohne vorherigen Slot
router.post('/special-booking', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { episodeId, sponsorId, adCategoryId, position = 'mid-roll',
    scriptText, note, duration, timePosition } = req.body;

  if (!sponsorId) return res.status(400).json({ success: false, error: 'Sponsor erforderlich' });

  // Exklusivitäts-Check
  if (adCategoryId) {
    const category = db.get('SELECT is_exclusive FROM ad_categories WHERE id = ?', [adCategoryId]) as any;
    if (category?.is_exclusive && episodeId) {
      const episode = db.get('SELECT publish_date FROM episodes WHERE id = ?', [episodeId]) as any;
      if (episode?.publish_date) {
        const conflict = db.get(`
          SELECT b.id FROM episode_ad_bookings b
          JOIN episodes e ON b.episode_id = e.id
          WHERE b.ad_category_id = ? AND e.publish_date = ? AND b.episode_id != ?
        `, [adCategoryId, episode.publish_date, episodeId]) as any;
        if (conflict) {
          return res.status(400).json({ success: false, error: 'Diese exklusive Kategorie ist für diesen Termin bereits vergeben.' });
        }
      }
    }
  }

  // Sonderbuchungs-Slot anlegen
  const slotId = uuidv4();
  db.run(`INSERT INTO ad_slots (id, sponsor_id, category_id, name, status, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'sonderbuchung', ?, datetime('now'), datetime('now'))`,
    [slotId, sponsorId, adCategoryId || null, `Sonderbuchung ${new Date().toLocaleDateString('de-DE')}`, note || null]);

  // Buchung erstellen
  const bookingId = uuidv4();
  db.run(`INSERT INTO episode_ad_bookings (id, episode_id, ad_slot_id, ad_category_id, sponsor_id, position, script_text, duration, confirmed, sort_order, time_position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?)`,
    [bookingId, episodeId || null, slotId, adCategoryId || null, sponsorId, position, scriptText || null, duration || null, timePosition ?? null]);

  const created = db.get(`
    SELECT b.*, sp.name as sponsor_name, sp.logo as sponsor_logo, sp.company as sponsor_company,
           s.name as slot_name, c.name as category_name, c.color as category_color
    FROM episode_ad_bookings b
    LEFT JOIN sponsors sp ON b.sponsor_id = sp.id
    LEFT JOIN ad_slots s ON b.ad_slot_id = s.id
    LEFT JOIN ad_categories c ON b.ad_category_id = c.id
    WHERE b.id = ?
  `, [bookingId]) as any;

  return res.json({ success: true, data: created });
});

// ============================================================
// GET /api/sponsors/price-list-pdf — Werbekategorien-Preisliste als PDF
// (MUSS vor /:id stehen, sonst wird es als Sponsor-ID interpretiert!)
router.get('/price-list-pdf', requirePermission('canViewSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const categories = db.all('SELECT * FROM ad_categories ORDER BY name ASC') as any[];

  const PDFDocument = require('pdfkit');
  const fs = require('fs');
  const path = require('path');
  const { DATA_DIR } = require('../database');
  const { getDefaultLayoutForType, getLayoutById, renderPdfHeader, renderPdfFooter, renderWatermark } = require('../pdfLayouts');

  const layoutId = req.query.layoutId as string | undefined;
  const layout = layoutId ? (getLayoutById(layoutId) || getDefaultLayoutForType('invoice')) : getDefaultLayoutForType('invoice');
  const showDescriptions = layout.sections?.showPricelistDescriptions !== false;
  const showExclusive = layout.sections?.showPricelistExclusive !== false;
  const m = layout.pageMargin;

  const customDocTitle = req.query.documentTitle as string | undefined;
  const documentTitle = customDocTitle ? decodeURIComponent(customDocTitle) : 'Werbekategorien & Preisliste';

  const settingsRow = db.get("SELECT value FROM settings WHERE key = 'app'") as any;
  const settings = settingsRow ? JSON.parse(settingsRow.value) : {};
  const podcastName = settings?.branding?.podcastName || settings?.general?.podcastName || 'PodCore';

  let logoPath: string | null = null;
  const brandingDir = path.join(DATA_DIR, 'branding');
  if (fs.existsSync(brandingDir)) {
    const lf = fs.readdirSync(brandingDir).find((f: string) => f.startsWith('logo.'));
    if (lf) logoPath = path.join(brandingDir, lf);
  }

  // Werbekategorien-Preisliste immer im Querformat (viele Spalten)
  const doc = new PDFDocument({ margin: m, size: layout.pageSize, layout: 'landscape', autoFirstPage: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="preisliste-werbung.pdf"');
  doc.pipe(res);

  renderPdfHeader(doc, layout, { podcastName, documentTitle, logoPath });

  const tblW = doc.page.width - m * 2;
  const positionLabels: Record<string, string> = {
    'pre-roll': 'Pre-Roll', 'mid-roll': 'Mid-Roll', 'post-roll': 'Post-Roll', 'host-read': 'Host-Read',
  };

  if (categories.length === 0) {
    doc.fontSize(layout.typography.bodySize).fillColor(layout.colors.muted)
      .text('Keine Werbekategorien vorhanden.', m, doc.y + 10);
  } else {
    doc.fontSize(layout.typography.smallSize).font(`${layout.typography.fontFamily}-Bold`);
    doc.rect(m, doc.y, tblW, 20).fill(layout.colors.secondary);
    const tableY = doc.y - 20;
    const c1 = m + 5, c2 = m + tblW * 0.30, c3 = m + tblW * 0.46, c4 = m + tblW * 0.58, c5 = m + tblW * 0.72, c6 = m + tblW * 0.86;
    doc.fillColor('#ffffff');
    doc.text('Kategorie', c1, tableY + 6, { width: tblW * 0.27 });
    doc.text('Position', c2, tableY + 6, { width: tblW * 0.14 });
    doc.text('Dauer', c3, tableY + 6, { width: tblW * 0.10 });
    doc.text('Basispreis', c4, tableY + 6, { width: tblW * 0.12 });
    doc.text('Preis/Folge', c5, tableY + 6, { width: tblW * 0.12 });
    doc.text('Exklusiv', c6, tableY + 6, { width: tblW * 0.12 });
    doc.moveDown(0.5);

    let rowY = doc.y;
    const maxY = doc.page.height - m - 60;
    categories.forEach((cat: any, i: number) => {
      if (rowY > maxY) { doc.addPage(); rowY = m; }
      const bg = i % 2 === 0 ? '#f8f9fa' : '#ffffff';
      doc.rect(m, rowY, tblW, 22).fill(bg);
      doc.fillColor(layout.colors.text).fontSize(layout.typography.smallSize).font(layout.typography.fontFamily);
      if (cat.color) { doc.circle(c1 + 5, rowY + 11, 4).fill(cat.color); }
      const nameX = cat.color ? c1 + 14 : c1;
      doc.fillColor(layout.colors.text);
      doc.text(cat.name || '-', nameX, rowY + 7, { width: tblW * 0.25 });
      doc.text(positionLabels[cat.default_position] || cat.default_position || '-', c2, rowY + 7, { width: tblW * 0.14 });
      doc.text(cat.default_duration ? `${cat.default_duration}s` : '-', c3, rowY + 7, { width: tblW * 0.10 });
      const bp = cat.base_price != null ? `${parseFloat(cat.base_price).toFixed(2)} ${cat.currency || 'EUR'}` : '-';
      const pp = cat.price_per_episode != null ? `${parseFloat(cat.price_per_episode).toFixed(2)} ${cat.currency || 'EUR'}` : '-';
      doc.text(bp, c4, rowY + 7, { width: tblW * 0.12 });
      doc.text(pp, c5, rowY + 7, { width: tblW * 0.12 });
      if (showExclusive) { doc.text(cat.is_exclusive ? 'Ja' : 'Nein', c6, rowY + 7, { width: tblW * 0.12 }); }
      if (showDescriptions && cat.description) {
        rowY += 22;
        if (rowY > maxY) { doc.addPage(); rowY = m; }
        doc.fillColor(layout.colors.muted).fontSize(layout.typography.smallSize - 1)
          .text(cat.description.length > 80 ? cat.description.substring(0, 78) + '\u2026' : cat.description, c1 + 14, rowY + 3, { width: tblW - 20 });
        rowY += 16;
      } else { rowY += 22; }
    });
    doc.moveDown(1);
    doc.moveTo(m, doc.y).lineTo(doc.page.width - m, doc.y).strokeColor(layout.colors.accent).lineWidth(1).stroke();
    doc.moveDown(0.5);
    doc.fontSize(layout.typography.smallSize).font(layout.typography.fontFamily).fillColor(layout.colors.muted)
      .text(`${categories.length} Kategorie${categories.length !== 1 ? 'n' : ''} | Stand: ${new Date().toLocaleDateString('de-DE')}`, m, doc.y);
  }

  renderWatermark(doc, layout);
  renderPdfFooter(doc, layout, { podcastName, pageNum: 1 });
  doc.end();
});

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
  // Episodenplanung: alle episode_ad_bookings für diesen Sponsor
  sponsor.episodeBookings = db.all(`
    SELECT b.*, e.title as episode_title, e.number as episode_number, e.publish_date,
           s.name as slot_name, c.name as category_name, c.color as category_color
    FROM episode_ad_bookings b
    LEFT JOIN episodes e ON b.episode_id = e.id
    LEFT JOIN ad_slots s ON b.ad_slot_id = s.id
    LEFT JOIN ad_categories c ON b.ad_category_id = c.id
    WHERE b.sponsor_id = ?
    ORDER BY e.publish_date DESC, b.created_at DESC
  `, [row.id]);

  return res.json({ success: true, data: sponsor });
});

router.post('/', requirePermission('canCreateSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const id = uuidv4();
  const { name, company, contactName, contactEmail, contactPhone, website, logo, status = 'interessent', description, notes, tags = [], totalBudget, currency = 'EUR', customerNumber } = req.body;

  if (!name || !company) return res.status(400).json({ success: false, error: 'Name und Firma erforderlich' });

  db.run('INSERT INTO sponsors (id, name, company, contact_name, contact_email, contact_phone, website, logo, status, description, notes, tags, total_budget, currency, customer_number, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, name, company, contactName || null, contactEmail || null, contactPhone || null, website || null, logo || null, status, description || null, notes || null, JSON.stringify(tags), totalBudget || null, currency, customerNumber || null, req.user!.id]);

  const sponsor = parseSponsor(db.get('SELECT * FROM sponsors WHERE id = ?', [id]));
  sponsor.adSlots = [];
  return res.status(201).json({ success: true, data: sponsor });
});

router.put('/:id', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { name, company, contactName, contactEmail, contactPhone, website, logo, status, description, notes, tags, totalBudget, currency, customerNumber, contractStart, contractEnd, contactHint, adDelivery, color } = req.body;

  db.run(`UPDATE sponsors SET name = COALESCE(?, name), company = COALESCE(?, company), contact_name = ?, contact_email = ?, contact_phone = ?, website = ?, logo = ?, status = COALESCE(?, status), description = ?, notes = ?, tags = COALESCE(?, tags), total_budget = ?, currency = COALESCE(?, currency), customer_number = ?, contract_start = ?, contract_end = ?, contact_hint = ?, ad_delivery = COALESCE(?, ad_delivery), color = COALESCE(?, color), updated_at = datetime('now') WHERE id = ?`,
    [name ?? null, company ?? null, contactName ?? null, contactEmail ?? null, contactPhone ?? null, website ?? null, logo ?? null, status ?? null, description ?? null, notes ?? null, tags ? JSON.stringify(tags) : null, totalBudget ?? null, currency ?? null, customerNumber ?? null, contractStart ?? null, contractEnd ?? null, contactHint ?? null, adDelivery ?? null, color ?? null, req.params.id]);

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
  const {
    name, category = 'mid-roll', categoryId,
    productionType = 'eigenproduktion', status = 'angefragt',
    duration, script, assetId, deliveredAssetPath,
    price, priceModel = 'fixed', basePrice, pricePerEpisode, pricePer1000Listens,
    currency = 'EUR', startDate, endDate, targetEpisodes,
    placementStart, placementEnd, placementLabel,
    notes, invoiceNotes,
  } = req.body;

  if (!name) return res.status(400).json({ success: false, error: 'Name erforderlich' });

  db.run(`INSERT INTO ad_slots
    (id, sponsor_id, name, category, category_id, production_type, status, duration, script,
     asset_id, delivered_asset_path, price, price_model, base_price, price_per_episode,
     price_per_1000_listens, currency, start_date, end_date, target_episodes,
     placement_start, placement_end, placement_label, notes, invoice_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, req.params.sponsorId, name, category, categoryId || null,
     productionType, status, duration || null, script || null,
     assetId || null, deliveredAssetPath || null,
     price || null, priceModel, basePrice || null, pricePerEpisode || null,
     pricePer1000Listens || null, currency,
     startDate || null, endDate || null, targetEpisodes || null,
     placementStart || null, placementEnd || null, placementLabel || null,
     notes || null, invoiceNotes || null]);

  const slot = parseAdSlot(db.get('SELECT * FROM ad_slots WHERE id = ?', [id]));
  slot.placements = [];
  return res.status(201).json({ success: true, data: slot });
});

router.put('/slots/:slotId', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const {
    name, category, categoryId, productionType, status, duration, script,
    assetId, deliveredAssetPath,
    // Preismodell
    price, priceModel, basePrice, pricePerEpisode, pricePer1000Listens, currency,
    // Laufzeit
    startDate, endDate, targetEpisodes,
    placementStart, placementEnd, placementLabel,
    notes, invoiceNotes, deliveryType,
  } = req.body;

  // category_id: entweder direkt als categoryId oder aus category (Legacy)
  const resolvedCategoryId = categoryId !== undefined ? categoryId : (category !== undefined ? category : undefined);

  db.run(`UPDATE ad_slots SET
    name = COALESCE(?, name),
    category = COALESCE(?, category),
    category_id = COALESCE(?, category_id),
    production_type = COALESCE(?, production_type),
    status = COALESCE(?, status),
    duration = ?,
    script = ?,
    asset_id = ?,
    delivered_asset_path = ?,
    price = ?,
    price_model = COALESCE(?, price_model),
    base_price = ?,
    price_per_episode = ?,
    price_per_1000_listens = ?,
    currency = COALESCE(?, currency),
    start_date = ?,
    end_date = ?,
    target_episodes = ?,
    placement_start = ?,
    placement_end = ?,
    placement_label = ?,
    notes = ?,
    invoice_notes = ?,
    updated_at = datetime('now')
    WHERE id = ?`,
    [
      name ?? null, category ?? null, resolvedCategoryId ?? null,
      productionType ?? null, status ?? null,
      duration ?? null, script ?? null, assetId ?? null, deliveredAssetPath ?? null,
      price !== undefined ? price : null,
      priceModel ?? null,
      basePrice !== undefined ? basePrice : null,
      pricePerEpisode !== undefined ? pricePerEpisode : null,
      pricePer1000Listens !== undefined ? pricePer1000Listens : null,
      currency ?? null,
      startDate ?? null, endDate ?? null, targetEpisodes ?? null,
      placementStart !== undefined ? placementStart : null,
      placementEnd !== undefined ? placementEnd : null,
      placementLabel !== undefined ? placementLabel : null,
      notes ?? null, invoiceNotes ?? null,
      req.params.slotId,
    ]);

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
  const { episodeId, episodeTitle, episodeNumber, position = 'mid-roll', confirmed = false, publishDate, listens, notes, price, currency,
    placementStart, placementEnd, placementLabel, performanceNotes, deliveryConfirmed } = req.body;

  if (!episodeId) return res.status(400).json({ success: false, error: 'Episode erforderlich' });

  // Automatische Rechnungsnummer generieren
  const autoInvoiceNumber = generateInvoiceNumber(db);
  const invoiceDate = new Date().toISOString().split('T')[0];

  db.run('INSERT INTO ad_placements (id, ad_slot_id, episode_id, episode_title, episode_number, position, confirmed, publish_date, listens, notes, price, currency, invoice_number, invoice_date, invoice_status, placement_start, placement_end, placement_label, performance_notes, delivery_confirmed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, req.params.slotId, episodeId, episodeTitle || null, episodeNumber || null, position, confirmed ? 1 : 0, publishDate || null, listens || null, notes || null, price || null, currency || 'EUR', autoInvoiceNumber, invoiceDate, 'offen',
     placementStart || null, placementEnd || null, placementLabel || null, performanceNotes || null, deliveryConfirmed ? 1 : 0]);

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
    price, currency, invoiceNumber, invoiceDate, invoiceStatus, invoiceNotes,
    placementStart, placementEnd, placementLabel, performanceNotes, deliveryConfirmed } = req.body;

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
      invoice_notes = ?,
      placement_start = ?,
      placement_end = ?,
      placement_label = ?,
      performance_notes = ?,
      delivery_confirmed = COALESCE(?, delivery_confirmed)
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
      placementStart !== undefined ? placementStart : null,
      placementEnd !== undefined ? placementEnd : null,
      placementLabel !== undefined ? placementLabel : null,
      performanceNotes !== undefined ? performanceNotes : null,
      deliveryConfirmed !== undefined ? (deliveryConfirmed ? 1 : 0) : null,
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

  const PDFDocument = require('pdfkit');
  const fs = require('fs');
  const path = require('path');
  const { DATA_DIR } = require('../database');
  const { getDefaultLayoutForType, getLayoutById, renderPdfHeader, renderPdfFooter, renderWatermark } = require('../pdfLayouts');

  const layoutId = req.query.layoutId as string | undefined;
  const layout = layoutId ? (getLayoutById(layoutId) || getDefaultLayoutForType('invoice')) : getDefaultLayoutForType('invoice');
  const m = layout.pageMargin;

  // Anpassbarer Dokumententitel (aus Query-Parameter oder Standard)
  const customDocTitle = req.query.documentTitle as string | undefined;
  const documentTitle = customDocTitle ? decodeURIComponent(customDocTitle) : 'Sponsoring-Abrechnung';

  // Load branding
  const settingsRow = db.get("SELECT value FROM settings WHERE key = 'app'") as any;
  const settings = settingsRow ? JSON.parse(settingsRow.value) : {};
  const podcastName = settings?.branding?.podcastName || settings?.general?.podcastName || 'PodCore';

  let logoPath: string | null = null;
  const brandingDir = path.join(DATA_DIR, 'branding');
  if (fs.existsSync(brandingDir)) {
    const lf = fs.readdirSync(brandingDir).find((f: string) => f.startsWith('logo.'));
    if (lf) logoPath = path.join(brandingDir, lf);
  }

  const doc = new PDFDocument({ margin: m, size: layout.pageSize, layout: layout.pageOrientation === 'landscape' ? 'landscape' : 'portrait', autoFirstPage: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Abrechnung_${sponsor.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);
  doc.pipe(res);

  // Header
  renderPdfHeader(doc, layout, { podcastName, documentTitle, logoPath });

  // Sponsor info
  doc.fontSize(layout.typography.subtitleSize).font(`${layout.typography.fontFamily}-Bold`)
    .fillColor(layout.colors.primary).text(sponsor.name);
  doc.fontSize(layout.typography.bodySize).font(layout.typography.fontFamily).fillColor(layout.colors.muted);
  if (sponsor.company) doc.text(sponsor.company);
  if (sponsor.contact_name) doc.text(`Ansprechpartner: ${sponsor.contact_name}`);
  if (sponsor.contact_email) doc.text(`E-Mail: ${sponsor.contact_email}`);
  doc.fillColor(layout.colors.text);
  doc.moveDown(0.8);

  // Divider
  doc.moveTo(m, doc.y).lineTo(doc.page.width - m, doc.y).strokeColor(layout.colors.accent).lineWidth(1.5).stroke();
  doc.moveDown(0.5);

  // Abrechnung-Sektionen gemäß Layout-Einstellungen
  const showDetails = layout.sections?.showInvoiceDetails !== false;
  const showSummary = layout.sections?.showInvoiceSummary !== false;

  if (!showDetails && !showSummary) {
    doc.fontSize(layout.typography.bodySize).fillColor(layout.colors.muted)
      .text('(Alle Sektionen in diesem Layout deaktiviert)', { align: 'center' });
    renderWatermark(doc, layout);
    renderPdfFooter(doc, layout, { podcastName, pageNum: 1 });
    doc.end();
    return;
  }

  // Alle Platzierungen inkl. episode_ad_bookings ohne Folge zusammenführen
  const allRows: any[] = [
    ...placements,
    // Buchungen ohne feste Folge aus episode_ad_bookings
    ...(db.all(`
      SELECT b.*, s.name as slot_name, s.category as slot_category, s.price as slot_price
      FROM episode_ad_bookings b
      LEFT JOIN ad_slots s ON b.ad_slot_id = s.id
      WHERE b.sponsor_id = ? AND (b.episode_id IS NULL OR b.episode_id = '')
    `, [req.params.id]) as any[]).map((b: any) => ({
      ...b,
      price: b.price || b.slot_price || 0,
      episode_title: null,
      publish_date: null,
      invoice_status: b.invoice_status || 'offen',
      invoice_number: b.invoice_number || null,
      position: b.position || 'mid-roll',
    })),
  ];

  // Filter anwenden
  const filterStatus = req.query.filter as string | undefined;
  const filteredRows = filterStatus && filterStatus !== 'alle'
    ? allRows.filter((p: any) => (p.invoice_status || 'offen') === filterStatus)
    : allRows;

  // Table header (nur wenn showDetails aktiv)
  const tblW = doc.page.width - m * 2;
  if (!showDetails) {
    // Nur Zusammenfassung: direkt zur Gesamt-Zeile
    const totalOnly = filteredRows.reduce((sum: number, p: any) => sum + (p.price || 0), 0);
    doc.fontSize(layout.typography.headingSize).font(`${layout.typography.fontFamily}-Bold`)
      .fillColor(layout.colors.primary).text(`Gesamtumsatz: ${totalOnly.toFixed(2)} €`, m, doc.y, { align: 'right' });
    renderWatermark(doc, layout);
    renderPdfFooter(doc, layout, { podcastName, pageNum: 1 });
    doc.end();
    return;
  }
  doc.fontSize(layout.typography.smallSize).font(`${layout.typography.fontFamily}-Bold`);
  doc.rect(m, doc.y, tblW, 20).fill(layout.colors.secondary);
  const tableY = doc.y - 20;
  const c1 = m + 5, c2 = m + tblW * 0.38, c3 = m + tblW * 0.55, c4 = m + tblW * 0.72, c5 = m + tblW * 0.86;
  doc.fillColor('#ffffff').text('Episode', c1, tableY + 6, { width: tblW * 0.35 });
  doc.text('Position', c2, tableY + 6, { width: tblW * 0.15 });
  doc.text('Datum', c3, tableY + 6, { width: tblW * 0.15 });
  doc.text('Status', c4, tableY + 6, { width: tblW * 0.12 });
  doc.text('Preis', c5, tableY + 6, { width: tblW * 0.12, align: 'right' });
  doc.moveDown(0.5);

  // Table rows
  let totalRevenue = 0;
  let rowY = doc.y;
  const maxY = doc.page.height - m - 60;
  filteredRows.forEach((p: any, i: number) => {
    if (rowY > maxY) { doc.addPage(); rowY = m; }
    const bg = i % 2 === 0 ? '#f8f9fa' : '#ffffff';
    doc.rect(m, rowY, tblW, 18).fill(bg);
    doc.fillColor(layout.colors.text).fontSize(layout.typography.smallSize).font(layout.typography.fontFamily);
    const title = p.episode_title || p.episode_id || '-';
    doc.text(title.length > 32 ? title.substring(0, 30) + '…' : title, c1, rowY + 5, { width: tblW * 0.35 });
    doc.text(p.position || '-', c2, rowY + 5, { width: tblW * 0.15 });
    doc.text(p.publish_date ? new Date(p.publish_date).toLocaleDateString('de-DE') : '-', c3, rowY + 5, { width: tblW * 0.15 });
    const statusColor = p.invoice_status === 'bezahlt' ? '#16a34a' : p.invoice_status === 'versendet' ? '#d97706' : '#dc2626';
    doc.fillColor(statusColor).text(p.invoice_status || 'offen', c4, rowY + 5, { width: tblW * 0.12 });
    const price = p.price || 0;
    totalRevenue += price;
    doc.fillColor(layout.colors.text).text(`${price.toFixed(2)} €`, c5, rowY + 5, { width: tblW * 0.12, align: 'right' });
    rowY += 18;
  });

  if (filteredRows.length === 0) {
    doc.fillColor(layout.colors.muted).fontSize(layout.typography.bodySize)
      .text('Keine Platzierungen vorhanden.', m, rowY + 10);
    rowY += 30;
  }

  // Gesamt (nur wenn showSummary aktiv)
  if (showSummary) {
    doc.moveTo(m, rowY + 8).lineTo(doc.page.width - m, rowY + 8).strokeColor(layout.colors.accent).lineWidth(1).stroke();
    doc.fontSize(layout.typography.headingSize).font(`${layout.typography.fontFamily}-Bold`)
      .fillColor(layout.colors.primary)
      .text(`Gesamt: ${totalRevenue.toFixed(2)} €`, m, rowY + 16, { align: 'right' });
  }

  renderWatermark(doc, layout);
  renderPdfFooter(doc, layout, { podcastName, pageNum: 1 });
  doc.end();
});


// ============================================================
// GET /api/sponsors/:id/confirmation-pdf — Buchungsbestätigung für den Sponsor
// Enthält ALLE Platzierungen (mit und ohne Folge) als übersichtliche Bestätigung
// ============================================================
router.get('/:id/confirmation-pdf', requirePermission('canViewSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const sponsor = db.get('SELECT * FROM sponsors WHERE id = ?', [req.params.id]) as any;
  if (!sponsor) return res.status(404).json({ success: false, error: 'Sponsor nicht gefunden' });

  const slots = db.all('SELECT * FROM ad_slots WHERE sponsor_id = ?', [req.params.id]) as any[];
  const slotIds = slots.map((s: any) => s.id);

  // Episodengebundene Platzierungen
  let episodePlacements: any[] = [];
  if (slotIds.length > 0) {
    const placeholders = slotIds.map(() => '?').join(',');
    episodePlacements = db.all(`
      SELECT p.*, s.name as slot_name, s.category as slot_category,
             s.placement_start, s.placement_end, s.placement_label,
             s.base_price, s.price_per_episode, s.price_per_1000_listens, s.price_model
      FROM ad_placements p
      JOIN ad_slots s ON p.ad_slot_id = s.id
      WHERE p.ad_slot_id IN (${placeholders})
      ORDER BY p.publish_date ASC, p.created_at ASC
    `, slotIds) as any[];
  }

  // Nicht-episodengebundene Buchungen aus episode_ad_bookings
  const standaloneBookings = db.all(`
    SELECT b.*, s.name as slot_name, s.category as slot_category,
           s.placement_start, s.placement_end, s.placement_label,
           s.base_price, s.price_per_episode, s.price_per_1000_listens, s.price_model,
           c.name as category_name, c.color as category_color
    FROM episode_ad_bookings b
    LEFT JOIN ad_slots s ON b.ad_slot_id = s.id
    LEFT JOIN ad_categories c ON b.ad_category_id = c.id
    WHERE b.sponsor_id = ? AND (b.episode_id IS NULL OR b.episode_id = '')
    ORDER BY b.created_at ASC
  `, [req.params.id]) as any[];

  const PDFDocument = require('pdfkit');
  const fs = require('fs');
  const path = require('path');
  const { DATA_DIR } = require('../database');
  const { getDefaultLayoutForType, getLayoutById, renderPdfHeader, renderPdfFooter, renderWatermark } = require('../pdfLayouts');

  const layoutId = req.query.layoutId as string | undefined;
  const layout = layoutId ? (getLayoutById(layoutId) || getDefaultLayoutForType('invoice')) : getDefaultLayoutForType('invoice');
  const m = layout.pageMargin;

  const customDocTitle = req.query.documentTitle as string | undefined;
  const documentTitle = customDocTitle ? decodeURIComponent(customDocTitle) : 'Buchungsbestätigung';

  const settingsRow = db.get("SELECT value FROM settings WHERE key = 'app'") as any;
  const settings = settingsRow ? JSON.parse(settingsRow.value) : {};
  const podcastName = settings?.branding?.podcastName || settings?.general?.podcastName || 'PodCore';

  let logoPath: string | null = null;
  const brandingDir = path.join(DATA_DIR, 'branding');
  if (fs.existsSync(brandingDir)) {
    const lf = fs.readdirSync(brandingDir).find((f: string) => f.startsWith('logo.'));
    if (lf) logoPath = path.join(brandingDir, lf);
  }

  const doc = new PDFDocument({ margin: m, size: layout.pageSize, autoFirstPage: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Buchungsbestaetigung_${sponsor.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);
  doc.pipe(res);

  renderPdfHeader(doc, layout, { podcastName, documentTitle, logoPath });

  // Sponsor-Info
  doc.fontSize(layout.typography.subtitleSize).font(`${layout.typography.fontFamily}-Bold`)
    .fillColor(layout.colors.primary).text(sponsor.name);
  doc.fontSize(layout.typography.bodySize).font(layout.typography.fontFamily).fillColor(layout.colors.muted);
  if (sponsor.company) doc.text(sponsor.company);
  if (sponsor.contact_name) doc.text(`Ansprechpartner: ${sponsor.contact_name}`);
  if (sponsor.contact_email) doc.text(`E-Mail: ${sponsor.contact_email}`);
  if (sponsor.contract_start || sponsor.contract_end) {
    const cs = sponsor.contract_start ? new Date(sponsor.contract_start).toLocaleDateString('de-DE') : '—';
    const ce = sponsor.contract_end ? new Date(sponsor.contract_end).toLocaleDateString('de-DE') : '—';
    doc.text(`Vertragslaufzeit: ${cs} – ${ce}`);
  }
  doc.fillColor(layout.colors.text);
  doc.moveDown(0.5);
  doc.moveTo(m, doc.y).lineTo(doc.page.width - m, doc.y).strokeColor(layout.colors.accent).lineWidth(1.5).stroke();
  doc.moveDown(0.5);

  const tblW = doc.page.width - m * 2;
  const maxY = doc.page.height - m - 60;
  const posLabels: Record<string, string> = { 'pre-roll': 'Pre-Roll', 'mid-roll': 'Mid-Roll', 'post-roll': 'Post-Roll', 'host-read': 'Host-Read' };

  const renderSection = (title: string, rows: any[]) => {
    if (rows.length === 0) return;
    doc.fontSize(layout.typography.headingSize).font(`${layout.typography.fontFamily}-Bold`)
      .fillColor(layout.colors.primary).text(title, m, doc.y);
    doc.moveDown(0.3);

    // Tabellen-Header
    doc.fontSize(layout.typography.smallSize).font(`${layout.typography.fontFamily}-Bold`);
    doc.rect(m, doc.y, tblW, 20).fill(layout.colors.secondary);
    const hY = doc.y - 20;
    const c1 = m + 5, c2 = m + tblW * 0.35, c3 = m + tblW * 0.52, c4 = m + tblW * 0.65, c5 = m + tblW * 0.78;
    doc.fillColor('#ffffff');
    doc.text('Platzierung / Kampagne', c1, hY + 6, { width: tblW * 0.32 });
    doc.text('Position', c2, hY + 6, { width: tblW * 0.15 });
    doc.text('Laufzeit', c3, hY + 6, { width: tblW * 0.11 });
    doc.text('Datum', c4, hY + 6, { width: tblW * 0.11 });
    doc.text('Preis', c5, hY + 6, { width: tblW * 0.20, align: 'right' });
    doc.moveDown(0.5);

    let rowY = doc.y;
    rows.forEach((p: any, i: number) => {
      if (rowY > maxY) { doc.addPage(); rowY = m; }
      const bg = i % 2 === 0 ? '#f8f9fa' : '#ffffff';
      doc.rect(m, rowY, tblW, 20).fill(bg);
      doc.fillColor(layout.colors.text).fontSize(layout.typography.smallSize).font(layout.typography.fontFamily);

      const label = p.placement_label || p.slot_name || p.name || '—';
      doc.text(label.length > 28 ? label.substring(0, 26) + '…' : label, c1, rowY + 6, { width: tblW * 0.32 });
      doc.text(posLabels[p.position] || p.position || '—', c2, rowY + 6, { width: tblW * 0.15 });

      const ps = p.placement_start ? new Date(p.placement_start).toLocaleDateString('de-DE') : '—';
      const pe = p.placement_end ? new Date(p.placement_end).toLocaleDateString('de-DE') : '—';
      const laufzeit = (p.placement_start || p.placement_end) ? `${ps}–${pe}` : '—';
      doc.text(laufzeit, c3, rowY + 6, { width: tblW * 0.11 });

      const pubDate = p.publish_date ? new Date(p.publish_date).toLocaleDateString('de-DE') : '—';
      doc.text(pubDate, c4, rowY + 6, { width: tblW * 0.11 });

      // Preis: Abrechnungspreis oder Basispreis
      const price = p.price || p.base_price || 0;
      const currency = p.currency || 'EUR';
      doc.fillColor(price > 0 ? layout.colors.primary : layout.colors.muted)
        .text(price > 0 ? `${Number(price).toFixed(2)} ${currency}` : '—', c5, rowY + 6, { width: tblW * 0.20, align: 'right' });
      rowY += 20;
    });
    doc.moveDown(1.5);
  };

  // Abschnitt 1: Episodengebundene Platzierungen
  renderSection('Geplante Episoden-Platzierungen', episodePlacements);

  // Abschnitt 2: Zeitraum-Buchungen (ohne feste Folge)
  renderSection('Zeitraum-Buchungen (ohne feste Folge)', standaloneBookings);

  // Gesamt
  const allRows = [...episodePlacements, ...standaloneBookings];
  const totalRevenue = allRows.reduce((sum: number, p: any) => sum + (p.price || p.base_price || 0), 0);
  if (allRows.length === 0) {
    doc.fillColor(layout.colors.muted).fontSize(layout.typography.bodySize)
      .text('Keine Platzierungen vorhanden.', m, doc.y);
  } else {
    doc.moveTo(m, doc.y).lineTo(doc.page.width - m, doc.y).strokeColor(layout.colors.accent).lineWidth(1).stroke();
    doc.moveDown(0.5);
    doc.fontSize(layout.typography.headingSize).font(`${layout.typography.fontFamily}-Bold`)
      .fillColor(layout.colors.primary)
      .text(`Gesamt: ${totalRevenue.toFixed(2)} ${sponsor.currency || 'EUR'}  |  ${allRows.length} Platzierung${allRows.length !== 1 ? 'en' : ''}`, m, doc.y, { align: 'right' });
  }

  renderWatermark(doc, layout);
  renderPdfFooter(doc, layout, { podcastName, pageNum: 1 });
  doc.end();
});

// ============================================================
// BUCHUNGSKALENDER – Alle Buchungen/Platzierungen für Kalenderansicht
// ============================================================
router.get('/booking-calendar', requirePermission('canViewSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { from, to } = req.query as any;

  // 1. Episodengebundene Buchungen
  const episodeBookings = db.all(`
    SELECT b.*, sp.name as sponsor_name, sp.company as sponsor_company, sp.color as sponsor_color,
           c.name as category_name, c.color as category_color, c.is_exclusive,
           e.title as episode_title, e.number as episode_number, e.publish_date, e.status as episode_status
    FROM episode_ad_bookings b
    JOIN sponsors sp ON b.sponsor_id = sp.id
    LEFT JOIN ad_categories c ON b.ad_category_id = c.id
    LEFT JOIN episodes e ON b.episode_id = e.id
    ORDER BY e.publish_date ASC, b.sort_order ASC
  `) as any[];

  // 2. Zeitraum-Buchungen (ad_slots mit Laufzeit)
  const slotBookings = db.all(`
    SELECT sl.*, sp.name as sponsor_name, sp.company as sponsor_company, sp.color as sponsor_color,
           c.name as category_name, c.color as category_color, c.is_exclusive
    FROM ad_slots sl
    JOIN sponsors sp ON sl.sponsor_id = sp.id
    LEFT JOIN ad_categories c ON sl.category_id = c.id
    WHERE sl.placement_start IS NOT NULL OR sl.start_date IS NOT NULL
    ORDER BY COALESCE(sl.placement_start, sl.start_date) ASC
  `) as any[];

  // 3. Konflikte erkennen: Exklusive Kategorien an gleichen Terminen
  const conflicts: any[] = [];
  const exclusiveBookings = episodeBookings.filter((b: any) => b.is_exclusive);
  const byDate: Record<string, any[]> = {};
  exclusiveBookings.forEach((b: any) => {
    const key = `${b.publish_date || 'no-date'}_${b.ad_category_id}`;
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(b);
  });
  Object.values(byDate).forEach((group: any[]) => {
    if (group.length > 1) {
      conflicts.push({
        type: 'exclusive_conflict',
        date: group[0].publish_date,
        categoryName: group[0].category_name,
        bookings: group.map((b: any) => ({ id: b.id, sponsorName: b.sponsor_name, episodeTitle: b.episode_title })),
        message: `Exklusive Kategorie "${group[0].category_name}" ist am ${group[0].publish_date} mehrfach gebucht`,
      });
    }
  });

  // 4. Datum-Filter anwenden
  let filteredEpisodeBookings = episodeBookings;
  if (from) filteredEpisodeBookings = filteredEpisodeBookings.filter((b: any) => !b.publish_date || b.publish_date >= from);
  if (to) filteredEpisodeBookings = filteredEpisodeBookings.filter((b: any) => !b.publish_date || b.publish_date <= to);

  let filteredSlotBookings = slotBookings;
  if (from) filteredSlotBookings = filteredSlotBookings.filter((b: any) => {
    const start = b.placement_start || b.start_date;
    return !start || start >= from;
  });
  if (to) filteredSlotBookings = filteredSlotBookings.filter((b: any) => {
    const end = b.placement_end || b.end_date;
    return !end || end <= to;
  });

  return res.json({
    success: true,
    data: {
      episodeBookings: filteredEpisodeBookings.map((b: any) => ({
        id: b.id,
        type: 'episode',
        sponsorId: b.sponsor_id,
        sponsorName: b.sponsor_name,
        sponsorCompany: b.sponsor_company,
        sponsorColor: b.sponsor_color || '#7c3aed',
        categoryName: b.category_name,
        categoryColor: b.category_color || '#6b7280',
        isExclusive: b.is_exclusive === 1,
        position: b.position,
        episodeId: b.episode_id,
        episodeTitle: b.episode_title,
        episodeNumber: b.episode_number,
        date: b.publish_date,
        confirmed: b.confirmed === 1,
        episodeStatus: b.episode_status,
      })),
      slotBookings: filteredSlotBookings.map((b: any) => ({
        id: b.id,
        type: 'slot',
        sponsorId: b.sponsor_id,
        sponsorName: b.sponsor_name,
        sponsorCompany: b.sponsor_company,
        sponsorColor: b.sponsor_color || '#7c3aed',
        categoryName: b.category_name,
        categoryColor: b.category_color || '#6b7280',
        isExclusive: b.is_exclusive === 1,
        position: b.category || b.production_type,
        startDate: b.placement_start || b.start_date,
        endDate: b.placement_end || b.end_date,
        label: b.placement_label || b.name,
        status: b.status,
        basePrice: b.base_price,
        pricePerEpisode: b.price_per_episode,
      })),
      conflicts,
    },
  });
});

// ============================================================
// FOLGENSPONSOR-AUTOMATISIERUNG – Neue Episode einem aktiven Folgensponsor zuordnen
// ============================================================
router.post('/auto-assign-episode', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { episodeId } = req.body;
  if (!episodeId) return res.status(400).json({ success: false, error: 'episodeId erforderlich' });

  const episode = db.get('SELECT id, publish_date, recording_date FROM episodes WHERE id = ?', [episodeId]) as any;
  if (!episode) return res.status(404).json({ success: false, error: 'Episode nicht gefunden' });

  const epDate = episode.publish_date || episode.recording_date;
  if (!epDate) return res.json({ success: true, data: { assigned: [], message: 'Kein Datum – keine automatische Zuordnung möglich' } });

  // Alle aktiven Slots mit Laufzeit finden, die dieses Datum abdecken
  const activeSlots = db.all(`
    SELECT sl.*, sp.name as sponsor_name, c.is_exclusive, c.name as category_name
    FROM ad_slots sl
    JOIN sponsors sp ON sl.sponsor_id = sp.id
    LEFT JOIN ad_categories c ON sl.category_id = c.id
    WHERE sl.status IN ('aktiv', 'angefragt', 'bestätigt')
      AND (
        (sl.placement_start IS NOT NULL AND sl.placement_end IS NOT NULL
         AND ? BETWEEN sl.placement_start AND sl.placement_end)
        OR
        (sl.start_date IS NOT NULL AND sl.end_date IS NOT NULL
         AND ? BETWEEN sl.start_date AND sl.end_date)
      )
  `, [epDate, epDate]) as any[];

  const assigned: any[] = [];
  const skipped: any[] = [];

  for (const slot of activeSlots) {
    // Bereits gebucht?
    const existing = db.get('SELECT id FROM episode_ad_bookings WHERE episode_id = ? AND ad_slot_id = ?', [episodeId, slot.id]);
    if (existing) { skipped.push({ slotId: slot.id, reason: 'Bereits gebucht' }); continue; }

    // Exklusivitäts-Check
    if (slot.is_exclusive && slot.category_id) {
      const conflict = db.get(`
        SELECT b.id FROM episode_ad_bookings b
        WHERE b.episode_id = ? AND b.ad_category_id = ?
      `, [episodeId, slot.category_id]) as any;
      if (conflict) { skipped.push({ slotId: slot.id, reason: 'Exklusive Kategorie bereits belegt' }); continue; }
    }

    // Buchung anlegen
    const bookingId = uuidv4();
    const position = slot.category || 'mid-roll';
    db.run(`INSERT INTO episode_ad_bookings
      (id, episode_id, ad_slot_id, ad_category_id, sponsor_id, position, confirmed, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0, datetime('now'), datetime('now'))`,
      [bookingId, episodeId, slot.id, slot.category_id || null, slot.sponsor_id, position]);

    assigned.push({ bookingId, slotId: slot.id, sponsorName: slot.sponsor_name, categoryName: slot.category_name, position });
  }

  return res.json({
    success: true,
    data: { assigned, skipped, message: `${assigned.length} Platzierung(en) automatisch zugeordnet, ${skipped.length} übersprungen` },
  });
});

// ============================================================
// KONFLIKT-PRÜFUNG – Prüfe ob ein Slot für einen Zeitraum Konflikte hat
// ============================================================
router.get('/check-conflicts', requirePermission('canViewSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { slotId, from, to, categoryId, isExclusive } = req.query as any;

  const conflicts: any[] = [];

  if (from && to && isExclusive === 'true' && categoryId) {
    // Episoden im Zeitraum finden
    const episodes = db.all(`
      SELECT e.id, e.title, e.number, e.publish_date
      FROM episodes e
      WHERE e.publish_date BETWEEN ? AND ?
      ORDER BY e.publish_date ASC
    `, [from, to]) as any[];

    for (const ep of episodes) {
      const existingExclusive = db.all(`
        SELECT b.id, sp.name as sponsor_name, c.name as category_name
        FROM episode_ad_bookings b
        JOIN sponsors sp ON b.sponsor_id = sp.id
        LEFT JOIN ad_categories c ON b.ad_category_id = c.id
        WHERE b.episode_id = ? AND b.ad_category_id = ?
        ${slotId ? 'AND b.ad_slot_id != ?' : ''}
      `, slotId ? [ep.id, categoryId, slotId] : [ep.id, categoryId]) as any[];

      if (existingExclusive.length > 0) {
        conflicts.push({
          episodeId: ep.id,
          episodeTitle: ep.title,
          episodeNumber: ep.number,
          date: ep.publish_date,
          conflictingBookings: existingExclusive,
        });
      }
    }
  }

  return res.json({ success: true, data: { conflicts, hasConflicts: conflicts.length > 0 } });
});

// ============================================================
// TKP-BERECHNUNG – Dynamische Preisberechnung für eine Buchung
// ============================================================
router.post('/calculate-price', requirePermission('canViewSponsors') as any, (req: AuthRequest, res: Response) => {
  const { basePrice = 0, pricePerEpisode = 0, pricePer1000Listens = 0, episodeCount = 1, totalListens = 0, priceModel = 'fixed' } = req.body;

  let episodeTotal = 0;
  let tkpTotal = 0;
  let total = 0;

  if (priceModel === 'fixed') {
    total = Number(basePrice);
  } else if (priceModel === 'per_episode') {
    episodeTotal = Number(pricePerEpisode) * Number(episodeCount);
    total = Number(basePrice) + episodeTotal;
  } else if (priceModel === 'per_1000') {
    tkpTotal = (Number(totalListens) / 1000) * Number(pricePer1000Listens);
    episodeTotal = Number(pricePerEpisode) * Number(episodeCount);
    total = Number(basePrice) + episodeTotal + tkpTotal;
  } else if (priceModel === 'combined') {
    episodeTotal = Number(pricePerEpisode) * Number(episodeCount);
    tkpTotal = (Number(totalListens) / 1000) * Number(pricePer1000Listens);
    total = Number(basePrice) + episodeTotal + tkpTotal;
  }

  return res.json({
    success: true,
    data: {
      basePrice: Number(basePrice),
      episodeTotal,
      tkpTotal,
      total,
      breakdown: {
        basispreis: Number(basePrice),
        folgenpreis: episodeTotal,
        tkpGebuehr: tkpTotal,
        gesamt: total,
      },
    },
  });
});

export default router;
