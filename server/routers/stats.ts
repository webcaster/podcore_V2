import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';
import { requireAuth } from '../middleware/auth';

const router: import("express").Router = Router();

// ─── Get overview stats (derived from episodes + manual entries) ──────────────
router.get('/overview', requireAuth, (req, res) => {
  try {
    const db = getDb();

    // Episode-derived stats
    const episodeStats = db.get(`
      SELECT
        COUNT(*) as total_episodes,
        COUNT(CASE WHEN status = 'veroeffentlicht' THEN 1 END) as published,
        COUNT(CASE WHEN status = 'aufgenommen' THEN 1 END) as recorded,
        COUNT(CASE WHEN status = 'entwurf' THEN 1 END) as drafts,
        COUNT(CASE WHEN is_archived = 1 THEN 1 END) as archived,
        SUM(CASE WHEN duration IS NOT NULL THEN duration ELSE 0 END) as total_duration_seconds
      FROM episodes
    `) as any;

    // Manual stats totals
    const manualTotals = db.get(`
      SELECT
        COALESCE(SUM(downloads), 0) as total_downloads,
        COALESCE(SUM(plays), 0) as total_plays,
        COALESCE(MAX(unique_listeners), 0) as max_unique_listeners,
        COUNT(*) as stat_entries
      FROM podcast_stats
    `) as any;

    // Last 30 days manual stats
    const last30 = db.get(`
      SELECT
        COALESCE(SUM(downloads), 0) as downloads,
        COALESCE(SUM(plays), 0) as plays
      FROM podcast_stats
      WHERE date >= date('now', '-30 days')
    `) as any;

    // Last 7 days
    const last7 = db.get(`
      SELECT
        COALESCE(SUM(downloads), 0) as downloads,
        COALESCE(SUM(plays), 0) as plays
      FROM podcast_stats
      WHERE date >= date('now', '-7 days')
    `) as any;

    // Top episodes by downloads
    const topEpisodes = db.all(`
      SELECT e.id, e.number, e.title, e.status,
        COALESCE(SUM(ps.downloads), 0) as total_downloads,
        COALESCE(SUM(ps.plays), 0) as total_plays
      FROM episodes e
      LEFT JOIN podcast_stats ps ON ps.episode_id = e.id
      WHERE e.is_archived = 0
      GROUP BY e.id
      ORDER BY total_downloads DESC
      LIMIT 10
    `) as any[];

    // Monthly trend (last 12 months)
    const monthlyTrend = db.all(`
      SELECT
        strftime('%Y-%m', date) as month,
        SUM(downloads) as downloads,
        SUM(plays) as plays
      FROM podcast_stats
      WHERE date >= date('now', '-12 months')
      GROUP BY month
      ORDER BY month ASC
    `) as any[];

    // Season stats
    const seasonStats = db.all(`
      SELECT s.id, s.number, s.title,
        COUNT(e.id) as episode_count,
        COALESCE(SUM(ps.downloads), 0) as total_downloads
      FROM seasons s
      LEFT JOIN episodes e ON e.season_id = s.id
      LEFT JOIN podcast_stats ps ON ps.episode_id = e.id
      GROUP BY s.id
      ORDER BY s.number ASC
    `) as any[];

    const avgDownloads = episodeStats.published > 0
      ? Math.round((manualTotals.total_downloads || 0) / episodeStats.published)
      : 0;

    res.json({
      success: true,
      data: {
        episodes: episodeStats,
        totals: {
          downloads: manualTotals.total_downloads || 0,
          plays: manualTotals.total_plays || 0,
          maxUniqueListeners: manualTotals.max_unique_listeners || 0,
          avgDownloadsPerEpisode: avgDownloads,
        },
        last30Days: last30,
        last7Days: last7,
        topEpisodes,
        monthlyTrend,
        seasonStats,
        source: 'manual',
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── List stat entries ────────────────────────────────────────────────────────
router.get('/', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { episodeId, from, to, limit = 100, page = 1 } = req.query as any;

    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (episodeId) { where += ' AND ps.episode_id = ?'; params.push(episodeId); }
    if (from) { where += ' AND ps.date >= ?'; params.push(from); }
    if (to) { where += ' AND ps.date <= ?'; params.push(to); }

    const offset = (Number(page) - 1) * Number(limit);
    const total = (db.get(`SELECT COUNT(*) as count FROM podcast_stats ps ${where}`, params) as any)?.count || 0;

    const items = db.all(`
      SELECT ps.*, e.title as episode_title, e.number as episode_number
      FROM podcast_stats ps
      LEFT JOIN episodes e ON e.id = ps.episode_id
      ${where}
      ORDER BY ps.date DESC
      LIMIT ? OFFSET ?
    `, [...params, Number(limit), offset]) as any[];

    res.json({ success: true, data: { items, total, page: Number(page), limit: Number(limit) } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Create stat entry ────────────────────────────────────────────────────────
router.post('/', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { episodeId, date, downloads, plays, uniqueListeners, notes } = req.body;
    if (!date) return res.status(400).json({ success: false, error: 'Datum ist erforderlich' });

    const id = uuidv4();
    db.run(
      'INSERT INTO podcast_stats (id, episode_id, date, downloads, plays, unique_listeners, source, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, episodeId || null, date, downloads || 0, plays || 0, uniqueListeners || 0, 'manual', notes || null, new Date().toISOString()]
    );

    const stat = db.get('SELECT * FROM podcast_stats WHERE id = ?', [id]) as any;
    res.status(201).json({ success: true, data: stat });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Update stat entry ────────────────────────────────────────────────────────
router.put('/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const stat = db.get('SELECT * FROM podcast_stats WHERE id = ?', [req.params.id]) as any;
    if (!stat) return res.status(404).json({ success: false, error: 'Eintrag nicht gefunden' });

    const { episodeId, date, downloads, plays, uniqueListeners, notes } = req.body;
    db.run(
      'UPDATE podcast_stats SET episode_id = ?, date = ?, downloads = ?, plays = ?, unique_listeners = ?, notes = ? WHERE id = ?',
      [
        episodeId !== undefined ? episodeId : stat.episode_id,
        date ?? stat.date,
        downloads !== undefined ? downloads : stat.downloads,
        plays !== undefined ? plays : stat.plays,
        uniqueListeners !== undefined ? uniqueListeners : stat.unique_listeners,
        notes !== undefined ? notes : stat.notes,
        req.params.id,
      ]
    );

    const updated = db.get('SELECT * FROM podcast_stats WHERE id = ?', [req.params.id]) as any;
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Delete stat entry ────────────────────────────────────────────────────────
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    db.run('DELETE FROM podcast_stats WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Archive / unarchive episode ─────────────────────────────────────────────
router.post('/archive/:episodeId', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const episode = db.get('SELECT * FROM episodes WHERE id = ?', [req.params.episodeId]) as any;
    if (!episode) return res.status(404).json({ success: false, error: 'Episode nicht gefunden' });

    const { archive } = req.body;
    const now = new Date().toISOString();

    db.run(
      'UPDATE episodes SET is_archived = ?, archive_date = ?, updated_at = ? WHERE id = ?',
      [archive ? 1 : 0, archive ? now : null, now, req.params.episodeId]
    );

    res.json({ success: true, message: archive ? 'Episode archiviert' : 'Episode aus Archiv wiederhergestellt' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
