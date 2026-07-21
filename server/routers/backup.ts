import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getDb, DATA_DIR, BACKUPS_DIR } from '../database';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';

const router: import("express").Router = Router();
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
    version: '2.14.10',
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
      adCategories: db.all('SELECT * FROM ad_categories', []),
      episodeAdBookings: db.all('SELECT * FROM episode_ad_bookings', []),
      seasons: db.all('SELECT * FROM seasons', []),
      seasonPlanItems: db.all('SELECT * FROM season_plan_items', []),
      seasonPlanItemPartners: db.all('SELECT * FROM season_plan_item_partners', []),
      ideaChecklists: db.all('SELECT * FROM idea_checklists', []),
      ideaNotes: db.all('SELECT * FROM idea_notes', []),
      ideaUploads: db.all('SELECT * FROM idea_uploads', []),
      ideaInterviewPartners: db.all('SELECT * FROM idea_interview_partners', []),
      researchSources: db.all('SELECT * FROM research_sources', []),
      users: db.all('SELECT * FROM users', []),
      roles: db.all('SELECT * FROM roles', []),
      podcastStats: db.all('SELECT * FROM podcast_stats', []),
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
// IMPORT – VORSCHAU (kein Schreiben, nur Analyse)
// ============================================================

router.post('/import/preview', requirePermission('canManageSettings') as any, uploadBackup.single('file'), (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'Keine Datei hochgeladen' });

  try {
    const content = fs.readFileSync(req.file.path, 'utf-8');
    const importData = JSON.parse(content);
    fs.unlinkSync(req.file.path);

    const validTypes = ['full', 'episodes', 'editorial'];
    if (!validTypes.includes(importData.type)) {
      return res.status(400).json({ success: false, error: `Unbekannter Backup-Typ: "${importData.type}"` });
    }

    const db = getDb();
    const preview: Record<string, { total: number; new: number; existing: number }> = {};

    const countTable = (table: string, items: any[]) => {
      if (!items || !Array.isArray(items)) return;
      let newCount = 0, existingCount = 0;
      for (const item of items) {
        if (!item.id) { newCount++; continue; }
        const exists = db.get(`SELECT id FROM ${table} WHERE id = ?`, [item.id]);
        if (exists) existingCount++; else newCount++;
      }
      preview[table] = { total: items.length, new: newCount, existing: existingCount };
    };

    if (importData.type === 'full') {
      const d = importData.data || {};
      countTable('episodes', d.episodes);
      countTable('ideas', d.ideas);
      countTable('editorial_plan', d.editorialPlan);
      countTable('editorial_notes', d.editorialNotes);
      countTable('interview_partners', d.interviewPartners);
      countTable('interview_questions', d.interviewQuestions);
      countTable('sponsors', d.sponsors);
      countTable('ad_slots', d.adSlots);
      countTable('ad_placements', d.adPlacements);
      countTable('ad_categories', d.adCategories);
      countTable('episode_ad_bookings', d.episodeAdBookings);
      countTable('seasons', d.seasons);
      countTable('assets', d.assets);
      countTable('media_folders', d.mediaFolders);
      countTable('research_sources', d.researchSources);
      countTable('roles', d.roles);
    } else if (importData.type === 'episodes') {
      countTable('episodes', importData.data);
    } else if (importData.type === 'editorial') {
      const d = importData.data || {};
      countTable('ideas', d.ideas);
      countTable('editorial_notes', d.notes);
    }

    return res.json({
      success: true,
      data: {
        type: importData.type,
        exportedAt: importData.exportedAt,
        exportedBy: importData.exportedBy,
        version: importData.version,
        preview,
      },
    });
  } catch (err: any) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(400).json({ success: false, error: `Vorschau fehlgeschlagen: ${err.message}` });
  }
});

// ============================================================
// IMPORT – VOLLSTÄNDIG (Full Backup)
// ============================================================

router.post('/import/full', requirePermission('canManageSettings') as any, uploadBackup.single('file'), (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'Keine Datei hochgeladen' });

  // mode: 'merge' (Standard) = vorhandene IDs überspringen | 'overwrite' = vorhandene überschreiben
  const mode = (req.body.mode as string) || 'merge';

  try {
    const content = fs.readFileSync(req.file.path, 'utf-8');
    const importData = JSON.parse(content);
    fs.unlinkSync(req.file.path);

    const validTypes = ['full', 'episodes', 'editorial'];
    if (!validTypes.includes(importData.type)) {
      return res.status(400).json({ success: false, error: `Unbekannter Backup-Typ: "${importData.type}"` });
    }

    const db = getDb();
    const stats: Record<string, { imported: number; updated: number; skipped: number }> = {};

    const upsert = (table: string, items: any[], insertFn: (item: any) => void, updateFn?: (item: any) => void) => {
      if (!items || !Array.isArray(items)) return;
      let imported = 0, updated = 0, skipped = 0;
      for (const item of items) {
        if (!item.id) { try { insertFn(item); imported++; } catch (_) { skipped++; } continue; }
        const exists = db.get(`SELECT id FROM ${table} WHERE id = ?`, [item.id]);
        if (exists) {
          if (mode === 'overwrite' && updateFn) { try { updateFn(item); updated++; } catch (_) { skipped++; } }
          else skipped++;
        } else {
          try { insertFn(item); imported++; } catch (_) { skipped++; }
        }
      }
      stats[table] = { imported, updated, skipped };
    };

    const d = importData.type === 'full' ? (importData.data || {}) : {};
    const episodes = importData.type === 'episodes' ? (importData.data || []) : (d.episodes || []);
    const ideas = importData.type === 'editorial' ? (importData.data?.ideas || []) : (d.ideas || []);
    const editorialNotes = importData.type === 'editorial' ? (importData.data?.notes || []) : (d.editorialNotes || []);

    // ── Episoden ──
    upsert('episodes', episodes,
      (ep) => db.run(`INSERT INTO episodes (id, number, title, subtitle, description, status, recording_date, publish_date, duration, hosts, guests, tags, blocks, sponsors, notes, created_at, updated_at, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [ep.id || uuidv4(), ep.number||null, ep.title||'Importierte Episode', ep.subtitle||null, ep.description||null, ep.status||'entwurf', ep.recording_date||null, ep.publish_date||null, ep.duration||null, JSON.stringify(ep.hosts||[]), JSON.stringify(ep.guests||[]), JSON.stringify(ep.tags||[]), JSON.stringify(ep.blocks||[]), JSON.stringify(ep.sponsors||[]), ep.notes||null, ep.created_at||new Date().toISOString(), ep.updated_at||new Date().toISOString(), ep.created_by||req.user!.id]),
      (ep) => db.run(`UPDATE episodes SET number=?,title=?,subtitle=?,description=?,status=?,recording_date=?,publish_date=?,duration=?,hosts=?,guests=?,tags=?,blocks=?,sponsors=?,notes=?,updated_at=? WHERE id=?`,
        [ep.number||null, ep.title||'Importierte Episode', ep.subtitle||null, ep.description||null, ep.status||'entwurf', ep.recording_date||null, ep.publish_date||null, ep.duration||null, JSON.stringify(ep.hosts||[]), JSON.stringify(ep.guests||[]), JSON.stringify(ep.tags||[]), JSON.stringify(ep.blocks||[]), JSON.stringify(ep.sponsors||[]), ep.notes||null, new Date().toISOString(), ep.id])
    );

    // ── Ideen ──
    upsert('ideas', ideas,
      (i) => db.run(`INSERT INTO ideas (id, title, description, status, priority, tags, assigned_to, episode_id, created_at, updated_at, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [i.id||uuidv4(), i.title||'Importierte Idee', i.description||null, i.status||'neu', i.priority||'mittel', JSON.stringify(i.tags||[]), i.assigned_to||null, i.episode_id||null, i.created_at||new Date().toISOString(), i.updated_at||new Date().toISOString(), i.created_by||req.user!.id]),
      (i) => db.run(`UPDATE ideas SET title=?,description=?,status=?,priority=?,tags=?,updated_at=? WHERE id=?`,
        [i.title, i.description||null, i.status||'neu', i.priority||'mittel', JSON.stringify(i.tags||[]), new Date().toISOString(), i.id])
    );

    // ── Redaktionsnotizen ──
    upsert('editorial_notes', editorialNotes,
      (n) => db.run(`INSERT INTO editorial_notes (id, title, content, category, tags, is_pinned, episode_id, created_at, updated_at, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [n.id||uuidv4(), n.title, n.content||'', n.category||null, JSON.stringify(n.tags||[]), n.is_pinned||0, n.episode_id||null, n.created_at||new Date().toISOString(), n.updated_at||new Date().toISOString(), n.created_by||req.user!.id])
    );

    if (importData.type === 'full') {
      // ── Redaktionsplan ──
      upsert('editorial_plan', d.editorialPlan || [],
        (p) => db.run(`INSERT OR IGNORE INTO editorial_plan (id, episode_id, planned_date, status, notes, created_at, updated_at, created_by) VALUES (?,?,?,?,?,?,?,?)`,
          [p.id||uuidv4(), p.episode_id||null, p.planned_date||null, p.status||'geplant', p.notes||null, p.created_at||new Date().toISOString(), p.updated_at||new Date().toISOString(), p.created_by||req.user!.id])
      );

      // ── Interview-Partner ──
      upsert('interview_partners', d.interviewPartners || [],
        (p) => db.run(`INSERT INTO interview_partners (id, name, role, bio, contact, tags, episodes, notes, created_at, updated_at, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [p.id||uuidv4(), p.name, p.role||null, p.bio||null, p.contact||null, JSON.stringify(p.tags||[]), JSON.stringify(p.episodes||[]), p.notes||null, p.created_at||new Date().toISOString(), p.updated_at||new Date().toISOString(), p.created_by||req.user!.id])
      );

      // ── Interview-Fragen ──
      upsert('interview_questions', d.interviewQuestions || [],
        (q) => db.run(`INSERT INTO interview_questions (id, partner_id, question, answer, category, order_index, status, notes, created_at, updated_at, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [q.id||uuidv4(), q.partner_id||null, q.question, q.answer||null, q.category||null, q.order_index||0, q.status||'offen', q.notes||null, q.created_at||new Date().toISOString(), q.updated_at||new Date().toISOString(), q.created_by||req.user!.id])
      );

      // ── Sponsoren ──
      upsert('sponsors', d.sponsors || [],
        (s) => db.run(`INSERT INTO sponsors (id, name, company, email, phone, website, description, logo_url, status, tags, notes, created_at, updated_at, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [s.id||uuidv4(), s.name, s.company||null, s.email||null, s.phone||null, s.website||null, s.description||null, s.logo_url||null, s.status||'aktiv', JSON.stringify(s.tags||[]), s.notes||null, s.created_at||new Date().toISOString(), s.updated_at||new Date().toISOString(), s.created_by||req.user!.id])
      );

      // ── Werbe-Kategorien ──
      upsert('ad_categories', d.adCategories || [],
        (c) => db.run(`INSERT OR IGNORE INTO ad_categories (id, name, description, color, price_per_slot, created_at, updated_at) VALUES (?,?,?,?,?,?,?)`,
          [c.id||uuidv4(), c.name, c.description||null, c.color||'#f97316', c.price_per_slot||0, c.created_at||new Date().toISOString(), c.updated_at||new Date().toISOString()])
      );

      // ── Werbe-Slots ──
      upsert('ad_slots', d.adSlots || [],
        (s) => db.run(`INSERT OR IGNORE INTO ad_slots (id, name, description, position, duration, price, sponsor_id, booked_episodes, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [s.id||uuidv4(), s.name, s.description||null, s.position||'mid-roll', s.duration||30, s.price||0, s.sponsor_id||null, JSON.stringify(s.booked_episodes||[]), s.notes||null, s.created_at||new Date().toISOString(), s.updated_at||new Date().toISOString()])
      );

      // ── Episoden-Werbebuchungen ──
      upsert('episode_ad_bookings', d.episodeAdBookings || [],
        (b) => db.run(`INSERT OR IGNORE INTO episode_ad_bookings (id, episode_id, sponsor_id, ad_slot_id, ad_category_id, position, script_text, presentation_text, duration, confirmed, time_position, note, created_at, updated_at, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [b.id||uuidv4(), b.episode_id||null, b.sponsor_id||null, b.ad_slot_id||null, b.ad_category_id||null, b.position||'mid-roll', b.script_text||null, b.presentation_text||null, b.duration||null, b.confirmed||0, b.time_position||null, b.note||null, b.created_at||new Date().toISOString(), b.updated_at||new Date().toISOString(), b.created_by||req.user!.id])
      );

      // ── Staffeln ──
      upsert('seasons', d.seasons || [],
        (s) => db.run(`INSERT OR IGNORE INTO seasons (id, number, title, description, cover_url, status, start_date, end_date, created_at, updated_at, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [s.id||uuidv4(), s.number||1, s.title, s.description||null, s.cover_url||null, s.status||'aktiv', s.start_date||null, s.end_date||null, s.created_at||new Date().toISOString(), s.updated_at||new Date().toISOString(), s.created_by||req.user!.id])
      );

      // ── Media-Ordner ──
      upsert('media_folders', d.mediaFolders || [],
        (f) => db.run(`INSERT OR IGNORE INTO media_folders (id, name, parent_id, created_at, created_by) VALUES (?,?,?,?,?)`,
          [f.id||uuidv4(), f.name, f.parent_id||null, f.created_at||new Date().toISOString(), f.created_by||req.user!.id])
      );

      // ── Assets (Metadaten, ohne Dateien) ──
      upsert('assets', d.assets || [],
        (a) => db.run(`INSERT OR IGNORE INTO assets (id, name, filename, type, size, duration, folder_id, tags, description, notes, created_at, updated_at, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [a.id||uuidv4(), a.name, a.filename||'', a.type||'audio', a.size||0, a.duration||null, a.folder_id||null, JSON.stringify(a.tags||[]), a.description||null, a.notes||null, a.created_at||new Date().toISOString(), a.updated_at||new Date().toISOString(), a.created_by||req.user!.id])
      );

      // ── Recherche-Quellen ──
      upsert('research_sources', d.researchSources || [],
        (r) => db.run(`INSERT OR IGNORE INTO research_sources (id, title, url, type, description, content, tags, related_idea_id, related_episode_id, status, created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [r.id||uuidv4(), r.title, r.url||null, r.type||'link', r.description||null, r.content||null, JSON.stringify(r.tags||[]), r.related_idea_id||null, r.related_episode_id||null, r.status||'unread', r.created_by||req.user!.id, r.created_at||new Date().toISOString(), r.updated_at||new Date().toISOString()])
      );
    }

    // Backup der aktuellen Datenbank vor dem Import anlegen
    const backupPath = path.join(BACKUPS_DIR, `pre-import-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`);
    try {
      const currentData = {
        version: '2.0.0', type: 'full',
        exportedAt: new Date().toISOString(),
        exportedBy: 'system (pre-import-backup)',
        data: {
          episodes: db.all('SELECT * FROM episodes', []),
          ideas: db.all('SELECT * FROM ideas', []),
          editorialPlan: db.all('SELECT * FROM editorial_plan', []),
          editorialNotes: db.all('SELECT * FROM editorial_notes', []),
          sponsors: db.all('SELECT * FROM sponsors', []),
        },
      };
      fs.writeFileSync(backupPath, JSON.stringify(currentData, null, 2));
    } catch (_) { /* Pre-Import-Backup optional */ }

    const totalImported = Object.values(stats).reduce((s, v) => s + v.imported, 0);
    const totalUpdated = Object.values(stats).reduce((s, v) => s + v.updated, 0);
    const totalSkipped = Object.values(stats).reduce((s, v) => s + v.skipped, 0);

    return res.json({
      success: true,
      data: {
        mode,
        stats,
        summary: { totalImported, totalUpdated, totalSkipped },
        preImportBackup: path.basename(backupPath),
      },
    });
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
