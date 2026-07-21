import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, DATA_DIR } from '../database';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';
import {
  getDefaultLayoutForType,
  getLayoutById,
  renderPdfFooter,
  renderPdfHeader,
  normalizePdfText,
  preparePdfDocument,
  renderSectionHeading,
  renderWatermark,
} from '../pdfLayouts';
import * as fs from 'fs';
import * as path from 'path';

export const seasonsRouter: import('express').Router = Router();
seasonsRouter.use(requireAuth as any);

const ALLOWED_LANES = new Set(['lineup', 'alternative']);
const ALLOWED_STATUSES = new Set(['kandidat', 'vorgemerkt', 'bestaetigt', 'in_produktion', 'fertig', 'zurueckgestellt']);
const ALLOWED_PRIORITIES = new Set(['niedrig', 'mittel', 'hoch', 'dringend']);
const ALLOWED_CONFIRMATIONS = new Set(['offen', 'angefragt', 'zugesagt', 'abgesagt']);

function cleanText(value: unknown, max = 5000): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function cleanStringArray(value: unknown, maxItems = 30, maxLength = 160): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => cleanText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function parseJsonArray(value: unknown): string[] {
  try {
    const parsed = JSON.parse(typeof value === 'string' ? value : '[]');
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : [];
  } catch (_) {
    return [];
  }
}

function hasPermission(req: AuthRequest, permission: string): boolean {
  return req.user?.role === 'admin' || Boolean(req.user?.permissions?.[permission]);
}

function planPermissionsError(res: Response): Response {
  return res.status(403).json({ success: false, error: 'Keine Berechtigung für die strategische Staffelplanung' });
}

function toPlanItem(db: any, row: any): any {
  const partners = db.all(
    `SELECT id, partner_id, display_name, role_label, confirmation_status, sort_order
     FROM season_plan_item_partners
     WHERE plan_item_id = ?
     ORDER BY sort_order ASC, created_at ASC`,
    [row.id]
  ) as any[];

  return {
    id: row.id,
    seasonId: row.season_id,
    position: row.position,
    lane: row.lane,
    title: row.title,
    summary: row.summary || '',
    topics: parseJsonArray(row.topics),
    episodeFormat: row.episode_format || 'offen',
    focusPoints: parseJsonArray(row.focus_points),
    status: row.status,
    priority: row.priority,
    plannedDate: row.planned_date || null,
    episodeNumber: row.episode_number == null ? null : Number(row.episode_number),
    ideaId: row.idea_id || null,
    episodeId: row.episode_id || null,
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    partners: partners.map(partner => ({
      id: partner.id,
      partnerId: partner.partner_id || null,
      displayName: partner.display_name,
      roleLabel: partner.role_label || '',
      confirmationStatus: partner.confirmation_status || 'offen',
      sortOrder: Number(partner.sort_order || 0),
    })),
  };
}

function replacePlanPartners(db: any, itemId: string, input: unknown): void {
  if (!Array.isArray(input)) return;
  db.run('DELETE FROM season_plan_item_partners WHERE plan_item_id = ?', [itemId]);
  input.slice(0, 20).forEach((raw: any, index: number) => {
    const displayName = cleanText(raw?.displayName, 200);
    if (!displayName) return;
    const partnerId = cleanText(raw?.partnerId, 80) || null;
    const confirmationStatus = ALLOWED_CONFIRMATIONS.has(raw?.confirmationStatus) ? raw.confirmationStatus : 'offen';
    db.run(
      `INSERT INTO season_plan_item_partners
       (id, plan_item_id, partner_id, display_name, role_label, confirmation_status, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), itemId, partnerId, displayName, cleanText(raw?.roleLabel, 200) || null, confirmationStatus, index]
    );
  });
}

function getBranding(db: any): { podcastName: string; logoPath: string | null } {
  const settingsRow = db.get("SELECT value FROM settings WHERE key = 'app'") as any;
  let settings: any = {};
  try { settings = settingsRow?.value ? JSON.parse(settingsRow.value) : {}; } catch (_) { settings = {}; }
  const podcastName = settings?.branding?.podcastName || settings?.general?.podcastName || 'PodCore';
  const brandingDir = path.join(DATA_DIR, 'branding');
  let logoPath: string | null = null;
  if (fs.existsSync(brandingDir)) {
    const logoFile = fs.readdirSync(brandingDir).find(file => file.startsWith('logo.'));
    if (logoFile) logoPath = path.join(brandingDir, logoFile);
  }
  return { podcastName, logoPath };
}

function buildPlanNotes(item: any, partners: any[]): string {
  const lines = [
    '## Strategische Staffelplanung',
    `**Staffelposition:** ${item.position || 'Alternative'} (${item.lane === 'lineup' ? 'Line-up' : 'Alternative'})`,
    `**Status:** ${item.status}`,
    `**Priorität:** ${item.priority}`,
    `**Format:** ${item.episode_format || 'offen'}`,
  ];
  const topics = parseJsonArray(item.topics);
  const focusPoints = parseJsonArray(item.focus_points);
  if (topics.length) lines.push(`**Themen:** ${topics.join(', ')}`);
  if (focusPoints.length) lines.push(`**Schwerpunkte:** ${focusPoints.join(', ')}`);
  if (partners.length) lines.push(`**Interviewpartner:** ${partners.map(partner => `${partner.displayName}${partner.roleLabel ? ` (${partner.roleLabel})` : ''}`).join(', ')}`);
  if (item.notes) lines.push(`\n${item.notes}`);
  return lines.join('\n');
}

function createOrLinkPartners(db: any, ideaId: string, partners: any[]): void {
  for (const partner of partners) {
    let partnerId = partner.partnerId || null;
    if (partnerId) {
      const existing = db.get('SELECT id FROM interview_partners WHERE id = ?', [partnerId]) as any;
      if (!existing) partnerId = null;
    }
    if (!partnerId) {
      partnerId = uuidv4();
      db.run(
        `INSERT INTO interview_partners (id, name, role, notes)
         VALUES (?, ?, ?, ?)`,
        [partnerId, partner.displayName, partner.roleLabel || null, 'Aus strategischer Staffelplanung übernommen.']
      );
    }
    const link = db.get('SELECT 1 FROM idea_interview_partners WHERE idea_id = ? AND partner_id = ?', [ideaId, partnerId]) as any;
    if (!link) db.run('INSERT INTO idea_interview_partners (idea_id, partner_id) VALUES (?, ?)', [ideaId, partnerId]);
  }
}

// ─── Bestehende Staffelverwaltung ────────────────────────────────────────────

seasonsRouter.get('/', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const seasons = db.all(`
      SELECT s.*,
        COUNT(DISTINCT e.id) AS episode_count,
        COUNT(DISTINCT CASE WHEN spi.lane = 'lineup' THEN spi.id END) AS planned_episode_count,
        COUNT(DISTINCT CASE WHEN spi.lane = 'alternative' THEN spi.id END) AS alternative_count
      FROM seasons s
      LEFT JOIN episodes e ON e.season_id = s.id AND e.is_archived = 0
      LEFT JOIN season_plan_items spi ON spi.season_id = s.id
      GROUP BY s.id
      ORDER BY s.number ASC
    `) as any[];

    return res.json({
      success: true,
      data: seasons.map(season => ({
        ...season,
        episode_count: Number(season.episode_count || 0),
        planned_episode_count: Number(season.planned_episode_count || 0),
        alternative_count: Number(season.alternative_count || 0),
        target_episode_count: season.target_episode_count == null ? null : Number(season.target_episode_count),
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

seasonsRouter.get('/:id', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const season = db.get('SELECT * FROM seasons WHERE id = ?', [req.params.id]) as any;
    if (!season) return res.status(404).json({ success: false, error: 'Staffel nicht gefunden' });
    const episodes = db.all(`
      SELECT id, number, title, status, publish_date, duration, tags
      FROM episodes
      WHERE season_id = ? AND is_archived = 0
      ORDER BY number ASC, created_at ASC
    `, [req.params.id]) as any[];
    return res.json({ success: true, data: { ...season, episodes } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

seasonsRouter.post('/', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const number = Number(req.body?.number);
    const title = cleanText(req.body?.title, 240);
    if (!title || !Number.isInteger(number) || number < 0) {
      return res.status(400).json({ success: false, error: 'Nummer und Titel sind erforderlich. Die Nummer muss >= 0 sein.' });
    }
    const existing = db.get('SELECT id FROM seasons WHERE number = ?', [number]) as any;
    if (existing) return res.status(400).json({ success: false, error: `Staffel ${number === 0 ? 'Spezial' : number} existiert bereits` });
    const id = uuidv4();
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO seasons (id, number, title, description, start_date, end_date, status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        number,
        title,
        cleanText(req.body?.description, 5000) || null,
        cleanText(req.body?.start_date, 30) || null,
        cleanText(req.body?.end_date, 30) || null,
        cleanText(req.body?.status, 40) || 'aktiv',
        req.user!.id,
        now,
        now,
      ]
    );
    return res.status(201).json({ success: true, data: db.get('SELECT * FROM seasons WHERE id = ?', [id]) });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

seasonsRouter.put('/:id', (req: AuthRequest, res: Response, next: any) => {
  if (req.params.id === 'plan-items') return next();
  try {
    const db = getDb();
    const season = db.get('SELECT * FROM seasons WHERE id = ?', [req.params.id]) as any;
    if (!season) return res.status(404).json({ success: false, error: 'Staffel nicht gefunden' });

    const changesPlanning = Object.prototype.hasOwnProperty.call(req.body || {}, 'targetEpisodeCount')
      || Object.prototype.hasOwnProperty.call(req.body || {}, 'planningNotes');
    if (changesPlanning && !hasPermission(req, 'canEditSeasonPlanning')) return planPermissionsError(res);

    const targetEpisodeCount = req.body?.targetEpisodeCount === undefined
      ? season.target_episode_count
      : (req.body.targetEpisodeCount === null || req.body.targetEpisodeCount === '' ? null : Math.max(0, Math.min(999, Number(req.body.targetEpisodeCount) || 0)));
    const planningNotes = req.body?.planningNotes === undefined
      ? season.planning_notes
      : (cleanText(req.body.planningNotes, 12000) || null);
    const now = new Date().toISOString();
    db.run(
      `UPDATE seasons
       SET number = ?, title = ?, description = ?, start_date = ?, end_date = ?, status = ?,
           target_episode_count = ?, planning_notes = ?, updated_at = ?
       WHERE id = ?`,
      [
        req.body?.number ?? season.number,
        req.body?.title === undefined ? season.title : cleanText(req.body.title, 240),
        req.body?.description === undefined ? season.description : cleanText(req.body.description, 5000) || null,
        req.body?.start_date === undefined ? season.start_date : cleanText(req.body.start_date, 30) || null,
        req.body?.end_date === undefined ? season.end_date : cleanText(req.body.end_date, 30) || null,
        req.body?.status ?? season.status,
        targetEpisodeCount,
        planningNotes,
        now,
        req.params.id,
      ]
    );
    return res.json({ success: true, data: db.get('SELECT * FROM seasons WHERE id = ?', [req.params.id]) });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

seasonsRouter.delete('/:id', (req: AuthRequest, res: Response, next: any) => {
  if (req.params.id === 'plan-items') return next();
  try {
    const db = getDb();
    const season = db.get('SELECT * FROM seasons WHERE id = ?', [req.params.id]) as any;
    if (!season) return res.status(404).json({ success: false, error: 'Staffel nicht gefunden' });
    db.exec('BEGIN IMMEDIATE');
    db.run('UPDATE episodes SET season_id = NULL, season_plan_item_id = NULL WHERE season_id = ?', [req.params.id]);
    db.run('DELETE FROM season_plan_item_partners WHERE plan_item_id IN (SELECT id FROM season_plan_items WHERE season_id = ?)', [req.params.id]);
    db.run('DELETE FROM season_plan_items WHERE season_id = ?', [req.params.id]);
    db.run('DELETE FROM seasons WHERE id = ?', [req.params.id]);
    db.exec('COMMIT');
    return res.json({ success: true });
  } catch (err: any) {
    try { getDb().exec('ROLLBACK'); } catch (_) {}
    return res.status(500).json({ success: false, error: err.message });
  }
});

seasonsRouter.post('/:id/episodes', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const season = db.get('SELECT id FROM seasons WHERE id = ?', [req.params.id]) as any;
    if (!season) return res.status(404).json({ success: false, error: 'Staffel nicht gefunden' });
    if (!Array.isArray(req.body?.episodeIds)) return res.status(400).json({ success: false, error: 'episodeIds muss ein Array sein' });
    const ids = cleanStringArray(req.body.episodeIds, 500, 80);
    const now = new Date().toISOString();
    ids.forEach(id => db.run('UPDATE episodes SET season_id = ?, updated_at = ? WHERE id = ?', [req.params.id, now, id]));
    return res.json({ success: true, message: `${ids.length} Folge(n) der Staffel zugewiesen` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

seasonsRouter.delete('/:id/episodes/:episodeId', (req: AuthRequest, res: Response) => {
  try {
    getDb().run(
      'UPDATE episodes SET season_id = NULL, updated_at = ? WHERE id = ? AND season_id = ?',
      [new Date().toISOString(), req.params.episodeId, req.params.id]
    );
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Strategische Staffelplanung ─────────────────────────────────────────────

seasonsRouter.get('/:id/plan-items', requirePermission('canViewSeasonPlanning') as any, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const season = db.get('SELECT * FROM seasons WHERE id = ?', [req.params.id]) as any;
    if (!season) return res.status(404).json({ success: false, error: 'Staffel nicht gefunden' });
    const rows = db.all(
      `SELECT * FROM season_plan_items
       WHERE season_id = ?
       ORDER BY CASE lane WHEN 'lineup' THEN 0 ELSE 1 END, COALESCE(position, 999999), created_at ASC`,
      [req.params.id]
    ) as any[];
    return res.json({
      success: true,
      data: {
        season: {
          ...season,
          targetEpisodeCount: season.target_episode_count == null ? null : Number(season.target_episode_count),
          planningNotes: season.planning_notes || '',
        },
        items: rows.map(row => toPlanItem(db, row)),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

seasonsRouter.post('/:id/plan-items', requirePermission('canEditSeasonPlanning') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const season = db.get('SELECT id FROM seasons WHERE id = ?', [req.params.id]) as any;
  if (!season) return res.status(404).json({ success: false, error: 'Staffel nicht gefunden' });
  const title = cleanText(req.body?.title, 240);
  if (!title) return res.status(400).json({ success: false, error: 'Arbeitstitel erforderlich' });
  const lane = ALLOWED_LANES.has(req.body?.lane) ? req.body.lane : 'lineup';
  const status = ALLOWED_STATUSES.has(req.body?.status) ? req.body.status : 'kandidat';
  const priority = ALLOWED_PRIORITIES.has(req.body?.priority) ? req.body.priority : 'mittel';
  const configuredPosition = Number(req.body?.position);
  const row = db.get(
    'SELECT COALESCE(MAX(position), 0) + 1 AS next_position FROM season_plan_items WHERE season_id = ? AND lane = ?',
    [req.params.id, lane]
  ) as any;
  const position = Number.isInteger(configuredPosition) && configuredPosition > 0 ? configuredPosition : Number(row?.next_position || 1);
  const rawEpisodeNumber = req.body?.episodeNumber;
  const episodeNumber = rawEpisodeNumber === undefined || rawEpisodeNumber === null || rawEpisodeNumber === '' ? null : Number(rawEpisodeNumber);
  if (episodeNumber !== null && (!Number.isInteger(episodeNumber) || episodeNumber < 0 || episodeNumber > 999999)) {
    return res.status(400).json({ success: false, error: 'Die Folgennummer muss eine ganze Zahl ab 0 sein' });
  }
  const id = uuidv4();
  try {
    db.exec('BEGIN IMMEDIATE');
    db.run(
      `INSERT INTO season_plan_items
       (id, season_id, position, lane, title, summary, topics, episode_format, focus_points, status, priority, planned_date, episode_number, idea_id, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, req.params.id, position, lane, title,
        cleanText(req.body?.summary, 6000) || null,
        JSON.stringify(cleanStringArray(req.body?.topics)),
        cleanText(req.body?.episodeFormat, 120) || 'offen',
        JSON.stringify(cleanStringArray(req.body?.focusPoints, 40, 300)),
        status, priority, cleanText(req.body?.plannedDate, 30) || null,
        episodeNumber,
        cleanText(req.body?.ideaId, 80) || null,
        cleanText(req.body?.notes, 10000) || null,
        req.user!.id,
      ]
    );
    replacePlanPartners(db, id, req.body?.partners || []);
    db.exec('COMMIT');
    return res.status(201).json({ success: true, data: toPlanItem(db, db.get('SELECT * FROM season_plan_items WHERE id = ?', [id])) });
  } catch (err: any) {
    try { db.exec('ROLLBACK'); } catch (_) {}
    return res.status(500).json({ success: false, error: err.message });
  }
});

seasonsRouter.put('/plan-items/:itemId', requirePermission('canEditSeasonPlanning') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const current = db.get('SELECT * FROM season_plan_items WHERE id = ?', [req.params.itemId]) as any;
  if (!current) return res.status(404).json({ success: false, error: 'Planposition nicht gefunden' });
  const title = req.body?.title === undefined ? current.title : cleanText(req.body.title, 240);
  if (!title) return res.status(400).json({ success: false, error: 'Arbeitstitel erforderlich' });
  const lane = ALLOWED_LANES.has(req.body?.lane) ? req.body.lane : current.lane;
  const status = ALLOWED_STATUSES.has(req.body?.status) ? req.body.status : current.status;
  const priority = ALLOWED_PRIORITIES.has(req.body?.priority) ? req.body.priority : current.priority;
  const configuredPosition = Number(req.body?.position);
  const position = Number.isInteger(configuredPosition) && configuredPosition > 0 ? configuredPosition : current.position;
  const rawEpisodeNumber = req.body?.episodeNumber;
  const episodeNumber = rawEpisodeNumber === undefined || rawEpisodeNumber === null || rawEpisodeNumber === '' ? null : Number(rawEpisodeNumber);
  if (rawEpisodeNumber !== undefined && episodeNumber !== null && (!Number.isInteger(episodeNumber) || episodeNumber < 0 || episodeNumber > 999999)) {
    return res.status(400).json({ success: false, error: 'Die Folgennummer muss eine ganze Zahl ab 0 sein' });
  }
  try {
    db.exec('BEGIN IMMEDIATE');
    db.run(
      `UPDATE season_plan_items
       SET position = ?, lane = ?, title = ?, summary = ?, topics = ?, episode_format = ?,
           focus_points = ?, status = ?, priority = ?, planned_date = ?, episode_number = ?, idea_id = ?, notes = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [
        position, lane, title,
        req.body?.summary === undefined ? current.summary : cleanText(req.body.summary, 6000) || null,
        req.body?.topics === undefined ? current.topics : JSON.stringify(cleanStringArray(req.body.topics)),
        req.body?.episodeFormat === undefined ? current.episode_format : cleanText(req.body.episodeFormat, 120) || 'offen',
        req.body?.focusPoints === undefined ? current.focus_points : JSON.stringify(cleanStringArray(req.body.focusPoints, 40, 300)),
        status, priority,
        req.body?.plannedDate === undefined ? current.planned_date : cleanText(req.body.plannedDate, 30) || null,
        req.body?.episodeNumber === undefined ? current.episode_number : episodeNumber,
        req.body?.ideaId === undefined ? current.idea_id : cleanText(req.body.ideaId, 80) || null,
        req.body?.notes === undefined ? current.notes : cleanText(req.body.notes, 10000) || null,
        req.params.itemId,
      ]
    );
    if (req.body?.partners !== undefined) replacePlanPartners(db, req.params.itemId, req.body.partners);
    db.exec('COMMIT');
    return res.json({ success: true, data: toPlanItem(db, db.get('SELECT * FROM season_plan_items WHERE id = ?', [req.params.itemId])) });
  } catch (err: any) {
    try { db.exec('ROLLBACK'); } catch (_) {}
    return res.status(500).json({ success: false, error: err.message });
  }
});

seasonsRouter.post('/:id/plan-items/reorder', requirePermission('canEditSeasonPlanning') as any, (req: AuthRequest, res: Response) => {
  if (!Array.isArray(req.body?.items)) return res.status(400).json({ success: false, error: 'items muss ein Array sein' });
  const db = getDb();
  const items = req.body.items.slice(0, 300);
  try {
    db.exec('BEGIN IMMEDIATE');
    const positions: Record<string, number> = { lineup: 0, alternative: 0 };
    items.forEach((candidate: any) => {
      const id = cleanText(candidate?.id, 80);
      const lane = ALLOWED_LANES.has(candidate?.lane) ? candidate.lane : 'lineup';
      if (!id) return;
      positions[lane] += 1;
      db.run(
        `UPDATE season_plan_items SET lane = ?, position = ?, updated_at = datetime('now')
         WHERE id = ? AND season_id = ?`,
        [lane, positions[lane], id, req.params.id]
      );
    });
    db.exec('COMMIT');
    return res.json({ success: true, message: 'Reihenfolge gespeichert' });
  } catch (err: any) {
    try { db.exec('ROLLBACK'); } catch (_) {}
    return res.status(500).json({ success: false, error: err.message });
  }
});

seasonsRouter.delete('/plan-items/:itemId', requirePermission('canEditSeasonPlanning') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const item = db.get('SELECT * FROM season_plan_items WHERE id = ?', [req.params.itemId]) as any;
  if (!item) return res.status(404).json({ success: false, error: 'Planposition nicht gefunden' });
  if (item.episode_id) {
    const linkedEpisode = db.get('SELECT id FROM episodes WHERE id = ?', [item.episode_id]) as any;
    if (linkedEpisode) {
      return res.status(409).json({ success: false, error: 'Die Position ist bereits mit einer Episode verbunden und kann nur zurückgestellt werden' });
    }
  }
  try {
    db.exec('BEGIN IMMEDIATE');
    db.run('DELETE FROM season_plan_item_partners WHERE plan_item_id = ?', [req.params.itemId]);
    db.run('DELETE FROM season_plan_items WHERE id = ?', [req.params.itemId]);
    db.exec('COMMIT');
    return res.json({ success: true });
  } catch (err: any) {
    try { db.exec('ROLLBACK'); } catch (_) {}
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Übergang zum Episoden-Editor ────────────────────────────────────────────

seasonsRouter.post('/plan-items/:itemId/continue', requirePermission('canTransitionSeasonPlanningToEpisode') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const initial = db.get('SELECT * FROM season_plan_items WHERE id = ?', [req.params.itemId]) as any;
  if (!initial) return res.status(404).json({ success: false, error: 'Planposition nicht gefunden' });

  if (initial.episode_id) {
    const episode = db.get('SELECT id, idea_id FROM episodes WHERE id = ?', [initial.episode_id]) as any;
    if (episode) return res.json({ success: true, data: { episodeId: episode.id, ideaId: episode.idea_id || initial.idea_id || null, existing: true, stage: 'episode' } });
  }

  try {
    db.exec('BEGIN IMMEDIATE');
    const item = db.get('SELECT * FROM season_plan_items WHERE id = ?', [req.params.itemId]) as any;
    const season = item ? db.get('SELECT * FROM seasons WHERE id = ?', [item.season_id]) as any : null;
    if (!item || !season) throw new Error('Planposition oder Staffel nicht gefunden');

    let ideaId = item.idea_id || null;
    let createdIdea = false;
    const topics = parseJsonArray(item.topics);
    if (ideaId) {
      const existingIdea = db.get('SELECT id FROM ideas WHERE id = ?', [ideaId]) as any;
      if (!existingIdea) ideaId = null;
    }

    const partners = toPlanItem(db, item).partners;
    if (!ideaId) {
      ideaId = uuidv4();
      createdIdea = true;
      db.run(
        `INSERT INTO ideas (id, title, description, status, priority, tags, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [ideaId, item.title, item.summary || null, 'in_bearbeitung', item.priority || 'mittel', JSON.stringify(topics), req.user!.id]
      );
      const planningNote = buildPlanNotes(item, partners);
      if (planningNote) {
        db.run(
          'INSERT INTO idea_notes (id, idea_id, content, created_by) VALUES (?, ?, ?, ?)',
          [uuidv4(), ideaId, planningNote, req.user!.id]
        );
      }
      db.run(
        `UPDATE season_plan_items
         SET idea_id = ?, status = CASE WHEN status = 'kandidat' THEN 'vorgemerkt' ELSE status END, updated_at = datetime('now')
         WHERE id = ?`,
        [ideaId, item.id]
      );
    }

    createOrLinkPartners(db, ideaId, partners);
    const linkedIdea = db.get('SELECT id, episode_id FROM ideas WHERE id = ?', [ideaId]) as any;
    if (linkedIdea?.episode_id) {
      db.run(
        `UPDATE season_plan_items SET episode_id = ?, status = 'in_produktion', updated_at = datetime('now') WHERE id = ?`,
        [linkedIdea.episode_id, item.id]
      );
      db.exec('COMMIT');
      return res.json({ success: true, data: { episodeId: linkedIdea.episode_id, ideaId, existing: true, stage: 'episode' } });
    }

    db.exec('COMMIT');
    return res.status(createdIdea ? 201 : 200).json({ success: true, data: { episodeId: null, ideaId, existing: !createdIdea, stage: 'idea' } });
  } catch (err: any) {
    try { db.exec('ROLLBACK'); } catch (_) {}
    console.error('Fehler beim Vorbereiten der Ideenmappe aus der Staffelplanung:', err);
    return res.status(500).json({ success: false, error: err.message || 'Die Ideenmappe konnte nicht vorbereitet werden' });
  }
});

// ─── PDF-Export ──────────────────────────────────────────────────────────────

seasonsRouter.post('/:id/plan-items/pdf', requirePermission('canExportSeasonPlanning') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const season = db.get('SELECT * FROM seasons WHERE id = ?', [req.params.id]) as any;
  if (!season) return res.status(404).json({ success: false, error: 'Staffel nicht gefunden' });

  try {
    const requestedLayoutId = cleanText(req.body?.layoutId, 80);
    const layout = requestedLayoutId ? getLayoutById(requestedLayoutId) : getDefaultLayoutForType('season_planning');
    if (!layout) return res.status(400).json({ success: false, error: 'PDF-Layout nicht gefunden' });
    const documentTitle = normalizePdfText(cleanText(req.body?.documentTitle, 200) || `Strategische Staffelplanung – Staffel ${season.number}`);
    const selectedItems = cleanStringArray(req.body?.selectedItems, 500, 80);
    const params: any[] = [req.params.id];
    let itemFilter = '';
    if (selectedItems.length) {
      itemFilter = ` AND id IN (${selectedItems.map(() => '?').join(', ')})`;
      params.push(...selectedItems);
    }
    const rows = db.all(
      `SELECT * FROM season_plan_items WHERE season_id = ?${itemFilter}
       ORDER BY CASE lane WHEN 'lineup' THEN 0 ELSE 1 END, COALESCE(position, 999999), created_at ASC`,
      params
    ) as any[];
    const items = rows.map(row => toPlanItem(db, row));
    const { podcastName, logoPath } = getBranding(db);
    const PDFDocument = require('pdfkit');
    const margin = Math.max(30, Number(layout.pageMargin) || 50);
    const doc = new PDFDocument({
      margin,
      size: layout.pageSize || 'A4',
      layout: layout.pageOrientation === 'landscape' ? 'landscape' : 'portrait',
      bufferPages: true,
      autoFirstPage: true,
    });
    preparePdfDocument(doc);
    // Erst nach erfolgreichem Rendering antworten: Ein Layoutfehler kann dadurch
    // keinen zweiten Schreibvorgang auf eine bereits geschlossene Response auslösen.
    const pdfChunks: Buffer[] = [];
    let exportFailed = false;
    doc.on('data', (chunk: Buffer) => pdfChunks.push(Buffer.from(chunk)));
    doc.on('error', (error: Error) => {
      exportFailed = true;
      console.error('Fehler im PDF-Dokument der Staffelplanung:', error);
      if (!res.headersSent) res.status(500).json({ success: false, error: 'PDF-Export fehlgeschlagen' });
    });
    const safeName = documentTitle.replace(/[^a-zA-Z0-9äöüÄÖÜß_-]+/g, '-').replace(/^-+|-+$/g, '') || 'Strategische-Staffelplanung';
    doc.on('end', () => {
      if (exportFailed || res.headersSent) return;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);
      res.send(Buffer.concat(pdfChunks));
    });

    const contentWidth = doc.page.width - margin * 2;
    const fontFamily = layout.typography.fontFamily || 'Helvetica';
    const bodySize = layout.typography.bodySize || 10;
    const headingSize = layout.typography.headingSize || 11;
    const bodyAlignment = layout.typography.bodyAlignment === 'justify' ? 'justify' : 'left';
    const headingStyle = layout.typography.headingStyle || 'accent';
    const titleColor = layout.colors.primary || '#18233f';
    const accentColor = layout.colors.accent || '#0ea5a6';
    const secondaryColor = layout.colors.secondary || '#2563eb';
    const textColor = layout.colors.text || '#172033';
    const mutedColor = layout.colors.muted || '#64748b';
    const cardFill = '#f7fafc';
    const cardBorder = '#dbe5ef';
    const displayValue = (value: unknown) => normalizePdfText(value || '–')
      .replace(/_/g, ' ')
      // JavaScripts \b kennt keine vollständigen Unicode-Wörter. Das führte bei
      // „gespräch“ fälschlich zu „GesprÄch“. Nur echte Wortanfänge werden formatiert.
      .replace(/(^|[\s/])([\p{L}])/gu, (_match, prefix, char) => `${prefix}${char.toLocaleUpperCase('de-DE')}`);

    const renderHeader = () => {
      renderPdfHeader(doc, layout, { podcastName, documentTitle, logoPath });
      renderWatermark(doc, layout);
    };
    const renderSeasonSummary = () => {
      const cardY = doc.y;
      const plannedCount = items.filter(item => item.lane === 'lineup').length;
      const alternativeCount = items.filter(item => item.lane === 'alternative').length;
      doc.save();
      doc.roundedRect(margin, cardY, contentWidth, 46, 8).fillColor('#f1f5f9').fill();
      doc.roundedRect(margin, cardY, 5, 46, 3).fillColor(accentColor).fill();
      doc.font(`${fontFamily}-Bold`).fontSize(layout.typography.smallSize || 8).fillColor(secondaryColor)
        .text('STAFFEL-ÜBERSICHT', margin + 17, cardY + 9);
      doc.font(fontFamily).fontSize(layout.typography.smallSize || 8).fillColor(mutedColor)
        .text(`Staffel ${season.number}: ${normalizePdfText(season.title)}`, margin + 17, cardY + 23, { width: contentWidth - 34, align: bodyAlignment });
      doc.font(`${fontFamily}-Bold`).fontSize(10).fillColor(titleColor)
        .text(`${plannedCount} geplant`, margin + contentWidth - 185, cardY + 12, { width: 70, align: 'right' })
        .text(`${alternativeCount} alternativ`, margin + contentWidth - 100, cardY + 12, { width: 86, align: 'right' });
      doc.restore();
      doc.y = cardY + 58;
    };
    const renderLaneHeading = (label: string) => {
      const headingY = doc.y;
      const safeLabel = normalizePdfText(label);
      if (headingStyle === 'boxed') {
        const headingHeight = Math.max(24, headingSize + 12);
        doc.roundedRect(margin, headingY, contentWidth, headingHeight, 4).fillColor(titleColor).fill();
        doc.font(`${fontFamily}-Bold`).fontSize(headingSize).fillColor(layout.colors.headerText || '#ffffff')
          .text(safeLabel, margin + 9, headingY + 6, { width: contentWidth - 18 });
        doc.y = headingY + headingHeight + 8;
        return;
      }
      doc.font(`${fontFamily}-Bold`).fontSize(headingSize).fillColor(titleColor).text(safeLabel, margin, headingY, { width: contentWidth });
      if (headingStyle !== 'minimal') {
        doc.moveTo(margin, headingY + 18).lineTo(margin + contentWidth, headingY + 18).strokeColor(accentColor).lineWidth(1).stroke();
      }
      doc.y = headingY + (headingStyle === 'minimal' ? 23 : 29);
    };

    renderHeader();
    renderSeasonSummary();
    if (season.planning_notes) {
      const safePlanningNotes = normalizePdfText(season.planning_notes);
      const noteHeight = Math.max(54, doc.heightOfString(safePlanningNotes, { width: contentWidth - 32, align: bodyAlignment }) + 32);
      const noteY = doc.y;
      doc.roundedRect(margin, noteY, contentWidth, noteHeight, 8).fillColor('#ffffff').fill();
      doc.roundedRect(margin, noteY, contentWidth, noteHeight, 8).strokeColor(cardBorder).lineWidth(0.7).stroke();
      doc.font(`${fontFamily}-Bold`).fontSize(layout.typography.smallSize || 8).fillColor(secondaryColor)
        .text('STAFFELZIEL & LEITGEDANKEN', margin + 16, noteY + 11);
      doc.font(fontFamily).fontSize(bodySize).fillColor(textColor)
        .text(safePlanningNotes, margin + 16, noteY + 25, { width: contentWidth - 32, align: bodyAlignment });
      doc.y = noteY + noteHeight + 14;
    }

    let activeLane = '';
    const bottomLimit = doc.page.height - margin - 44;
    const ensureSpace = (height: number) => {
      if (doc.y + height > bottomLimit) {
        doc.addPage();
        renderHeader();
      }
    };
    for (const item of items) {
      const laneLabel = item.lane === 'lineup' ? 'Geplante Reihenfolge' : 'Alternativen und Überhang';
      const headline = `${item.lane === 'lineup' ? `${item.position || '–'}.` : 'Alternative'}${item.episodeNumber != null ? `  ·  Folge ${item.episodeNumber}` : ''}  ${normalizePdfText(item.title)}`;
      const detailLines = [
        `Status: ${displayValue(item.status)}  ·  Priorität: ${displayValue(item.priority)}  ·  Format: ${displayValue(item.episodeFormat)}`,
        item.plannedDate ? `Geplant: ${item.plannedDate}` : '',
        item.summary ? `Zusammenfassung: ${normalizePdfText(item.summary)}` : '',
        item.topics.length ? `Themen: ${item.topics.map(normalizePdfText).join(', ')}` : '',
        item.focusPoints.length ? `Schwerpunkte: ${item.focusPoints.map(normalizePdfText).join(', ')}` : '',
        item.partners.length ? `Interview-Partner: ${item.partners.map((partner: any) => `${normalizePdfText(partner.displayName)}${partner.roleLabel ? ` (${normalizePdfText(partner.roleLabel)})` : ''}`).join(', ')}` : '',
        item.notes ? `Notizen: ${normalizePdfText(item.notes)}` : '',
      ].filter(Boolean).join('\n');
      const titleHeight = doc.font(`${fontFamily}-Bold`).fontSize(headingSize + 1).heightOfString(headline, { width: contentWidth - 42 });
      const bodyHeight = doc.font(fontFamily).fontSize(bodySize).heightOfString(detailLines || ' ', { width: contentWidth - 42, align: bodyAlignment });
      const cardHeight = Math.max(78, 31 + titleHeight + bodyHeight + 13);
      const laneHeight = laneLabel !== activeLane ? 35 : 0;
      ensureSpace(cardHeight + laneHeight + 9);
      if (laneLabel !== activeLane) {
        renderLaneHeading(laneLabel);
        activeLane = laneLabel;
      }

      const cardY = doc.y;
      doc.roundedRect(margin, cardY, contentWidth, cardHeight, 8).fillColor(cardFill).fill();
      doc.roundedRect(margin, cardY, contentWidth, cardHeight, 8).strokeColor(cardBorder).lineWidth(0.7).stroke();
      doc.roundedRect(margin, cardY, 5, cardHeight, 3).fillColor(item.lane === 'lineup' ? secondaryColor : accentColor).fill();
      doc.font(`${fontFamily}-Bold`).fontSize(headingSize + 1).fillColor(titleColor)
        .text(headline, margin + 18, cardY + 12, { width: contentWidth - 36 });
      doc.font(fontFamily).fontSize(bodySize).fillColor(textColor)
        .text(detailLines, margin + 18, cardY + 14 + titleHeight, { width: contentWidth - 36, align: bodyAlignment });
      doc.y = cardY + cardHeight + 11;
    }

    const range = doc.bufferedPageRange();
    for (let pageIndex = 0; pageIndex < range.count; pageIndex += 1) {
      doc.switchToPage(pageIndex);
      renderPdfFooter(doc, layout, { podcastName, pageNum: pageIndex + 1 });
    }
    doc.end();
  } catch (err: any) {
    console.error('Fehler beim Erstellen der Staffelplan-PDF:', err);
    if (!res.headersSent) return res.status(500).json({ success: false, error: err.message || 'PDF-Export fehlgeschlagen' });
  }
});

export default seasonsRouter;
