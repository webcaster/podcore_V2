import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth as any);

function parseEpisode(row: any) {
  if (!row) return null;
  return {
    ...row,
    hosts: JSON.parse(row.hosts || '[]'),
    guests: JSON.parse(row.guests || '[]'),
    tags: JSON.parse(row.tags || '[]'),
    blocks: JSON.parse(row.blocks || '[]'),
    sponsors: JSON.parse(row.sponsors || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    recordingDate: row.recording_date,
    publishDate: row.publish_date,
  };
}

// GET /api/episodes
router.get('/', requirePermission('canViewEpisodes') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { status, search, page = '1', pageSize = '20' } = req.query;

  let query = 'SELECT * FROM episodes WHERE 1=1';
  let countQuery = 'SELECT COUNT(*) as count FROM episodes WHERE 1=1';
  const params: any[] = [];
  const countParams: any[] = [];

  if (status) {
    query += ' AND status = ?';
    countQuery += ' AND status = ?';
    params.push(status);
    countParams.push(status);
  }

  if (search) {
    query += ' AND (title LIKE ? OR description LIKE ?)';
    countQuery += ' AND (title LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
    countParams.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY created_at DESC';

  const pageNum = parseInt(page as string);
  const pageSizeNum = parseInt(pageSize as string);
  const offset = (pageNum - 1) * pageSizeNum;

  const countRow = db.get(countQuery, countParams) as any;
  const total = countRow?.count || 0;

  query += ' LIMIT ? OFFSET ?';
  params.push(pageSizeNum, offset);

  const episodes = db.all(query, params).map(parseEpisode);

  return res.json({
    success: true,
    data: {
      items: episodes,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages: Math.ceil(total / pageSizeNum),
    },
  });
});

// GET /api/episodes/:id
router.get('/:id', requirePermission('canViewEpisodes') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const episode = db.get('SELECT * FROM episodes WHERE id = ?', [req.params.id]);

  if (!episode) {
    return res.status(404).json({ success: false, error: 'Episode nicht gefunden' });
  }

  return res.json({ success: true, data: parseEpisode(episode) });
});

// POST /api/episodes
router.post('/', requirePermission('canCreateEpisodes') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const id = uuidv4();
  const {
    number, title, subtitle, description, status = 'entwurf',
    recordingDate, publishDate, duration, hosts = [], guests = [],
    tags = [], blocks = [], sponsors = [], notes,
  } = req.body;

  if (!title) {
    return res.status(400).json({ success: false, error: 'Titel ist erforderlich' });
  }

  db.run(`
    INSERT INTO episodes (id, number, title, subtitle, description, status, recording_date, publish_date, duration, hosts, guests, tags, blocks, sponsors, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, number || null, title, subtitle || null, description || null, status,
    recordingDate || null, publishDate || null, duration || null,
    JSON.stringify(hosts), JSON.stringify(guests), JSON.stringify(tags),
    JSON.stringify(blocks), JSON.stringify(sponsors), notes || null,
    req.user!.id
  ]);

  const episode = db.get('SELECT * FROM episodes WHERE id = ?', [id]);
  return res.status(201).json({ success: true, data: parseEpisode(episode) });
});

// PUT /api/episodes/:id
router.put('/:id', requirePermission('canEditEpisodes') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const existing = db.get('SELECT * FROM episodes WHERE id = ?', [req.params.id]) as any;

  if (!existing) {
    return res.status(404).json({ success: false, error: 'Episode nicht gefunden' });
  }

  const {
    number, title, subtitle, description, status,
    recordingDate, publishDate, duration, hosts, guests,
    tags, blocks, sponsors, notes,
  } = req.body;

  db.run(`
    UPDATE episodes SET
      number = COALESCE(?, number),
      title = COALESCE(?, title),
      subtitle = ?,
      description = ?,
      status = COALESCE(?, status),
      recording_date = ?,
      publish_date = ?,
      duration = ?,
      hosts = COALESCE(?, hosts),
      guests = COALESCE(?, guests),
      tags = COALESCE(?, tags),
      blocks = COALESCE(?, blocks),
      sponsors = COALESCE(?, sponsors),
      notes = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `, [
    number ?? null, title ?? null, subtitle ?? null, description ?? null, status ?? null,
    recordingDate ?? null, publishDate ?? null, duration ?? null,
    hosts ? JSON.stringify(hosts) : null,
    guests ? JSON.stringify(guests) : null,
    tags ? JSON.stringify(tags) : null,
    blocks ? JSON.stringify(blocks) : null,
    sponsors ? JSON.stringify(sponsors) : null,
    notes ?? null,
    req.params.id
  ]);

  const episode = db.get('SELECT * FROM episodes WHERE id = ?', [req.params.id]);
  return res.json({ success: true, data: parseEpisode(episode) });
});

// DELETE /api/episodes/:id
router.delete('/:id', requirePermission('canDeleteEpisodes') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const existing = db.get('SELECT id FROM episodes WHERE id = ?', [req.params.id]);

  if (!existing) {
    return res.status(404).json({ success: false, error: 'Episode nicht gefunden' });
  }

  db.run('DELETE FROM episodes WHERE id = ?', [req.params.id]);
  return res.json({ success: true, message: 'Episode gelöscht' });
});

// POST /api/episodes/:id/duplicate
router.post('/:id/duplicate', requirePermission('canCreateEpisodes') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const original = db.get('SELECT * FROM episodes WHERE id = ?', [req.params.id]) as any;

  if (!original) {
    return res.status(404).json({ success: false, error: 'Episode nicht gefunden' });
  }

  const newId = uuidv4();
  db.run(`
    INSERT INTO episodes (id, number, title, subtitle, description, status, recording_date, publish_date, duration, hosts, guests, tags, blocks, sponsors, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    newId, null, `${original.title} (Kopie)`, original.subtitle, original.description,
    'entwurf', null, null, original.duration,
    original.hosts, original.guests, original.tags,
    original.blocks, '[]', original.notes, req.user!.id
  ]);

  const episode = db.get('SELECT * FROM episodes WHERE id = ?', [newId]);
  return res.status(201).json({ success: true, data: parseEpisode(episode) });
});

export default router;
