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
    technicalData: JSON.parse(row.technical_data || '{}'),
    productionInfo: row.production_info || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    recordingDate: row.recording_date,
    publishDate: row.publish_date,
    ideaId: row.idea_id || null,
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
    tags, blocks, sponsors, notes, productionInfo, technicalData,
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
      production_info = ?,
      technical_data = COALESCE(?, technical_data),
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
    productionInfo ?? null,
    technicalData ? JSON.stringify(technicalData) : null,
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

// POST /api/episodes/:id/export-pdf
router.get('/:id/export-pdf', requirePermission('canViewEpisodes') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const row = db.get('SELECT * FROM episodes WHERE id = ?', [req.params.id]) as any;

  if (!row) {
    return res.status(404).json({ success: false, error: 'Episode nicht gefunden' });
  }

  const ep = parseEpisode(row);
  const PDFDocument = require('pdfkit');
  const fs = require('fs');
  const path = require('path');
  const { DATA_DIR } = require('../database');
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="episode-${ep.number || ep.id}.pdf"`);
  doc.pipe(res);

  // ── Branding: Logo + Podcast Name ────────────────────────────────
  const brandingDir = path.join(DATA_DIR, 'branding');
  let logoPath: string | null = null;
  if (fs.existsSync(brandingDir)) {
    const brandingFiles = fs.readdirSync(brandingDir);
    const logoFile = brandingFiles.find((f: string) => f.startsWith('logo.'));
    if (logoFile) logoPath = path.join(brandingDir, logoFile);
  }

  // Get podcast name from settings
  const settingsRow = db.get("SELECT value FROM settings WHERE key = 'app'") as any;
  const appSettings = settingsRow ? JSON.parse(settingsRow.value) : {};
  const podcastName = appSettings?.branding?.podcastName || appSettings?.general?.podcastName || 'PodCore';

  // Header row: logo on left, podcast name + title on right
  const headerY = doc.y;
  if (logoPath && fs.existsSync(logoPath)) {
    try {
      doc.image(logoPath, 50, headerY, { fit: [80, 50], align: 'left' });
      doc.text('', 145, headerY); // Move cursor to right of logo
    } catch (_) {
      // If logo fails to load, continue without it
    }
  }

  doc.fontSize(9).font('Helvetica').fillColor('#888').text(podcastName, { align: logoPath ? 'right' : 'center' });
  doc.fontSize(20).font('Helvetica-Bold').fillColor('#000').text('Episoden-Dokument', { align: logoPath ? 'right' : 'center' });
  doc.moveDown(0.5);

  // Divider below header
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e0e0e0').lineWidth(1).stroke();
  doc.moveDown(0.5);
  doc.fontSize(16).font('Helvetica-Bold').text(
    `${ep.number ? `#${ep.number} — ` : ''}${ep.title}`,
    { align: 'center' }
  );
  if (ep.subtitle) {
    doc.fontSize(11).font('Helvetica').fillColor('#666').text(ep.subtitle, { align: 'center' });
  }
  doc.fillColor('#000');
  doc.moveDown();

  // ── Meta ────────────────────────────────────────────────────
  doc.fontSize(9).font('Helvetica').fillColor('#888');
  const metaLine = [
    ep.status && `Status: ${ep.status}`,
    ep.recordingDate && `Aufnahme: ${new Date(ep.recordingDate).toLocaleDateString('de-DE')}`,
    ep.publishDate && `Veröffentlichung: ${new Date(ep.publishDate).toLocaleDateString('de-DE')}`,
    ep.hosts?.length && `Hosts: ${ep.hosts.join(', ')}`,
    ep.guests?.length && `Gäste: ${ep.guests.join(', ')}`,
  ].filter(Boolean).join('   |   ');
  if (metaLine) doc.text(metaLine);
  doc.fillColor('#000');
  doc.moveDown();

  // Divider
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
  doc.moveDown(0.5);

  // ── Description ─────────────────────────────────────────────
  if (ep.description) {
    doc.fontSize(12).font('Helvetica-Bold').text('Beschreibung');
    doc.fontSize(10).font('Helvetica').text(ep.description, { paragraphGap: 4 });
    doc.moveDown();
  }

  // ── Blocks / Script ─────────────────────────────────────────
  if (ep.blocks?.length > 0) {
    doc.fontSize(12).font('Helvetica-Bold').text('Script & Blöcke');
    doc.moveDown(0.3);
    const blockColors: Record<string, string> = {
      intro: '#0891b2', segment: '#2563eb', interview: '#7c3aed',
      ad: '#d97706', jingle: '#059669', outro: '#dc2626', custom: '#6b7280',
    };
    for (const block of ep.blocks) {
      const color = blockColors[block.type] || '#6b7280';
      doc.fontSize(10).font('Helvetica-Bold').fillColor(color)
        .text(`[${(block.type || 'block').toUpperCase()}] ${block.title || ''}${block.duration ? ` (${block.duration}s)` : ''}`);
      doc.fillColor('#000');
      if (block.content) {
        doc.fontSize(10).font('Helvetica').text(block.content, { indent: 15, paragraphGap: 3 });
      }
      doc.moveDown(0.5);
    }
    doc.moveDown(0.5);
  }

  // ── Production Info ─────────────────────────────────────────
  if (ep.productionInfo) {
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica-Bold').text('Produktions-Informationen');
    doc.fontSize(10).font('Helvetica').text(ep.productionInfo, { paragraphGap: 4 });
    doc.moveDown();
  }

  // ── Technical Data ──────────────────────────────────────────
  const td = ep.technicalData || {};
  const tdFields = Object.entries(td).filter(([, v]) => v);
  if (tdFields.length > 0) {
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica-Bold').text('Technische Daten');
    doc.moveDown(0.3);
    for (const [key, value] of tdFields) {
      doc.fontSize(10);
      doc.font('Helvetica-Bold').text(`${key}: `, { continued: true });
      doc.font('Helvetica').text(String(value));
    }
    doc.moveDown();
  }

  // ── Notes ───────────────────────────────────────────────────
  if (ep.notes) {
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica-Bold').text('Interne Notizen');
    doc.fontSize(10).font('Helvetica').fillColor('#555').text(ep.notes, { paragraphGap: 4 });
    doc.fillColor('#000');
    doc.moveDown();
  }

  // ── Footer ──────────────────────────────────────────────────
  doc.fontSize(8).fillColor('#aaa').text(
    `Erstellt mit PodCore — ${new Date().toLocaleDateString('de-DE')}`,
    50, 780, { align: 'center' }
  );

  doc.end();
});

// ============================================================
// EPISODE APPROVAL WORKFLOW
// ============================================================

// GET /api/episodes/pending-approval — list episodes awaiting approval
router.get('/pending-approval', requirePermission('canViewEpisodes') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const episodes = db.all(
    `SELECT * FROM episodes WHERE approval_status = 'angefragt' ORDER BY approval_requested_at ASC`,
    []
  ).map(parseEpisode);
  return res.json({ success: true, data: episodes });
});

// POST /api/episodes/:id/request-approval — request approval for an episode
router.post('/:id/request-approval', requirePermission('canRequestApproval') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const episode = db.get('SELECT * FROM episodes WHERE id = ?', [req.params.id]) as any;
  if (!episode) return res.status(404).json({ success: false, error: 'Episode nicht gefunden' });

  // Check if workflow is enabled
  const settingsRow = db.get("SELECT value FROM settings WHERE key = 'app'") as any;
  const settings = settingsRow ? JSON.parse(settingsRow.value) : {};
  const workflowEnabled = settings?.workflow?.episodeApprovalRequired === true;

  if (!workflowEnabled) {
    return res.status(400).json({ success: false, error: 'Freigabe-Workflow ist nicht aktiviert' });
  }

  db.run(
    `UPDATE episodes SET approval_status = 'angefragt', approval_requested_by = ?, approval_requested_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
    [req.user!.id, req.params.id]
  );

  const updated = db.get('SELECT * FROM episodes WHERE id = ?', [req.params.id]);
  return res.json({ success: true, data: parseEpisode(updated), message: 'Freigabe angefragt' });
});

// POST /api/episodes/:id/approve — approve an episode
router.post('/:id/approve', requirePermission('canApproveEpisodes') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const episode = db.get('SELECT * FROM episodes WHERE id = ?', [req.params.id]) as any;
  if (!episode) return res.status(404).json({ success: false, error: 'Episode nicht gefunden' });

  const { notes } = req.body;

  db.run(
    `UPDATE episodes SET approval_status = 'freigegeben', approved_by = ?, approved_at = datetime('now'), approval_notes = ?, updated_at = datetime('now') WHERE id = ?`,
    [req.user!.id, notes || null, req.params.id]
  );

  const updated = db.get('SELECT * FROM episodes WHERE id = ?', [req.params.id]);
  return res.json({ success: true, data: parseEpisode(updated), message: 'Episode freigegeben' });
});

// POST /api/episodes/:id/reject — reject an episode (send back for revision)
router.post('/:id/reject', requirePermission('canApproveEpisodes') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const episode = db.get('SELECT * FROM episodes WHERE id = ?', [req.params.id]) as any;
  if (!episode) return res.status(404).json({ success: false, error: 'Episode nicht gefunden' });

  const { notes } = req.body;

  db.run(
    `UPDATE episodes SET approval_status = 'abgelehnt', approved_by = ?, approved_at = datetime('now'), approval_notes = ?, updated_at = datetime('now') WHERE id = ?`,
    [req.user!.id, notes || null, req.params.id]
  );

  const updated = db.get('SELECT * FROM episodes WHERE id = ?', [req.params.id]);
  return res.json({ success: true, data: parseEpisode(updated), message: 'Episode zur Überarbeitung zurückgegeben' });
});

// POST /api/episodes/:id/reset-approval — reset approval status (back to pending)
router.post('/:id/reset-approval', requirePermission('canEditEpisodes') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const episode = db.get('SELECT * FROM episodes WHERE id = ?', [req.params.id]) as any;
  if (!episode) return res.status(404).json({ success: false, error: 'Episode nicht gefunden' });

  db.run(
    `UPDATE episodes SET approval_status = 'ausstehend', approved_by = NULL, approved_at = NULL, approval_notes = NULL, approval_requested_by = NULL, approval_requested_at = NULL, updated_at = datetime('now') WHERE id = ?`,
    [req.params.id]
  );

  const updated = db.get('SELECT * FROM episodes WHERE id = ?', [req.params.id]);
  return res.json({ success: true, data: parseEpisode(updated), message: 'Freigabe-Status zurückgesetzt' });
});

export default router;
