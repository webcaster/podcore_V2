import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';
import { requireAuth } from '../middleware/auth';

const router: import("express").Router = Router();

// ─── List all seasons ────────────────────────────────────────────────────────
router.get('/', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const seasons = db.all(`
      SELECT s.*,
        COUNT(e.id) as episode_count
      FROM seasons s
      LEFT JOIN episodes e ON e.season_id = s.id AND e.is_archived = 0
      GROUP BY s.id
      ORDER BY s.number ASC
    `) as any[];

    const result = seasons.map((s: any) => ({
      ...s,
      episode_count: s.episode_count || 0,
    }));

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Get single season with episodes ─────────────────────────────────────────
router.get('/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const season = db.get('SELECT * FROM seasons WHERE id = ?', [req.params.id]) as any;
    if (!season) return res.status(404).json({ success: false, error: 'Staffel nicht gefunden' });

    const episodes = db.all(`
      SELECT id, number, title, status, publish_date, duration, tags
      FROM episodes
      WHERE season_id = ? AND is_archived = 0
      ORDER BY number ASC
    `, [req.params.id]) as any[];

    res.json({ success: true, data: { ...season, episodes } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Create season ────────────────────────────────────────────────────────────
router.post('/', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { number, title, description, start_date, end_date, status } = req.body;
    if (!title || !number) return res.status(400).json({ success: false, error: 'Nummer und Titel sind erforderlich' });

    // Check for duplicate number
    const existing = db.get('SELECT id FROM seasons WHERE number = ?', [number]) as any;
    if (existing) return res.status(400).json({ success: false, error: `Staffel ${number} existiert bereits` });

    const id = uuidv4();
    const now = new Date().toISOString();
    db.run(
      'INSERT INTO seasons (id, number, title, description, start_date, end_date, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, number, title, description || null, start_date || null, end_date || null, status || 'aktiv', (req as any).user.id, now, now]
    );

    const season = db.get('SELECT * FROM seasons WHERE id = ?', [id]) as any;
    res.status(201).json({ success: true, data: season });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Update season ────────────────────────────────────────────────────────────
router.put('/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const season = db.get('SELECT * FROM seasons WHERE id = ?', [req.params.id]) as any;
    if (!season) return res.status(404).json({ success: false, error: 'Staffel nicht gefunden' });

    const { number, title, description, start_date, end_date, status } = req.body;
    const now = new Date().toISOString();

    db.run(
      'UPDATE seasons SET number = ?, title = ?, description = ?, start_date = ?, end_date = ?, status = ?, updated_at = ? WHERE id = ?',
      [
        number ?? season.number,
        title ?? season.title,
        description !== undefined ? description : season.description,
        start_date !== undefined ? start_date : season.start_date,
        end_date !== undefined ? end_date : season.end_date,
        status ?? season.status,
        now,
        req.params.id,
      ]
    );

    const updated = db.get('SELECT * FROM seasons WHERE id = ?', [req.params.id]) as any;
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Delete season ────────────────────────────────────────────────────────────
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const season = db.get('SELECT * FROM seasons WHERE id = ?', [req.params.id]) as any;
    if (!season) return res.status(404).json({ success: false, error: 'Staffel nicht gefunden' });

    // Unlink episodes from this season
    db.run('UPDATE episodes SET season_id = NULL WHERE season_id = ?', [req.params.id]);
    db.run('DELETE FROM seasons WHERE id = ?', [req.params.id]);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Assign episode to season ─────────────────────────────────────────────────
router.post('/:id/episodes', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const season = db.get('SELECT * FROM seasons WHERE id = ?', [req.params.id]) as any;
    if (!season) return res.status(404).json({ success: false, error: 'Staffel nicht gefunden' });

    const { episodeIds } = req.body;
    if (!Array.isArray(episodeIds)) return res.status(400).json({ success: false, error: 'episodeIds muss ein Array sein' });

    for (const epId of episodeIds) {
      db.run('UPDATE episodes SET season_id = ?, updated_at = ? WHERE id = ?', [req.params.id, new Date().toISOString(), epId]);
    }

    res.json({ success: true, message: `${episodeIds.length} Folge(n) der Staffel zugewiesen` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Remove episode from season ───────────────────────────────────────────────
router.delete('/:id/episodes/:episodeId', requireAuth, (req, res) => {
  try {
    const db = getDb();
    db.run('UPDATE episodes SET season_id = NULL, updated_at = ? WHERE id = ? AND season_id = ?',
      [new Date().toISOString(), req.params.episodeId, req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
