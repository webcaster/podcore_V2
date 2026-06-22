import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth as any);

// ============================================================
// IDEAS
// ============================================================

router.get('/ideas', requirePermission('canViewIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { status, priority, search } = req.query;
  let query = 'SELECT * FROM ideas WHERE 1=1';
  const params: any[] = [];

  if (status) { query += ' AND status = ?'; params.push(status); }
  if (priority) { query += ' AND priority = ?'; params.push(priority); }
  if (search) { query += ' AND (title LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  query += ' ORDER BY created_at DESC';
  const ideas = db.all(query, params).map((r: any) => ({
    ...r, tags: JSON.parse(r.tags || '[]'),
    createdAt: r.created_at, updatedAt: r.updated_at, createdBy: r.created_by,
    assignedTo: r.assigned_to, episodeId: r.episode_id,
  }));

  return res.json({ success: true, data: ideas });
});

router.post('/ideas', requirePermission('canCreateIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const id = uuidv4();
  const { title, description, status = 'neu', priority = 'mittel', tags = [], assignedTo, episodeId } = req.body;

  if (!title) return res.status(400).json({ success: false, error: 'Titel erforderlich' });

  db.run('INSERT INTO ideas (id, title, description, status, priority, tags, assigned_to, episode_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, title, description || null, status, priority, JSON.stringify(tags), assignedTo || null, episodeId || null, req.user!.id]);

  const idea = db.get('SELECT * FROM ideas WHERE id = ?', [id]) as any;
  return res.status(201).json({ success: true, data: { ...idea, tags: JSON.parse(idea.tags), createdAt: idea.created_at, updatedAt: idea.updated_at, createdBy: idea.created_by } });
});

router.put('/ideas/:id', requirePermission('canEditIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { title, description, status, priority, tags, assignedTo, episodeId } = req.body;

  db.run(`UPDATE ideas SET title = COALESCE(?, title), description = ?, status = COALESCE(?, status), priority = COALESCE(?, priority), tags = COALESCE(?, tags), assigned_to = ?, episode_id = ?, updated_at = datetime('now') WHERE id = ?`,
    [title ?? null, description ?? null, status ?? null, priority ?? null, tags ? JSON.stringify(tags) : null, assignedTo ?? null, episodeId ?? null, req.params.id]);

  const idea = db.get('SELECT * FROM ideas WHERE id = ?', [req.params.id]) as any;
  if (!idea) return res.status(404).json({ success: false, error: 'Idee nicht gefunden' });
  return res.json({ success: true, data: { ...idea, tags: JSON.parse(idea.tags), createdAt: idea.created_at, updatedAt: idea.updated_at, createdBy: idea.created_by } });
});

router.delete('/ideas/:id', requirePermission('canDeleteIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.run('DELETE FROM ideas WHERE id = ?', [req.params.id]);
  return res.json({ success: true, message: 'Idee gelöscht' });
});

// ============================================================
// EDITORIAL PLAN
// ============================================================

router.get('/plan', requirePermission('canViewEditorialPlan') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { month, year } = req.query;
  let query = 'SELECT * FROM editorial_plan WHERE 1=1';
  const params: any[] = [];

  if (month && year) {
    query += ` AND strftime('%Y-%m', planned_date) = ?`;
    params.push(`${year}-${String(month).padStart(2, '0')}`);
  }

  query += ' ORDER BY planned_date ASC';
  const entries = db.all(query, params).map((r: any) => ({
    ...r, createdAt: r.created_at, updatedAt: r.updated_at,
    plannedDate: r.planned_date, episodeId: r.episode_id, ideaId: r.idea_id, assignedTo: r.assigned_to,
  }));

  return res.json({ success: true, data: entries });
});

router.post('/plan', requirePermission('canEditEditorialPlan') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const id = uuidv4();
  const { episodeId, ideaId, title, plannedDate, status = 'entwurf', assignedTo, notes } = req.body;

  if (!title || !plannedDate) return res.status(400).json({ success: false, error: 'Titel und Datum erforderlich' });

  db.run('INSERT INTO editorial_plan (id, episode_id, idea_id, title, planned_date, status, assigned_to, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, episodeId || null, ideaId || null, title, plannedDate, status, assignedTo || null, notes || null]);

  const entry = db.get('SELECT * FROM editorial_plan WHERE id = ?', [id]) as any;
  return res.status(201).json({ success: true, data: { ...entry, createdAt: entry.created_at, plannedDate: entry.planned_date } });
});

router.put('/plan/:id', requirePermission('canEditEditorialPlan') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { title, plannedDate, status, assignedTo, notes } = req.body;

  db.run(`UPDATE editorial_plan SET title = COALESCE(?, title), planned_date = COALESCE(?, planned_date), status = COALESCE(?, status), assigned_to = ?, notes = ?, updated_at = datetime('now') WHERE id = ?`,
    [title ?? null, plannedDate ?? null, status ?? null, assignedTo ?? null, notes ?? null, req.params.id]);

  const entry = db.get('SELECT * FROM editorial_plan WHERE id = ?', [req.params.id]) as any;
  return res.json({ success: true, data: { ...entry, createdAt: entry.created_at, plannedDate: entry.planned_date } });
});

router.delete('/plan/:id', requirePermission('canEditEditorialPlan') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.run('DELETE FROM editorial_plan WHERE id = ?', [req.params.id]);
  return res.json({ success: true, message: 'Eintrag gelöscht' });
});

// ============================================================
// INTERVIEW PARTNERS
// ============================================================

router.get('/interviews/partners', requirePermission('canViewInterviews') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const partners = db.all('SELECT * FROM interview_partners ORDER BY name ASC', []).map((r: any) => ({
    ...r, tags: JSON.parse(r.tags || '[]'), episodes: JSON.parse(r.episodes || '[]'),
    createdAt: r.created_at, updatedAt: r.updated_at,
  }));
  return res.json({ success: true, data: partners });
});

router.post('/interviews/partners', requirePermission('canEditInterviews') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const id = uuidv4();
  const { name, company, role, email, phone, bio, tags = [], episodes = [], notes } = req.body;

  if (!name) return res.status(400).json({ success: false, error: 'Name erforderlich' });

  db.run('INSERT INTO interview_partners (id, name, company, role, email, phone, bio, tags, episodes, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, name, company || null, role || null, email || null, phone || null, bio || null, JSON.stringify(tags), JSON.stringify(episodes), notes || null]);

  const partner = db.get('SELECT * FROM interview_partners WHERE id = ?', [id]) as any;
  return res.status(201).json({ success: true, data: { ...partner, tags: JSON.parse(partner.tags), episodes: JSON.parse(partner.episodes), createdAt: partner.created_at } });
});

router.put('/interviews/partners/:id', requirePermission('canEditInterviews') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { name, company, role, email, phone, bio, tags, episodes, notes } = req.body;

  db.run(`UPDATE interview_partners SET name = COALESCE(?, name), company = ?, role = ?, email = ?, phone = ?, bio = ?, tags = COALESCE(?, tags), episodes = COALESCE(?, episodes), notes = ?, updated_at = datetime('now') WHERE id = ?`,
    [name ?? null, company ?? null, role ?? null, email ?? null, phone ?? null, bio ?? null, tags ? JSON.stringify(tags) : null, episodes ? JSON.stringify(episodes) : null, notes ?? null, req.params.id]);

  const partner = db.get('SELECT * FROM interview_partners WHERE id = ?', [req.params.id]) as any;
  return res.json({ success: true, data: { ...partner, tags: JSON.parse(partner.tags), episodes: JSON.parse(partner.episodes), createdAt: partner.created_at } });
});

router.delete('/interviews/partners/:id', requirePermission('canEditInterviews') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.run('DELETE FROM interview_partners WHERE id = ?', [req.params.id]);
  db.run('DELETE FROM interview_questions WHERE partner_id = ?', [req.params.id]);
  return res.json({ success: true, message: 'Partner gelöscht' });
});

// Interview Questions
router.get('/interviews/questions', requirePermission('canViewInterviews') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { partnerId, episodeId } = req.query;
  let query = 'SELECT * FROM interview_questions WHERE 1=1';
  const params: any[] = [];

  if (partnerId) { query += ' AND partner_id = ?'; params.push(partnerId); }
  if (episodeId) { query += ' AND episode_id = ?'; params.push(episodeId); }
  query += ' ORDER BY sort_order ASC';

  const questions = db.all(query, params).map((r: any) => ({
    ...r, answered: r.answered === 1,
    partnerId: r.partner_id, episodeId: r.episode_id, createdAt: r.created_at,
  }));
  return res.json({ success: true, data: questions });
});

router.post('/interviews/questions', requirePermission('canEditInterviews') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const id = uuidv4();
  const { partnerId, episodeId, question, category, order = 0, notes } = req.body;

  if (!question) return res.status(400).json({ success: false, error: 'Frage erforderlich' });

  db.run('INSERT INTO interview_questions (id, partner_id, episode_id, question, category, sort_order, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, partnerId || null, episodeId || null, question, category || null, order, notes || null]);

  const q = db.get('SELECT * FROM interview_questions WHERE id = ?', [id]) as any;
  return res.status(201).json({ success: true, data: { ...q, answered: q.answered === 1, partnerId: q.partner_id, episodeId: q.episode_id, createdAt: q.created_at } });
});

router.put('/interviews/questions/:id', requirePermission('canEditInterviews') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { question, category, order, answered, notes } = req.body;

  db.run(`UPDATE interview_questions SET question = COALESCE(?, question), category = ?, sort_order = COALESCE(?, sort_order), answered = COALESCE(?, answered), notes = ? WHERE id = ?`,
    [question ?? null, category ?? null, order ?? null, answered !== undefined ? (answered ? 1 : 0) : null, notes ?? null, req.params.id]);

  const q = db.get('SELECT * FROM interview_questions WHERE id = ?', [req.params.id]) as any;
  return res.json({ success: true, data: { ...q, answered: q.answered === 1, partnerId: q.partner_id, episodeId: q.episode_id, createdAt: q.created_at } });
});

router.delete('/interviews/questions/:id', requirePermission('canEditInterviews') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.run('DELETE FROM interview_questions WHERE id = ?', [req.params.id]);
  return res.json({ success: true, message: 'Frage gelöscht' });
});

// ============================================================
// EDITORIAL NOTES
// ============================================================

router.get('/notes', requirePermission('canViewNotes') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { episodeId, search } = req.query;
  let query = 'SELECT * FROM editorial_notes WHERE 1=1';
  const params: any[] = [];

  if (episodeId) { query += ' AND episode_id = ?'; params.push(episodeId); }
  if (search) { query += ' AND (title LIKE ? OR content LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  query += ' ORDER BY is_pinned DESC, updated_at DESC';

  const notes = db.all(query, params).map((r: any) => ({
    ...r, tags: JSON.parse(r.tags || '[]'), isPinned: r.is_pinned === 1,
    createdAt: r.created_at, updatedAt: r.updated_at, createdBy: r.created_by, episodeId: r.episode_id,
  }));
  return res.json({ success: true, data: notes });
});

router.post('/notes', requirePermission('canEditNotes') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const id = uuidv4();
  const { title, content, category, tags = [], isPinned = false, episodeId } = req.body;

  if (!title || !content) return res.status(400).json({ success: false, error: 'Titel und Inhalt erforderlich' });

  db.run('INSERT INTO editorial_notes (id, title, content, category, tags, is_pinned, episode_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, title, content, category || null, JSON.stringify(tags), isPinned ? 1 : 0, episodeId || null, req.user!.id]);

  const note = db.get('SELECT * FROM editorial_notes WHERE id = ?', [id]) as any;
  return res.status(201).json({ success: true, data: { ...note, tags: JSON.parse(note.tags), isPinned: note.is_pinned === 1, createdAt: note.created_at, updatedAt: note.updated_at, createdBy: note.created_by } });
});

router.put('/notes/:id', requirePermission('canEditNotes') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { title, content, category, tags, isPinned, episodeId } = req.body;

  db.run(`UPDATE editorial_notes SET title = COALESCE(?, title), content = COALESCE(?, content), category = ?, tags = COALESCE(?, tags), is_pinned = COALESCE(?, is_pinned), episode_id = ?, updated_at = datetime('now') WHERE id = ?`,
    [title ?? null, content ?? null, category ?? null, tags ? JSON.stringify(tags) : null, isPinned !== undefined ? (isPinned ? 1 : 0) : null, episodeId ?? null, req.params.id]);

  const note = db.get('SELECT * FROM editorial_notes WHERE id = ?', [req.params.id]) as any;
  return res.json({ success: true, data: { ...note, tags: JSON.parse(note.tags), isPinned: note.is_pinned === 1, createdAt: note.created_at, updatedAt: note.updated_at, createdBy: note.created_by } });
});

router.delete('/notes/:id', requirePermission('canEditNotes') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.run('DELETE FROM editorial_notes WHERE id = ?', [req.params.id]);
  return res.json({ success: true, message: 'Notiz gelöscht' });
});

export default router;
