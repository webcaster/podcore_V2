import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getDb, DATA_DIR, BACKUPS_DIR } from '../database';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth as any);

const uploadBackup = multer({
  dest: path.join(DATA_DIR, 'tmp'),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json' || path.extname(file.originalname) === '.json') {
      cb(null, true);
    } else {
      cb(new Error('Nur JSON-Dateien erlaubt'));
    }
  },
});

// ============================================================
// EXPORT
// ============================================================

router.get('/export/episodes', requirePermission('canExport') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const episodes = db.all('SELECT * FROM episodes ORDER BY created_at ASC', []).map((ep: any) => ({
    ...ep,
    hosts: JSON.parse(ep.hosts || '[]'),
    guests: JSON.parse(ep.guests || '[]'),
    tags: JSON.parse(ep.tags || '[]'),
    blocks: JSON.parse(ep.blocks || '[]'),
    sponsors: JSON.parse(ep.sponsors || '[]'),
  }));

  const exportData = {
    version: '2.0.0',
    type: 'episodes',
    exportedAt: new Date().toISOString(),
    exportedBy: req.user!.username,
    count: episodes.length,
    data: episodes,
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="podcore-episodes-${new Date().toISOString().slice(0, 10)}.json"`);
  return res.json(exportData);
});

router.get('/export/ideas', requirePermission('canExport') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const ideas = db.all('SELECT * FROM ideas ORDER BY created_at ASC', []).map((idea: any) => ({
    ...idea, tags: JSON.parse(idea.tags || '[]'),
  }));
  const plan = db.all('SELECT * FROM editorial_plan ORDER BY planned_date ASC', []);
  const notes = db.all('SELECT * FROM editorial_notes ORDER BY created_at ASC', []).map((n: any) => ({
    ...n, tags: JSON.parse(n.tags || '[]'),
  }));

  const exportData = {
    version: '2.0.0',
    type: 'editorial',
    exportedAt: new Date().toISOString(),
    exportedBy: req.user!.username,
    data: { ideas, plan, notes },
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="podcore-editorial-${new Date().toISOString().slice(0, 10)}.json"`);
  return res.json(exportData);
});

router.get('/export/full', requirePermission('canManageSettings') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();

  const exportData = {
    version: '2.0.0',
    type: 'full',
    exportedAt: new Date().toISOString(),
    exportedBy: req.user!.username,
    data: {
      episodes: db.all('SELECT * FROM episodes', []).map((ep: any) => ({
        ...ep,
        hosts: JSON.parse(ep.hosts || '[]'), guests: JSON.parse(ep.guests || '[]'),
        tags: JSON.parse(ep.tags || '[]'), blocks: JSON.parse(ep.blocks || '[]'),
        sponsors: JSON.parse(ep.sponsors || '[]'),
      })),
      ideas: db.all('SELECT * FROM ideas', []).map((i: any) => ({ ...i, tags: JSON.parse(i.tags || '[]') })),
      editorialPlan: db.all('SELECT * FROM editorial_plan', []),
      editorialNotes: db.all('SELECT * FROM editorial_notes', []).map((n: any) => ({ ...n, tags: JSON.parse(n.tags || '[]') })),
      interviewPartners: db.all('SELECT * FROM interview_partners', []).map((p: any) => ({ ...p, tags: JSON.parse(p.tags || '[]'), episodes: JSON.parse(p.episodes || '[]') })),
      interviewQuestions: db.all('SELECT * FROM interview_questions', []),
      sponsors: db.all('SELECT * FROM sponsors', []).map((s: any) => ({ ...s, tags: JSON.parse(s.tags || '[]') })),
      adSlots: db.all('SELECT * FROM ad_slots', []).map((s: any) => ({ ...s, booked_episodes: JSON.parse(s.booked_episodes || '[]') })),
      adPlacements: db.all('SELECT * FROM ad_placements', []),
    },
  };

  const backupPath = path.join(BACKUPS_DIR, `full-backup-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(exportData, null, 2));

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="podcore-full-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  return res.json(exportData);
});

// ============================================================
// IMPORT
// ============================================================

router.post('/import/episodes', requirePermission('canManageSettings') as any, uploadBackup.single('file'), (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'Keine Datei hochgeladen' });

  try {
    const content = fs.readFileSync(req.file.path, 'utf-8');
    const importData = JSON.parse(content);
    fs.unlinkSync(req.file.path);

    if (importData.type !== 'episodes' && importData.type !== 'full') {
      return res.status(400).json({ success: false, error: 'Ungültiges Backup-Format' });
    }

    const episodes = importData.type === 'full' ? importData.data.episodes : importData.data;
    const db = getDb();
    let imported = 0;
    let skipped = 0;

    for (const ep of episodes) {
      const existing = db.get('SELECT id FROM episodes WHERE id = ?', [ep.id]);
      if (existing) { skipped++; continue; }

      db.run(`INSERT INTO episodes (id, number, title, subtitle, description, status, recording_date, publish_date, duration, hosts, guests, tags, blocks, sponsors, notes, created_at, updated_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [ep.id || uuidv4(), ep.number || null, ep.title, ep.subtitle || null, ep.description || null, ep.status || 'entwurf', ep.recording_date || null, ep.publish_date || null, ep.duration || null, JSON.stringify(ep.hosts || []), JSON.stringify(ep.guests || []), JSON.stringify(ep.tags || []), JSON.stringify(ep.blocks || []), JSON.stringify(ep.sponsors || []), ep.notes || null, ep.created_at || new Date().toISOString(), ep.updated_at || new Date().toISOString(), ep.created_by || req.user!.id]);
      imported++;
    }

    return res.json({ success: true, data: { imported, skipped, total: episodes.length } });
  } catch (err: any) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(400).json({ success: false, error: `Import fehlgeschlagen: ${err.message}` });
  }
});

router.post('/import/ideas', requirePermission('canManageSettings') as any, uploadBackup.single('file'), (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'Keine Datei hochgeladen' });

  try {
    const content = fs.readFileSync(req.file.path, 'utf-8');
    const importData = JSON.parse(content);
    fs.unlinkSync(req.file.path);

    if (importData.type !== 'editorial' && importData.type !== 'full') {
      return res.status(400).json({ success: false, error: 'Ungültiges Backup-Format' });
    }

    const { ideas = [], notes = [] } = importData.type === 'full' ? importData.data : importData.data;
    const db = getDb();
    let imported = 0;

    for (const idea of ideas) {
      const existing = db.get('SELECT id FROM ideas WHERE id = ?', [idea.id]);
      if (existing) continue;
      db.run('INSERT INTO ideas (id, title, description, status, priority, tags, assigned_to, episode_id, created_at, updated_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [idea.id || uuidv4(), idea.title, idea.description || null, idea.status || 'neu', idea.priority || 'mittel', JSON.stringify(idea.tags || []), idea.assigned_to || null, idea.episode_id || null, idea.created_at || new Date().toISOString(), idea.updated_at || new Date().toISOString(), idea.created_by || req.user!.id]);
      imported++;
    }

    for (const note of notes) {
      const existing = db.get('SELECT id FROM editorial_notes WHERE id = ?', [note.id]);
      if (existing) continue;
      db.run('INSERT INTO editorial_notes (id, title, content, category, tags, is_pinned, episode_id, created_at, updated_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [note.id || uuidv4(), note.title, note.content, note.category || null, JSON.stringify(note.tags || []), note.is_pinned || 0, note.episode_id || null, note.created_at || new Date().toISOString(), note.updated_at || new Date().toISOString(), note.created_by || req.user!.id]);
      imported++;
    }

    return res.json({ success: true, data: { imported, total: ideas.length + notes.length } });
  } catch (err: any) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(400).json({ success: false, error: `Import fehlgeschlagen: ${err.message}` });
  }
});

// ============================================================
// BACKUP LIST
// ============================================================

router.get('/list', requirePermission('canManageSettings') as any, (req: AuthRequest, res: Response) => {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) return res.json({ success: true, data: [] });

    const files = fs.readdirSync(BACKUPS_DIR)
      .filter((f: string) => f.endsWith('.json'))
      .map((f: string) => {
        const stat = fs.statSync(path.join(BACKUPS_DIR, f));
        return { filename: f, size: stat.size, createdAt: stat.birthtime.toISOString() };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json({ success: true, data: files });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:filename', requirePermission('canManageSettings') as any, (req: AuthRequest, res: Response) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(BACKUPS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: 'Backup nicht gefunden' });
  }

  fs.unlinkSync(filePath);
  return res.json({ success: true, message: 'Backup gelöscht' });
});

export default router;
