import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getDb, DATA_DIR } from '../database';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';
import { broadcastRealtime } from '../services/realtime';

const router: import("express").Router = Router();
router.use(requireAuth as any);

function broadcastIdeaUpdated(db: any, ideaId: string, req: AuthRequest, scope: string): void {
  const idea = db.get('SELECT episode_id FROM ideas WHERE id = ?', [ideaId]) as any;
  const linked = db.all('SELECT id FROM episodes WHERE idea_id = ?', [ideaId]) as any[];
  const episodeIds = new Set<string>([idea?.episode_id, ...linked.map(row => row.id)].filter(Boolean));
  const payload = { ideaId, scope, changedBy: req.user?.displayName || req.user?.username };
  if (!episodeIds.size) broadcastRealtime({ type: 'editorial.idea.updated', userId: req.user?.id, payload });
  episodeIds.forEach(episodeId => broadcastRealtime({ type: 'editorial.idea.updated', episodeId, userId: req.user?.id, payload }));
}

function broadcastEditorialResourceUpdated(db: any, resource: any, req: AuthRequest, scope: string): void {
  const ideaId = resource?.related_idea_id || resource?.idea_id || null;
  const episodeId = resource?.related_episode_id || resource?.episode_id || null;
  if (ideaId) broadcastIdeaUpdated(db, ideaId, req, scope);
  if (episodeId) broadcastRealtime({ type: 'editorial.idea.updated', episodeId, userId: req.user?.id, payload: { ideaId, scope, changedBy: req.user?.displayName || req.user?.username } });
}

const TOPIC_DRAFT_STATUSES = new Set(['draft', 'review', 'ready']);
const TEXT_BLOCK_TYPES = new Set(['intro', 'outro', 'teaser', 'description', 'show-notes', 'cta', 'sponsor', 'transition', 'question', 'custom']);

function normalizeTopicDraft(row: any): any {
  if (!row) return null;
  return {
    id: row.id,
    ideaId: row.idea_id,
    angle: row.angle || '',
    guidingQuestion: row.guiding_question || '',
    coreThesis: row.core_thesis || '',
    audienceValue: row.audience_value || '',
    workingTitles: JSON.parse(row.working_titles || '[]'),
    teaser: row.teaser || '',
    episodeDescription: row.episode_description || '',
    showNotes: row.show_notes || '',
    callToAction: row.call_to_action || '',
    body: row.body || '',
    status: row.status || 'draft',
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeTextBlock(row: any): any {
  return {
    id: row.id,
    ideaId: row.idea_id,
    title: row.title,
    type: row.block_type,
    content: row.content,
    tags: JSON.parse(row.tags || '[]'),
    isFavorite: row.is_favorite === 1,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeInterviewQuestion(row: any): any {
  return {
    ...row,
    answered: row.answered === 1,
    approved: row.approved === 1,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    partnerId: row.partner_id,
    episodeId: row.episode_id,
    ideaId: row.idea_id,
    isPool: row.is_pool === 1,
    sourceQuestionId: row.source_question_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function cleanQuestionPoolText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

// ============================================================
// IDEAS
// ============================================================

router.get('/ideas', requirePermission('canViewIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { status, priority, search } = req.query;
  let query = 'SELECT * FROM ideas WHERE deleted_at IS NULL';
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

// Papierkorb: gelöschte Ideenmappen bleiben samt verknüpften Daten wiederherstellbar.
router.get('/ideas/trash', requirePermission('canViewIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const ideas = db.all(
    `SELECT * FROM ideas WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC, updated_at DESC`,
    []
  ).map((r: any) => ({
    ...r,
    tags: JSON.parse(r.tags || '[]'),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
    deletedBy: r.deleted_by,
    createdBy: r.created_by,
    assignedTo: r.assigned_to,
    episodeId: r.episode_id,
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
  broadcastIdeaUpdated(db, req.params.id, req, 'idea');
  return res.json({ success: true, data: { ...idea, tags: JSON.parse(idea.tags), createdAt: idea.created_at, updatedAt: idea.updated_at, createdBy: idea.created_by } });
});

router.delete('/ideas/:id', requirePermission('canDeleteIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const idea = db.get('SELECT id FROM ideas WHERE id = ? AND deleted_at IS NULL', [req.params.id]) as any;
  if (!idea) return res.status(404).json({ success: false, error: 'Aktive Idee nicht gefunden' });

  db.run(
    `UPDATE ideas SET deleted_at = datetime('now'), deleted_by = ?, updated_at = datetime('now') WHERE id = ?`,
    [req.user!.id, req.params.id]
  );
  broadcastIdeaUpdated(db, req.params.id, req, 'idea-deleted');
  return res.json({ success: true, message: 'Idee in den Papierkorb verschoben' });
});

router.post('/ideas/:id/restore', requirePermission('canEditIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const idea = db.get('SELECT id FROM ideas WHERE id = ? AND deleted_at IS NOT NULL', [req.params.id]) as any;
  if (!idea) return res.status(404).json({ success: false, error: 'Gelöschte Idee nicht gefunden' });

  db.run(
    `UPDATE ideas SET deleted_at = NULL, deleted_by = NULL, updated_at = datetime('now') WHERE id = ?`,
    [req.params.id]
  );
  const restored = db.get('SELECT * FROM ideas WHERE id = ?', [req.params.id]) as any;
  broadcastIdeaUpdated(db, req.params.id, req, 'idea-restored');
  return res.json({
    success: true,
    data: {
      ...restored,
      tags: JSON.parse(restored.tags || '[]'),
      createdAt: restored.created_at,
      updatedAt: restored.updated_at,
      createdBy: restored.created_by,
      assignedTo: restored.assigned_to,
      episodeId: restored.episode_id,
    },
    message: 'Idee wiederhergestellt',
  });
});

// GET single idea with all sub-resources
router.get('/ideas/:id', requirePermission('canViewIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const idea = db.get('SELECT * FROM ideas WHERE id = ? AND deleted_at IS NULL', [req.params.id]) as any;
  if (!idea) return res.status(404).json({ success: false, error: 'Idee nicht gefunden oder im Papierkorb' });
  const formatted = {
    ...idea,
    tags: JSON.parse(idea.tags || '[]'),
    createdAt: idea.created_at, updatedAt: idea.updated_at, createdBy: idea.created_by,
    assignedTo: idea.assigned_to, episodeId: idea.episode_id,
    targetAudience: idea.target_audience, episodeFormat: idea.episode_format,
    targetDuration: idea.target_duration, targetDate: idea.target_date, coverImage: idea.cover_image,
  };
  return res.json({ success: true, data: formatted });
});

// UPDATE idea with extended fields
router.patch('/ideas/:id', requirePermission('canEditIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { title, description, status, priority, tags, assignedTo, episodeId,
    targetAudience, episodeFormat, targetDuration, targetDate } = req.body;
  db.run(`UPDATE ideas SET
    title = COALESCE(?, title), description = ?, status = COALESCE(?, status),
    priority = COALESCE(?, priority), tags = COALESCE(?, tags), assigned_to = ?,
    episode_id = ?, target_audience = ?, episode_format = ?,
    target_duration = ?, target_date = ?, updated_at = datetime('now') WHERE id = ?`,
    [title ?? null, description ?? null, status ?? null, priority ?? null,
     tags ? JSON.stringify(tags) : null, assignedTo ?? null, episodeId ?? null,
     targetAudience ?? null, episodeFormat ?? null, targetDuration ?? null, targetDate ?? null,
     req.params.id]);
  const idea = db.get('SELECT * FROM ideas WHERE id = ?', [req.params.id]) as any;
  if (!idea) return res.status(404).json({ success: false, error: 'Idee nicht gefunden' });
  broadcastIdeaUpdated(db, req.params.id, req, 'idea');
  return res.json({ success: true, data: { ...idea, tags: JSON.parse(idea.tags || '[]'), createdAt: idea.created_at, updatedAt: idea.updated_at } });
});

// ============================================================
// IDEA CHECKLISTS
// ============================================================

router.get('/ideas/:id/checklists', requirePermission('canViewIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const items = db.all('SELECT * FROM idea_checklists WHERE idea_id = ? ORDER BY sort_order ASC, created_at ASC', [req.params.id]);
  return res.json({ success: true, data: items.map((r: any) => ({ ...r, isDone: r.is_done === 1, ideaId: r.idea_id, createdAt: r.created_at, updatedAt: r.updated_at })) });
});

router.post('/ideas/:id/checklists', requirePermission('canEditIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { title, sortOrder = 0 } = req.body;
  if (!title) return res.status(400).json({ success: false, error: 'Titel erforderlich' });
  const itemId = uuidv4();
  db.run('INSERT INTO idea_checklists (id, idea_id, title, sort_order) VALUES (?, ?, ?, ?)', [itemId, req.params.id, title, sortOrder]);
  const item = db.get('SELECT * FROM idea_checklists WHERE id = ?', [itemId]) as any;
  broadcastIdeaUpdated(db, req.params.id, req, 'checklist');
  return res.status(201).json({ success: true, data: { ...item, isDone: item.is_done === 1, ideaId: item.idea_id } });
});

router.put('/ideas/:id/checklists/:itemId', requirePermission('canEditIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { title, isDone, sortOrder } = req.body;
  db.run(`UPDATE idea_checklists SET title = COALESCE(?, title), is_done = COALESCE(?, is_done), sort_order = COALESCE(?, sort_order), updated_at = datetime('now') WHERE id = ? AND idea_id = ?`,
    [title ?? null, isDone !== undefined ? (isDone ? 1 : 0) : null, sortOrder ?? null, req.params.itemId, req.params.id]);
  const item = db.get('SELECT * FROM idea_checklists WHERE id = ?', [req.params.itemId]) as any;
  broadcastIdeaUpdated(db, req.params.id, req, 'checklist');
  return res.json({ success: true, data: { ...item, isDone: item.is_done === 1, ideaId: item.idea_id } });
});

router.delete('/ideas/:id/checklists/:itemId', requirePermission('canEditIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.run('DELETE FROM idea_checklists WHERE id = ? AND idea_id = ?', [req.params.itemId, req.params.id]);
  broadcastIdeaUpdated(db, req.params.id, req, 'checklist');
  return res.json({ success: true, message: 'Aufgabe gelöscht' });
});

// ============================================================
// IDEA NOTES
// ============================================================

router.get('/ideas/:id/notes', requirePermission('canViewIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const notes = db.all('SELECT * FROM idea_notes WHERE idea_id = ? ORDER BY created_at DESC', [req.params.id]);
  return res.json({ success: true, data: notes.map((r: any) => ({ ...r, ideaId: r.idea_id, createdBy: r.created_by, createdAt: r.created_at, updatedAt: r.updated_at })) });
});

router.post('/ideas/:id/notes', requirePermission('canEditIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { content } = req.body;
  if (!content) return res.status(400).json({ success: false, error: 'Inhalt erforderlich' });
  const noteId = uuidv4();
  db.run('INSERT INTO idea_notes (id, idea_id, content, created_by) VALUES (?, ?, ?, ?)', [noteId, req.params.id, content, req.user!.id]);
  const note = db.get('SELECT * FROM idea_notes WHERE id = ?', [noteId]) as any;
  broadcastIdeaUpdated(db, req.params.id, req, 'notes');
  return res.status(201).json({ success: true, data: { ...note, ideaId: note.idea_id, createdBy: note.created_by, createdAt: note.created_at } });
});

router.put('/ideas/:id/notes/:noteId', requirePermission('canEditIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { content } = req.body;
  db.run(`UPDATE idea_notes SET content = COALESCE(?, content), updated_at = datetime('now') WHERE id = ? AND idea_id = ?`, [content ?? null, req.params.noteId, req.params.id]);
  const note = db.get('SELECT * FROM idea_notes WHERE id = ?', [req.params.noteId]) as any;
  broadcastIdeaUpdated(db, req.params.id, req, 'notes');
  return res.json({ success: true, data: { ...note, ideaId: note.idea_id, createdBy: note.created_by, createdAt: note.created_at } });
});

router.delete('/ideas/:id/notes/:noteId', requirePermission('canEditIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.run('DELETE FROM idea_notes WHERE id = ? AND idea_id = ?', [req.params.noteId, req.params.id]);
  broadcastIdeaUpdated(db, req.params.id, req, 'notes');
  return res.json({ success: true, message: 'Notiz gelöscht' });
});

// ============================================================
// IDEA UPLOADS
// ============================================================

const ideaUploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(DATA_DIR, 'idea-uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});
const ideaUpload = multer({ storage: ideaUploadStorage, limits: { fileSize: 50 * 1024 * 1024 } });

router.get('/ideas/:id/uploads', requirePermission('canViewIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const uploads = db.all('SELECT * FROM idea_uploads WHERE idea_id = ? ORDER BY created_at DESC', [req.params.id]);
  return res.json({ success: true, data: uploads.map((r: any) => ({ ...r, ideaId: r.idea_id, uploadedBy: r.uploaded_by, originalName: r.original_name, mimeType: r.mime_type, createdAt: r.created_at })) });
});

router.post('/ideas/:id/uploads', requirePermission('canEditIdeas') as any, ideaUpload.single('file') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  if (!req.file) return res.status(400).json({ success: false, error: 'Keine Datei hochgeladen' });
  const { description } = req.body;
  const uploadId = uuidv4();
  db.run('INSERT INTO idea_uploads (id, idea_id, filename, original_name, filepath, filesize, mime_type, description, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [uploadId, req.params.id, req.file.filename, req.file.originalname, req.file.path, req.file.size, req.file.mimetype, description || null, req.user!.id]);
  const upload = db.get('SELECT * FROM idea_uploads WHERE id = ?', [uploadId]) as any;
  broadcastIdeaUpdated(db, req.params.id, req, 'uploads');
  return res.status(201).json({ success: true, data: { ...upload, ideaId: upload.idea_id, uploadedBy: upload.uploaded_by, originalName: upload.original_name, mimeType: upload.mime_type, createdAt: upload.created_at } });
});

router.delete('/ideas/:id/uploads/:uploadId', requirePermission('canEditIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const upload = db.get('SELECT * FROM idea_uploads WHERE id = ? AND idea_id = ?', [req.params.uploadId, req.params.id]) as any;
  if (!upload) return res.status(404).json({ success: false, error: 'Datei nicht gefunden' });
  try { if (fs.existsSync(upload.filepath)) fs.unlinkSync(upload.filepath); } catch (_) {}
  db.run('DELETE FROM idea_uploads WHERE id = ?', [req.params.uploadId]);
  broadcastIdeaUpdated(db, req.params.id, req, 'uploads');
  return res.json({ success: true, message: 'Datei gelöscht' });
});

// Serve idea upload files
router.get('/ideas/:id/uploads/:uploadId/download', requirePermission('canViewIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const upload = db.get('SELECT * FROM idea_uploads WHERE id = ? AND idea_id = ?', [req.params.uploadId, req.params.id]) as any;
  if (!upload || !fs.existsSync(upload.filepath)) return res.status(404).json({ success: false, error: 'Datei nicht gefunden' });
  res.download(upload.filepath, upload.original_name);
});

// ============================================================
// EXPORT IDEA AS PDF
// ============================================================

router.get('/ideas/:id/export-pdf', requirePermission('canViewIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const idea = db.get('SELECT * FROM ideas WHERE id = ?', [req.params.id]) as any;
  if (!idea) return res.status(404).json({ success: false, error: 'Idee nicht gefunden' });

  try {
    const PDFDocument = require('pdfkit');
    const path = require('path');
    const fs = require('fs');
    const { DATA_DIR } = require('../database');
    const { getDefaultLayoutForType, getLayoutById, renderPdfHeader, renderPdfFooter, renderSectionHeading, renderWatermark } = require('../pdfLayouts');

    const layoutId = req.query.layoutId as string | undefined;
    const layout = layoutId ? (getLayoutById(layoutId) || getDefaultLayoutForType('idea')) : getDefaultLayoutForType('idea');
    const m = layout.pageMargin;

    // Anpassbarer Dokumententitel
    const customDocTitle = req.query.documentTitle as string | undefined;
    const documentTitle = customDocTitle ? decodeURIComponent(customDocTitle) : 'Ideenmappe';

    const doc = new PDFDocument({ margin: m, size: layout.pageSize, layout: layout.pageOrientation === 'landscape' ? 'landscape' : 'portrait', autoFirstPage: true });
    const filename = `Ideenmappe_${idea.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    // Branding
    const brandingDir = path.join(DATA_DIR, 'branding');
    let logoPath: string | null = null;
    if (fs.existsSync(brandingDir)) {
      const lf = fs.readdirSync(brandingDir).find((f: string) => f.startsWith('logo.'));
      if (lf) logoPath = path.join(brandingDir, lf);
    }
    const settingsRow = db.get("SELECT value FROM settings WHERE key = 'app'") as any;
    const appSettings = settingsRow ? JSON.parse(settingsRow.value) : {};
    const podcastName = appSettings?.branding?.podcastName || appSettings?.general?.podcastName || 'PodCore';

    // Header
    renderPdfHeader(doc, layout, { podcastName, documentTitle, logoPath });

    // Titel
    doc.fontSize(layout.typography.subtitleSize + 2).font(`${layout.typography.fontFamily}-Bold`)
      .fillColor(layout.colors.primary).text(idea.title, { align: 'center' });
    doc.fontSize(layout.typography.smallSize).font(layout.typography.fontFamily)
      .fillColor(layout.colors.muted)
      .text(`Erstellt: ${new Date(idea.created_at).toLocaleDateString('de-DE')}`, { align: 'center' });
    doc.moveDown(0.8);

    // Beschreibung
    if (layout.sections.showIdeaDescription && idea.description) {
      renderSectionHeading(doc, layout, 'Beschreibung');
      doc.fontSize(layout.typography.bodySize).font(layout.typography.fontFamily)
        .fillColor(layout.colors.text).text(idea.description);
      doc.moveDown(0.5);
    }

    // Metadaten
    renderSectionHeading(doc, layout, 'Informationen');
    doc.fontSize(layout.typography.bodySize).font(layout.typography.fontFamily).fillColor(layout.colors.text);
    doc.text(`Status: ${idea.status}`);
    doc.text(`Priorität: ${idea.priority}`);
    if (idea.assigned_to) doc.text(`Zugewiesen an: ${idea.assigned_to}`);
    if (idea.tags && idea.tags !== '[]') doc.text(`Tags: ${JSON.parse(idea.tags).join(', ')}`);
    doc.moveDown(0.5);

    // Themenwerkstatt
    const topicWorkshop = db.get('SELECT * FROM idea_topic_drafts WHERE idea_id = ?', [req.params.id]) as any;
    if (topicWorkshop) {
      let workingTitles: string[] = [];
      try {
        const parsedTitles = JSON.parse(topicWorkshop.working_titles || '[]');
        if (Array.isArray(parsedTitles)) {
          workingTitles = parsedTitles.map((title: unknown) => String(title).trim()).filter(Boolean);
        }
      } catch {
        workingTitles = [];
      }

      const topicFields = [
        { label: 'Perspektive', value: topicWorkshop.angle },
        { label: 'Leitfrage', value: topicWorkshop.guiding_question },
        { label: 'Kernaussage', value: topicWorkshop.core_thesis },
        { label: 'Zielgruppennutzen', value: topicWorkshop.audience_value },
        { label: 'Teaser', value: topicWorkshop.teaser },
        { label: 'Episodenbeschreibung', value: topicWorkshop.episode_description },
        { label: 'Show Notes', value: topicWorkshop.show_notes },
        { label: 'Call-to-Action', value: topicWorkshop.call_to_action },
        { label: 'Haupttext', value: topicWorkshop.body },
      ].map((field) => ({ ...field, value: String(field.value || '').trim() }));

      if (workingTitles.length > 0 || topicFields.some((field) => field.value)) {
        renderSectionHeading(doc, layout, 'Themenwerkstatt');

        const renderTopicField = (label: string, value: string) => {
          doc.fontSize(layout.typography.bodySize).font(`${layout.typography.fontFamily}-Bold`)
            .fillColor(layout.colors.secondary).text(label);
          doc.fontSize(layout.typography.bodySize).font(layout.typography.fontFamily)
            .fillColor(layout.colors.text).text(value, { paragraphGap: 3 });
          doc.moveDown(0.25);
        };

        topicFields.slice(0, 4).forEach((field) => {
          if (field.value) renderTopicField(field.label, field.value);
        });

        if (workingTitles.length > 0) {
          doc.fontSize(layout.typography.bodySize).font(`${layout.typography.fontFamily}-Bold`)
            .fillColor(layout.colors.secondary).text('Arbeitstitel');
          doc.fontSize(layout.typography.bodySize).font(layout.typography.fontFamily).fillColor(layout.colors.text);
          workingTitles.forEach((title) => doc.text(`• ${title}`, { indent: 10 }));
          doc.moveDown(0.25);
        }

        topicFields.slice(4).forEach((field) => {
          if (field.value) renderTopicField(field.label, field.value);
        });

        doc.moveDown(0.5);
      }
    }

    // Recherche-Quellen
    if (layout.sections.showIdeaResearch) {
      const sources = db.all('SELECT title, url, description FROM research_sources WHERE related_idea_id = ? ORDER BY created_at ASC', [req.params.id]) as any[];
      if (sources.length > 0) {
        renderSectionHeading(doc, layout, 'Recherche-Quellen');
        doc.fontSize(layout.typography.bodySize).font(layout.typography.fontFamily).fillColor(layout.colors.text);
        sources.forEach((s: any) => {
          doc.text(`• ${s.title}${s.url ? ` — ${s.url}` : ''}`);
          if (s.description) doc.text(`  ${s.description}`, { indent: 15 });
        });
        doc.moveDown(0.5);
      }
    }

    // Interview-Fragen
    if (layout.sections.showIdeaQuestions) {
      const questions = db.all('SELECT * FROM interview_questions WHERE idea_id = ? ORDER BY sort_order ASC', [req.params.id]) as any[];
      if (questions.length > 0) {
        renderSectionHeading(doc, layout, 'Interview-Fragen');
        doc.fontSize(layout.typography.bodySize).font(layout.typography.fontFamily).fillColor(layout.colors.text);
        questions.forEach((q: any) => {
          doc.text(`• ${q.question}${q.category ? ` (${q.category})` : ''}`);
        });
        doc.moveDown(0.5);
      }
    }

    // Notizen
    if (layout.sections.showIdeaNotes) {
      const notes = db.all('SELECT content FROM idea_notes WHERE idea_id = ? ORDER BY created_at ASC', [req.params.id]) as any[];
      if (notes.length > 0) {
        renderSectionHeading(doc, layout, 'Notizen');
        doc.fontSize(layout.typography.bodySize).font(layout.typography.fontFamily).fillColor(layout.colors.text);
        notes.forEach((n: any) => { doc.text(`• ${n.content}`); });
        doc.moveDown(0.5);
      }
    }

    // Checkliste
    if (layout.sections.showIdeaChecklist) {
      const checklists = db.all('SELECT * FROM idea_checklists WHERE idea_id = ? ORDER BY sort_order ASC', [req.params.id]) as any[];
      if (checklists.length > 0) {
        renderSectionHeading(doc, layout, 'Checkliste');
        doc.fontSize(layout.typography.bodySize).font(layout.typography.fontFamily).fillColor(layout.colors.text);
        checklists.forEach((item: any) => {
          doc.text(`${item.is_done ? '[x]' : '[ ]'} ${item.title}`);
        });
      }
    }

    renderWatermark(doc, layout);
    renderPdfFooter(doc, layout, { podcastName, pageNum: 1 });
    doc.end();
  } catch (err: any) {
    console.error('[ERROR] PDF export failed:', err);
    return res.status(500).json({ success: false, error: 'PDF-Export fehlgeschlagen' });
  }
});

// ============================================================
// CREATE EPISODE FROM IDEA
// ============================================================

router.post('/ideas/:id/create-episode', requirePermission('canCreateEpisodes') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const idea = db.get('SELECT * FROM ideas WHERE id = ?', [req.params.id]) as any;
  if (!idea) return res.status(404).json({ success: false, error: 'Idee nicht gefunden' });
  if (idea.episode_id) return res.status(409).json({ success: false, error: 'Aus dieser Ideenmappe wurde bereits eine Episode erstellt' });

  const planItem = db.get(
    `SELECT * FROM season_plan_items WHERE idea_id = ? ORDER BY updated_at DESC LIMIT 1`,
    [req.params.id]
  ) as any;

  // Get idea notes to use as show notes
  const ideaNotes = db.all('SELECT content FROM idea_notes WHERE idea_id = ? ORDER BY created_at ASC', [req.params.id]) as any[];
  const notesText = ideaNotes.map((n: any) => n.content).join('\n\n');

  // Get research sources and interview content collected for the idea
  const sources = db.all('SELECT title, url, description FROM research_sources WHERE related_idea_id = ? ORDER BY created_at ASC', [req.params.id]) as any[];
  const questions = db.all('SELECT partner_id, question, category FROM interview_questions WHERE idea_id = ? ORDER BY sort_order ASC', [req.params.id]) as any[];
  const partners = db.all(
    `SELECT p.name FROM idea_interview_partners link
     INNER JOIN interview_partners p ON p.id = link.partner_id
     WHERE link.idea_id = ? ORDER BY p.name COLLATE NOCASE ASC`,
    [req.params.id]
  ) as any[];
  const questionsText = questions.length > 0
    ? '\n\n## Interview-Fragen\n' + questions.map((q: any) => `- ${q.question}${q.category ? ` (${q.category})` : ''}`).join('\n')
    : '';
  const sourcesText = sources.length > 0
    ? '\n\n## Quellen\n' + sources.map((s: any) => `- ${s.title}${s.url ? ` (${s.url})` : ''}${s.description ? `: ${s.description}` : ''}`).join('\n')
    : '';

  let episodeNumber: number | null = null;
  if (planItem) {
    if (planItem.episode_number != null) {
      episodeNumber = Number(planItem.episode_number);
      if (!Number.isInteger(episodeNumber) || episodeNumber < 0) {
        return res.status(400).json({ success: false, error: 'Die in der Staffelplanung gespeicherte Folgennummer ist ungültig' });
      }
    } else {
      const lastEpisode = db.get(
        'SELECT MAX(number) AS max_number FROM episodes WHERE season_id = ? AND number IS NOT NULL',
        [planItem.season_id]
      ) as any;
      episodeNumber = lastEpisode?.max_number == null ? 1 : Number(lastEpisode.max_number) + 1;
    }

    const duplicate = db.get(
      'SELECT id FROM episodes WHERE season_id = ? AND number = ? LIMIT 1',
      [planItem.season_id, episodeNumber]
    ) as any;
    if (duplicate) {
      return res.status(409).json({ success: false, error: `Die Folgennummer ${episodeNumber} ist in dieser Staffel bereits vergeben. Bitte die Planposition anpassen.` });
    }
  }

  const episodeId = uuidv4();
  const { title, description } = req.body;
  try {
    db.exec('BEGIN IMMEDIATE');
    db.run(
      `INSERT INTO episodes
       (id, number, season_id, season_plan_item_id, idea_id, title, description, status, publish_date, guests, tags, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'entwurf', ?, ?, ?, ?, ?)`,
      [
        episodeId,
        episodeNumber,
        planItem?.season_id || null,
        planItem?.id || null,
        req.params.id,
        title || idea.title,
        description || idea.description || '',
        planItem?.planned_date || null,
        JSON.stringify(partners.map((partner: any) => partner.name).filter(Boolean)),
        idea.tags || '[]',
        (notesText + sourcesText + questionsText).trim() || null,
        req.user!.id,
      ]
    );

    // Link idea to episode and update the originating plan position, when present.
    db.run(`UPDATE ideas SET episode_id = ?, status = 'in_bearbeitung', updated_at = datetime('now') WHERE id = ?`, [episodeId, req.params.id]);
    if (planItem) {
      db.run(
        `UPDATE season_plan_items SET episode_id = ?, status = 'in_produktion', updated_at = datetime('now') WHERE id = ?`,
        [episodeId, planItem.id]
      );
    }

    // Copy interview questions to the episode while retaining their planned order.
    questions.forEach((q: any, index: number) => {
      db.run(
        'INSERT INTO interview_questions (id, episode_id, question, category, sort_order, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), episodeId, q.question, q.category || null, index, null]
      );
    });
    db.exec('COMMIT');

    const episode = db.get('SELECT * FROM episodes WHERE id = ?', [episodeId]) as any;
    return res.status(201).json({ success: true, data: { ...episode, episodeId, ideaId: req.params.id } });
  } catch (err: any) {
    try { db.exec('ROLLBACK'); } catch (_) {}
    return res.status(500).json({ success: false, error: err.message || 'Episode konnte nicht aus der Ideenmappe erstellt werden' });
  }
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
// CALENDAR DATA (Episodes + Plan)
// ============================================================

router.get('/calendar/:year/:month', requirePermission('canViewEditorialPlan') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { year, month } = req.params;
  const yearMonth = `${year}-${String(month).padStart(2, '0')}`;

  // Get episodes for this month
  const episodes = db.all(
    `SELECT id, title, number, publish_date, status FROM episodes 
     WHERE strftime('%Y-%m', publish_date) = ? OR strftime('%Y-%m', recording_date) = ?
     ORDER BY publish_date ASC`,
    [yearMonth, yearMonth]
  ) as any[];

  // Get plan entries for this month
  const planEntries = db.all(
    `SELECT id, title, planned_date, status, episode_id FROM editorial_plan 
     WHERE strftime('%Y-%m', planned_date) = ?
     ORDER BY planned_date ASC`,
    [yearMonth]
  ) as any[];

  // Combine into calendar structure
  const calendarData = {
    year: parseInt(year),
    month: parseInt(month),
    episodes: episodes.map((e: any) => ({
      id: e.id, title: e.title, number: e.number,
      date: e.publish_date || e.recording_date,
      status: e.status, type: 'episode'
    })),
    planEntries: planEntries.map((p: any) => ({
      id: p.id, title: p.title, date: p.planned_date,
      status: p.status, episodeId: p.episode_id, type: 'plan'
    }))
  };

  return res.json({ success: true, data: calendarData });
});

// PDF Export for calendar
router.get('/calendar/:year/:month/export-pdf', requirePermission('canViewEditorialPlan') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { year, month } = req.params;
  const yearMonth = `${year}-${String(month).padStart(2, '0')}`;

  try {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    const filename = `Redaktionsplan_${year}_${String(month).padStart(2, '0')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    // Title
    doc.fontSize(20).font('Helvetica-Bold').text('Redaktionsplan', { align: 'center' });
    doc.fontSize(14).font('Helvetica').text(`${new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}`, { align: 'center' });
    doc.moveDown(0.5);

    // Get episodes
    const episodes = db.all(
      `SELECT id, title, number, publish_date, recording_date, status FROM episodes 
       WHERE strftime('%Y-%m', publish_date) = ? OR strftime('%Y-%m', recording_date) = ?
       ORDER BY publish_date ASC`,
      [yearMonth, yearMonth]
    ) as any[];

    // Get plan entries
    const planEntries = db.all(
      `SELECT id, title, planned_date, status FROM editorial_plan 
       WHERE strftime('%Y-%m', planned_date) = ?
       ORDER BY planned_date ASC`,
      [yearMonth]
    ) as any[];

    // Episodes section
    if (episodes.length > 0) {
      doc.fontSize(12).font('Helvetica-Bold').text('Episoden', { underline: true });
      doc.fontSize(10).font('Helvetica');
      episodes.forEach((e: any) => {
        const date = e.publish_date || e.recording_date;
        doc.text(`• Folge ${e.number}: "${e.title}" (${new Date(date).toLocaleDateString('de-DE')}) - ${e.status}`);
      });
      doc.moveDown(0.5);
    }

    // Plan entries section
    if (planEntries.length > 0) {
      doc.fontSize(12).font('Helvetica-Bold').text('Redaktionsplan-Einträge', { underline: true });
      doc.fontSize(10).font('Helvetica');
      planEntries.forEach((p: any) => {
        doc.text(`• ${p.title} (${new Date(p.planned_date).toLocaleDateString('de-DE')}) - ${p.status}`);
      });
    }

    doc.end();
  } catch (err: any) {
    console.error('[ERROR] Calendar PDF export failed:', err);
    return res.status(500).json({ success: false, error: 'PDF-Export fehlgeschlagen' });
  }
});

// ============================================================
// INTERVIEW PARTNERS
// ============================================================

router.get('/interviews/partners', requirePermission('canViewInterviews') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const requestedIdeaId = typeof req.query.ideaId === 'string' ? req.query.ideaId.trim() : '';
  const partners = requestedIdeaId
    ? db.all(
        `SELECT DISTINCT partner.*
         FROM interview_partners partner
         LEFT JOIN idea_interview_partners link ON link.partner_id = partner.id
         WHERE partner.idea_id = ? OR link.idea_id = ?
         ORDER BY partner.name ASC`,
        [requestedIdeaId, requestedIdeaId]
      )
    : db.all('SELECT * FROM interview_partners ORDER BY name ASC', []);
  return res.json({
    success: true,
    data: partners.map((r: any) => ({
      ...r, tags: JSON.parse(r.tags || '[]'), episodes: JSON.parse(r.episodes || '[]'),
      status: r.status || 'offen', createdAt: r.created_at, updatedAt: r.updated_at, guestIntro: r.guest_intro,
    })),
  });
});

router.post('/interviews/partners', requirePermission('canEditInterviews') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const id = uuidv4();
  const { name, company, role, email, phone, bio, tags = [], episodes = [], notes, guestIntro, status = 'offen', ideaId } = req.body;
  const normalizedIdeaId = typeof ideaId === 'string' && ideaId.trim() ? ideaId.trim() : null;

  if (!name) return res.status(400).json({ success: false, error: 'Name erforderlich' });
  if (normalizedIdeaId && !db.get('SELECT id FROM ideas WHERE id = ?', [normalizedIdeaId])) {
    return res.status(404).json({ success: false, error: 'Verknüpfte Ideenmappe nicht gefunden' });
  }

  db.run(
    'INSERT INTO interview_partners (id, name, company, role, email, phone, bio, tags, episodes, notes, guest_intro, status, idea_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, name, company || null, role || null, email || null, phone || null, bio || null, JSON.stringify(tags), JSON.stringify(episodes), notes || null, guestIntro || null, status || 'offen', normalizedIdeaId]
  );
  if (normalizedIdeaId) {
    db.run('INSERT OR IGNORE INTO idea_interview_partners (idea_id, partner_id) VALUES (?, ?)', [normalizedIdeaId, id]);
  }

  const partner = db.get('SELECT * FROM interview_partners WHERE id = ?', [id]) as any;
  return res.status(201).json({
    success: true,
    data: {
      ...partner,
      tags: JSON.parse(partner.tags),
      episodes: JSON.parse(partner.episodes),
      status: partner.status || 'offen',
      ideaId: partner.idea_id,
      guestIntro: partner.guest_intro,
      createdAt: partner.created_at,
    },
  });
});

router.put('/interviews/partners/:id', requirePermission('canEditInterviews') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { name, company, role, email, phone, bio, tags, episodes, notes, guestIntro, status } = req.body;

  db.run(`UPDATE interview_partners SET name = COALESCE(?, name), company = ?, role = ?, email = ?, phone = ?, bio = ?, tags = COALESCE(?, tags), episodes = COALESCE(?, episodes), notes = ?, guest_intro = ?, status = COALESCE(?, status), updated_at = datetime('now') WHERE id = ?`,
    [name ?? null, company ?? null, role ?? null, email ?? null, phone ?? null, bio ?? null, tags ? JSON.stringify(tags) : null, episodes ? JSON.stringify(episodes) : null, notes ?? null, guestIntro ?? null, status ?? null, req.params.id]);

  const partner = db.get('SELECT * FROM interview_partners WHERE id = ?', [req.params.id]) as any;
  return res.json({ success: true, data: { ...partner, tags: JSON.parse(partner.tags), episodes: JSON.parse(partner.episodes), status: partner.status || 'offen', createdAt: partner.created_at, guestIntro: partner.guest_intro } });
});

router.delete('/interviews/partners/:id', requirePermission('canEditInterviews') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.run('DELETE FROM interview_partners WHERE id = ?', [req.params.id]);
  db.run('DELETE FROM interview_questions WHERE partner_id = ?', [req.params.id]);
  return res.json({ success: true, message: 'Partner gelöscht' });
});

// Allgemeiner Fragen-Pool
router.get('/interviews/question-pool', requirePermission('canViewInterviews') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const category = cleanQuestionPoolText(req.query.category, 120);
  const search = cleanQuestionPoolText(req.query.search, 300);
  let query = 'SELECT * FROM interview_questions WHERE is_pool = 1';
  const params: any[] = [];

  if (category) {
    query += ' AND COALESCE(category, ?) = ?';
    params.push('Allgemein', category);
  }
  if (search) {
    query += ' AND (question LIKE ? OR COALESCE(notes, ?) LIKE ? OR COALESCE(category, ?) LIKE ?)';
    const term = `%${search}%`;
    params.push(term, '', term, '', term);
  }
  query += " ORDER BY LOWER(COALESCE(NULLIF(TRIM(category), ''), 'Allgemein')) ASC, sort_order ASC, created_at ASC, question ASC";

  const questions = db.all(query, params).map(normalizeInterviewQuestion);
  return res.json({ success: true, data: questions });
});

router.get('/interviews/question-pool/export-pdf', requirePermission('canViewInterviews') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const category = cleanQuestionPoolText(req.query.category, 120);
  const search = cleanQuestionPoolText(req.query.search, 300);
  const requestedIds = cleanQuestionPoolText(req.query.questionIds, 20000)
    .split(',')
    .map((id: string) => id.trim())
    .filter(Boolean)
    .slice(0, 500);

  let query = 'SELECT * FROM interview_questions WHERE is_pool = 1';
  const params: any[] = [];
  if (category) {
    query += ' AND COALESCE(NULLIF(TRIM(category), ?), ?) = ?';
    params.push('', 'Allgemein', category);
  }
  if (search) {
    query += ' AND (question LIKE ? OR COALESCE(notes, ?) LIKE ? OR COALESCE(category, ?) LIKE ?)';
    const term = `%${search}%`;
    params.push(term, '', term, '', term);
  }
  if (requestedIds.length > 0) {
    query += ` AND id IN (${requestedIds.map(() => '?').join(', ')})`;
    params.push(...requestedIds);
  }
  query += " ORDER BY LOWER(COALESCE(NULLIF(TRIM(category), ''), 'Allgemein')) ASC, sort_order ASC, created_at ASC, question ASC";

  const questions = db.all(query, params) as any[];
  if (!questions.length) {
    return res.status(404).json({ success: false, error: 'Keine Pool-Fragen für den PDF-Export gefunden' });
  }

  try {
    const PDFDocument = require('pdfkit');
    const { getDefaultLayoutForType, getLayoutById, renderPdfHeader, renderPdfFooter, renderWatermark } = require('../pdfLayouts');
    const layoutId = typeof req.query.layoutId === 'string' ? req.query.layoutId : undefined;
    const layout = layoutId ? (getLayoutById(layoutId) || getDefaultLayoutForType('question_pool')) : getDefaultLayoutForType('question_pool');
    const margin = layout.pageMargin;
    const documentTitle = cleanQuestionPoolText(req.query.documentTitle, 160) || 'Allgemeiner Fragen-Pool';
    const showNotes = layout.sections.showQuestionPoolNotes !== false;

    const settingsRow = db.get("SELECT value FROM settings WHERE key = 'app'") as any;
    let appSettings: any = {};
    try { appSettings = settingsRow ? JSON.parse(settingsRow.value) : {}; } catch (_) { appSettings = {}; }
    const podcastName = appSettings?.branding?.podcastName || appSettings?.general?.podcastName || 'PodCore';
    const brandingDir = path.join(DATA_DIR, 'branding');
    let logoPath: string | null = null;
    if (fs.existsSync(brandingDir)) {
      const logoFile = fs.readdirSync(brandingDir).find((file: string) => file.startsWith('logo.'));
      if (logoFile) logoPath = path.join(brandingDir, logoFile);
    }

    const doc = new PDFDocument({
      margin,
      size: layout.pageSize,
      layout: layout.pageOrientation === 'landscape' ? 'landscape' : 'portrait',
      autoFirstPage: true,
      bufferPages: true,
    });
    const safeTitle = documentTitle
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'Fragen-Pool';
    const filename = `${safeTitle}-${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    let drawingHeader = false;
    const drawHeader = () => {
      drawingHeader = true;
      renderPdfHeader(doc, layout, { podcastName, documentTitle, logoPath });
      drawingHeader = false;
    };
    doc.on('pageAdded', () => {
      if (!drawingHeader) drawHeader();
    });
    drawHeader();

    const contentWidth = doc.page.width - margin * 2;
    const contentBottom = () => doc.page.height - margin - 44;
    const ensureSpace = (height: number) => {
      if (doc.y + height > contentBottom()) doc.addPage();
    };
    // Ein Fragenblock darf nie auf Grundlage des verbleibenden Platzes kleingerechnet
    // werden. Das führte bislang dazu, dass einzelne Fragen am Seitenende nicht mehr
    // gezeichnet wurden. Bei überlangen Texten wird der Text bewusst über mehrere
    // Seiten fortgesetzt; bei regulären Fragen bleibt der gesamte Block zusammen.
    const usablePageHeight = () => contentBottom() - (margin + 12);

    const categories = new Map<string, any[]>();
    for (const question of questions) {
      const topic = String(question.category || '').trim() || 'Allgemein';
      if (!categories.has(topic)) categories.set(topic, []);
      categories.get(topic)!.push(question);
    }

    doc.font(`${layout.typography.fontFamily}-Bold`)
      .fontSize(layout.typography.subtitleSize + 2)
      .fillColor(layout.colors.primary)
      .text(documentTitle, { align: 'center' });
    doc.moveDown(0.35);
    doc.font(layout.typography.fontFamily)
      .fontSize(layout.typography.smallSize)
      .fillColor(layout.colors.muted)
      .text(`${questions.length} ${questions.length === 1 ? 'Frage' : 'Fragen'} · ${categories.size} ${categories.size === 1 ? 'Thema' : 'Themen'} · Export vom ${new Date().toLocaleDateString('de-DE')}`, { align: 'center' });
    doc.moveDown(1.1);

    for (const [topic, topicQuestions] of categories.entries()) {
      ensureSpace(52);
      const headingY = doc.y;
      doc.roundedRect(margin, headingY, contentWidth, 28, 5).fill(layout.colors.primary);
      doc.font(`${layout.typography.fontFamily}-Bold`)
        .fontSize(layout.typography.headingSize)
        .fillColor(layout.colors.headerText)
        .text(topic, margin + 10, headingY + 7, { width: contentWidth - 54, lineBreak: false, ellipsis: true });
      doc.font(layout.typography.fontFamily)
        .fontSize(layout.typography.smallSize)
        .fillColor(layout.colors.headerText)
        .text(String(topicQuestions.length), margin + contentWidth - 36, headingY + 8, { width: 26, align: 'right', lineBreak: false });
      doc.y = headingY + 38;

      topicQuestions.forEach((question: any, index: number) => {
        const questionText = String(question.question || '').trim();
        const notesText = showNotes ? String(question.notes || '').trim() : '';
        doc.font(`${layout.typography.fontFamily}-Bold`).fontSize(layout.typography.bodySize);
        const questionHeight = doc.heightOfString(questionText, { width: contentWidth - 30, lineGap: 1 });
        let notesHeight = 0;
        if (notesText) {
          doc.font(layout.typography.fontFamily).fontSize(layout.typography.smallSize);
          notesHeight = doc.heightOfString(notesText, { width: contentWidth - 30, lineGap: 1 }) + 8;
        }
        const itemHeight = questionHeight + notesHeight + 40;
        if (itemHeight <= usablePageHeight()) {
          ensureSpace(itemHeight);
        } else {
          // Sehr lange Fragen dürfen mehrseitig umbrechen, beginnen aber nie in der
          // Fußzeile. PDFKit führt den Rest auf der nächsten Seite inklusive Kopfzeile fort.
          ensureSpace(44);
        }

        const itemY = doc.y;
        doc.circle(margin + 10, itemY + 8, 8).fill(layout.colors.secondary);
        doc.font(`${layout.typography.fontFamily}-Bold`)
          .fontSize(layout.typography.smallSize)
          .fillColor('#ffffff')
          .text(String(index + 1), margin + 2, itemY + 4.5, { width: 16, align: 'center', lineBreak: false });
        doc.font(`${layout.typography.fontFamily}-Bold`)
          .fontSize(layout.typography.bodySize)
          .fillColor(layout.colors.text)
          .text(questionText, margin + 28, itemY, { width: contentWidth - 28, lineGap: 1 });
        if (notesText) {
          doc.moveDown(0.3);
          doc.font(layout.typography.fontFamily)
            .fontSize(layout.typography.smallSize)
            .fillColor(layout.colors.muted)
            .text(`Hinweis: ${notesText}`, margin + 28, doc.y, { width: contentWidth - 28, lineGap: 1 });
        }
        doc.moveDown(0.65);
        const dividerY = doc.y;
        if (dividerY < contentBottom()) {
          doc.moveTo(margin + 28, dividerY).lineTo(margin + contentWidth, dividerY).lineWidth(0.35).strokeColor(layout.colors.muted).opacity(0.25).stroke().opacity(1);
          doc.y = dividerY + 8;
        }
      });
      doc.moveDown(0.35);
    }

    const range = doc.bufferedPageRange();
    for (let pageIndex = range.start; pageIndex < range.start + range.count; pageIndex += 1) {
      doc.switchToPage(pageIndex);
      renderWatermark(doc, layout);
      renderPdfFooter(doc, layout, { podcastName, pageNum: pageIndex + 1, totalPages: range.count });
    }
    doc.end();
  } catch (error) {
    console.error('[ERROR] Question pool PDF export failed:', error);
    if (!res.headersSent) return res.status(500).json({ success: false, error: 'Fragen-Pool konnte nicht als PDF exportiert werden' });
    return res.end();
  }
});

router.post('/interviews/question-pool', requirePermission('canEditInterviews') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const id = uuidv4();
  const question = cleanQuestionPoolText(req.body.question, 2000);
  const category = cleanQuestionPoolText(req.body.category, 120) || 'Allgemein';
  const notes = cleanQuestionPoolText(req.body.notes, 5000);
  const order = Number.isFinite(Number(req.body.order)) ? Math.max(0, Math.trunc(Number(req.body.order))) : 0;

  if (!question) return res.status(400).json({ success: false, error: 'Frage erforderlich' });

  db.run(
    'INSERT INTO interview_questions (id, partner_id, episode_id, question, category, sort_order, notes, is_pool, source_question_id) VALUES (?, NULL, NULL, ?, ?, ?, ?, 1, NULL)',
    [id, question, category, order, notes || null]
  );
  const created = db.get('SELECT * FROM interview_questions WHERE id = ? AND is_pool = 1', [id]) as any;
  return res.status(201).json({ success: true, data: normalizeInterviewQuestion(created), message: 'Frage zum allgemeinen Pool hinzugefügt' });
});

router.put('/interviews/question-pool/rename-topic', requirePermission('canEditInterviews') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { oldTopic, newTopic } = req.body;
  const safeOld = String(oldTopic || '').trim();
  const safeNew = String(newTopic || '').trim();
  if (!safeOld || !safeNew) return res.status(400).json({ success: false, error: 'Alter und neuer Themenname erforderlich' });

  db.run(
    "UPDATE interview_questions SET category = ?, updated_at = datetime('now') WHERE is_pool = 1 AND COALESCE(NULLIF(TRIM(category), ''), 'Allgemein') = ?",
    [safeNew, safeOld === 'Allgemein' ? 'Allgemein' : safeOld]
  );
  return res.json({ success: true, message: 'Thema erfolgreich umbenannt' });
});

router.put('/interviews/question-pool/:id', requirePermission('canEditInterviews') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const existing = db.get('SELECT * FROM interview_questions WHERE id = ? AND is_pool = 1', [req.params.id]) as any;
  if (!existing) return res.status(404).json({ success: false, error: 'Pool-Frage nicht gefunden' });

  const question = req.body.question === undefined ? existing.question : cleanQuestionPoolText(req.body.question, 2000);
  const category = req.body.category === undefined ? (existing.category || 'Allgemein') : (cleanQuestionPoolText(req.body.category, 120) || 'Allgemein');
  const notes = req.body.notes === undefined ? existing.notes : (cleanQuestionPoolText(req.body.notes, 5000) || null);
  const order = req.body.order === undefined || !Number.isFinite(Number(req.body.order))
    ? existing.sort_order
    : Math.max(0, Math.trunc(Number(req.body.order)));

  if (!question) return res.status(400).json({ success: false, error: 'Frage erforderlich' });

  db.run(
    "UPDATE interview_questions SET question = ?, category = ?, sort_order = ?, notes = ?, updated_at = datetime('now') WHERE id = ? AND is_pool = 1",
    [question, category, order, notes, req.params.id]
  );
  const updated = db.get('SELECT * FROM interview_questions WHERE id = ?', [req.params.id]) as any;
  return res.json({ success: true, data: normalizeInterviewQuestion(updated), message: 'Pool-Frage aktualisiert' });
});

router.post('/interviews/question-pool/assign', requirePermission('canEditInterviews') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const partnerId = cleanQuestionPoolText(req.body.partnerId, 100);
  const questionIds = Array.isArray(req.body.questionIds)
    ? Array.from(new Set(req.body.questionIds.filter((id: unknown) => typeof id === 'string' && id.trim()).map((id: string) => id.trim()))).slice(0, 500)
    : [];

  if (!partnerId) return res.status(400).json({ success: false, error: 'Interview-Partner erforderlich' });
  if (!questionIds.length) return res.status(400).json({ success: false, error: 'Mindestens eine Pool-Frage auswählen' });

  const partner = db.get('SELECT id, name FROM interview_partners WHERE id = ?', [partnerId]) as any;
  if (!partner) return res.status(404).json({ success: false, error: 'Interview-Partner nicht gefunden' });

  let assigned = 0;
  let skipped = 0;
  try {
    db.exec('BEGIN IMMEDIATE');
    for (const questionId of questionIds) {
      const source = db.get('SELECT * FROM interview_questions WHERE id = ? AND is_pool = 1', [questionId]) as any;
      if (!source) {
        skipped += 1;
        continue;
      }
      const duplicate = db.get(
        'SELECT id FROM interview_questions WHERE partner_id = ? AND source_question_id = ? LIMIT 1',
        [partnerId, questionId]
      ) as any;
      if (duplicate) {
        skipped += 1;
        continue;
      }
      db.run(
        'INSERT INTO interview_questions (id, partner_id, episode_id, question, category, sort_order, notes, is_pool, source_question_id) VALUES (?, ?, NULL, ?, ?, ?, ?, 0, ?)',
        [uuidv4(), partnerId, source.question, source.category || 'Allgemein', source.sort_order || 0, source.notes || null, source.id]
      );
      assigned += 1;
    }
    db.exec('COMMIT');
  } catch (error) {
    try { db.exec('ROLLBACK'); } catch (_) {}
    console.error('[ERROR] Question pool assignment failed:', error);
    return res.status(500).json({ success: false, error: 'Fragen konnten nicht zugeordnet werden' });
  }

  return res.json({
    success: true,
    data: { assigned, skipped, partnerId, partnerName: partner.name },
    message: assigned > 0 ? `${assigned} Frage${assigned === 1 ? '' : 'n'} zugeordnet` : 'Alle ausgewählten Fragen waren bereits zugeordnet',
  });
});

router.delete('/interviews/question-pool/:id', requirePermission('canEditInterviews') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const existing = db.get('SELECT id FROM interview_questions WHERE id = ? AND is_pool = 1', [req.params.id]) as any;
  if (!existing) return res.status(404).json({ success: false, error: 'Pool-Frage nicht gefunden' });

  try {
    db.exec('BEGIN IMMEDIATE');
    db.run('UPDATE interview_questions SET source_question_id = NULL WHERE source_question_id = ?', [req.params.id]);
    db.run('DELETE FROM interview_questions WHERE id = ? AND is_pool = 1', [req.params.id]);
    db.exec('COMMIT');
  } catch (error) {
    try { db.exec('ROLLBACK'); } catch (_) {}
    console.error('[ERROR] Question pool deletion failed:', error);
    return res.status(500).json({ success: false, error: 'Pool-Frage konnte nicht gelöscht werden' });
  }
  return res.json({ success: true, message: 'Pool-Frage gelöscht; bestehende Partnerzuordnungen bleiben erhalten' });
});

// Interview Questions
router.get('/interviews/questions', requirePermission('canViewInterviews') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { partnerId, episodeId, ideaId } = req.query;
  let query = 'SELECT * FROM interview_questions WHERE is_pool = 0';
  const params: any[] = [];

  if (partnerId) { query += ' AND partner_id = ?'; params.push(partnerId); }
  if (episodeId) { query += ' AND episode_id = ?'; params.push(episodeId); }
  if (ideaId) { query += ' AND idea_id = ?'; params.push(ideaId); }
  query += ' ORDER BY sort_order ASC';

  const questions = db.all(query, params).map(normalizeInterviewQuestion);
  return res.json({ success: true, data: questions });
});

router.post('/interviews/questions', requirePermission('canEditInterviews') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const id = uuidv4();
  const { partnerId, episodeId, ideaId, question, category, order = 0, notes } = req.body;

  if (!question) return res.status(400).json({ success: false, error: 'Frage erforderlich' });

  db.run('INSERT INTO interview_questions (id, partner_id, episode_id, idea_id, question, category, sort_order, notes, is_pool) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)',
    [id, partnerId || null, episodeId || null, ideaId || null, question, category || null, order, notes || null]);

  const q = db.get('SELECT * FROM interview_questions WHERE id = ? AND is_pool = 0', [id]) as any;
  broadcastEditorialResourceUpdated(db, q, req, 'interview-questions');
  return res.status(201).json({ success: true, data: normalizeInterviewQuestion(q) });
});

router.put('/interviews/questions/:id', requirePermission('canEditInterviews') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const existing = db.get('SELECT * FROM interview_questions WHERE id = ? AND is_pool = 0', [req.params.id]) as any;
  if (!existing) return res.status(404).json({ success: false, error: 'Frage nicht gefunden' });

  const { question, category, order, notes } = req.body;
  const partnerId = req.body.partnerId === undefined ? existing.partner_id : (req.body.partnerId || null);
  const episodeId = req.body.episodeId === undefined ? existing.episode_id : (req.body.episodeId || null);
  const ideaId = req.body.ideaId === undefined ? existing.idea_id : (req.body.ideaId || null);

  db.run(
    `UPDATE interview_questions
     SET question = COALESCE(?, question), category = ?, sort_order = COALESCE(?, sort_order), notes = ?,
         partner_id = ?, episode_id = ?, idea_id = ?, updated_at = datetime('now')
     WHERE id = ? AND is_pool = 0`,
    [question ?? null, category ?? null, order ?? null, notes ?? null, partnerId, episodeId, ideaId, req.params.id]
  );

  const q = db.get('SELECT * FROM interview_questions WHERE id = ? AND is_pool = 0', [req.params.id]) as any;
  broadcastEditorialResourceUpdated(db, q, req, 'interview-questions');
  return res.json({ success: true, data: normalizeInterviewQuestion(q) });
});

// POST /api/editorial/interviews/questions/:id/approve — Moderator gibt Frage frei
router.post('/interviews/questions/:id/approve', requirePermission('canApproveInterviewQuestions') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const q = db.get('SELECT * FROM interview_questions WHERE id = ? AND is_pool = 0', [req.params.id]) as any;
  if (!q) return res.status(404).json({ success: false, error: 'Frage nicht gefunden' });

  db.run(
    `UPDATE interview_questions SET approved = 1, approved_by = ?, approved_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND is_pool = 0`,
    [req.user!.id, req.params.id]
  );

  const updated = db.get('SELECT * FROM interview_questions WHERE id = ?', [req.params.id]) as any;
  broadcastEditorialResourceUpdated(db, updated, req, 'interview-questions');
  return res.json({ success: true, data: {
    ...updated, approved: updated.approved === 1,
    approvedBy: updated.approved_by, approvedAt: updated.approved_at,
    partnerId: updated.partner_id, episodeId: updated.episode_id,
    createdAt: updated.created_at, updatedAt: updated.updated_at,
  }, message: 'Frage freigegeben' });
});

// POST /api/editorial/interviews/questions/:id/revoke — Freigabe zurückziehen
router.post('/interviews/questions/:id/revoke', requirePermission('canApproveInterviewQuestions') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const q = db.get('SELECT * FROM interview_questions WHERE id = ? AND is_pool = 0', [req.params.id]) as any;
  if (!q) return res.status(404).json({ success: false, error: 'Frage nicht gefunden' });

  db.run(
    `UPDATE interview_questions SET approved = 0, approved_by = NULL, approved_at = NULL, updated_at = datetime('now') WHERE id = ? AND is_pool = 0`,
    [req.params.id]
  );

  const updated = db.get('SELECT * FROM interview_questions WHERE id = ?', [req.params.id]) as any;
  broadcastEditorialResourceUpdated(db, updated, req, 'interview-questions');
  return res.json({ success: true, data: {
    ...updated, approved: updated.approved === 1,
    approvedBy: updated.approved_by, approvedAt: updated.approved_at,
    partnerId: updated.partner_id, episodeId: updated.episode_id,
    createdAt: updated.created_at, updatedAt: updated.updated_at,
  }, message: 'Freigabe zurückgezogen' });
});

// POST /api/editorial/interviews/questions/reorder — Fragen neu sortieren
router.post('/interviews/questions/reorder', requirePermission('canEditInterviews') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { questionIds } = req.body;
  
  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    return res.status(400).json({ success: false, error: 'Frage-IDs erforderlich' });
  }
  
  for (let i = 0; i < questionIds.length; i++) {
    db.run('UPDATE interview_questions SET sort_order = ? WHERE id = ?', [i, questionIds[i]]);
  }
  
  return res.json({ success: true, message: 'Reihenfolge aktualisiert' });
});

router.post('/interviews/questions/:id/archive-to-pool', requirePermission('canEditInterviews') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const source = db.get('SELECT * FROM interview_questions WHERE id = ? AND is_pool = 0', [req.params.id]) as any;
  if (!source) return res.status(404).json({ success: false, error: 'Frage nicht gefunden' });

  // Eine aus dem Pool zugeordnete Frage verweist bereits auf ihre Ursprungsfrage.
  if (source.source_question_id) {
    const originalPoolQuestion = db.get('SELECT * FROM interview_questions WHERE id = ? AND is_pool = 1', [source.source_question_id]) as any;
    if (originalPoolQuestion) {
      return res.json({ success: true, data: normalizeInterviewQuestion(originalPoolQuestion), existing: true, message: 'Die Frage ist bereits im allgemeinen Fragen-Pool vorhanden' });
    }
  }

  const existingArchive = db.get('SELECT * FROM interview_questions WHERE is_pool = 1 AND source_question_id = ? LIMIT 1', [source.id]) as any;
  if (existingArchive) {
    return res.json({ success: true, data: normalizeInterviewQuestion(existingArchive), existing: true, message: 'Die Frage ist bereits im allgemeinen Fragen-Pool vorhanden' });
  }

  const nextOrder = db.get('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM interview_questions WHERE is_pool = 1') as any;
  const poolQuestionId = uuidv4();
  db.run(
    `INSERT INTO interview_questions (id, partner_id, episode_id, idea_id, question, category, sort_order, notes, is_pool, source_question_id)
     VALUES (?, NULL, NULL, NULL, ?, ?, ?, ?, 1, ?)`,
    [poolQuestionId, source.question, source.category || 'Allgemein', Number(nextOrder?.next_order || 0), source.notes || null, source.id]
  );
  const created = db.get('SELECT * FROM interview_questions WHERE id = ? AND is_pool = 1', [poolQuestionId]) as any;
  return res.status(201).json({ success: true, data: normalizeInterviewQuestion(created), existing: false, message: 'Frage in den allgemeinen Fragen-Pool übernommen' });
});

router.delete('/interviews/questions/:id', requirePermission('canEditInterviews') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const existing = db.get('SELECT id FROM interview_questions WHERE id = ? AND is_pool = 0', [req.params.id]) as any;
  if (!existing) return res.status(404).json({ success: false, error: 'Frage nicht gefunden' });
  db.run('DELETE FROM interview_questions WHERE id = ? AND is_pool = 0', [req.params.id]);
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

// ============================================================
// INTERVIEW QUESTIONS — SEND SUMMARY TO GUEST
// ============================================================

// GET /api/editorial/interviews/partners/:partnerId/send-summary
// Returns an HTML page with the interview summary for the guest
router.get('/interviews/partners/:partnerId/send-summary', requirePermission('canViewInterviews') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const partner = db.get('SELECT * FROM interview_partners WHERE id = ?', [req.params.partnerId]) as any;
  if (!partner) return res.status(404).json({ success: false, error: 'Interview-Partner nicht gefunden' });

  const { episodeId } = req.query;
  let questionsQuery = 'SELECT * FROM interview_questions WHERE partner_id = ?';
  const qParams: any[] = [req.params.partnerId];
  if (episodeId) { questionsQuery += ' AND episode_id = ?'; qParams.push(episodeId); }
  questionsQuery += ' ORDER BY sort_order ASC';
  const questions = db.all(questionsQuery, qParams) as any[];

  let episodeInfo = '';
  if (episodeId) {
    const ep = db.get('SELECT title, number, description, recording_date from episodes WHERE id = ?', [episodeId]) as any;
    if (ep) {
      episodeInfo = `<div class="episode-box"><h2>Folge: ${ep.number ? `#${ep.number} — ` : ''}${ep.title}</h2>${ep.description ? `<p>${ep.description}</p>` : ''}${ep.recording_date ? `<p><strong>Aufnahmedatum:</strong> ${new Date(ep.recording_date).toLocaleDateString('de-DE')}</p>` : ''}</div>`;
    }
  }

  // Group questions by category
  const grouped: Record<string, any[]> = {};
  for (const q of questions) {
    const cat = q.category || 'Allgemein';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(q);
  }

  const questionsHtml = Object.entries(grouped).map(([cat, qs]) => `
    <div class="category">
      <h3>${cat}</h3>
      <ol>${qs.map((q, i) => `<li class="question">${q.question}${q.notes ? `<span class="note">${q.notes}</span>` : ''}</li>`).join('')}</ol>
    </div>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Interview-Fragen — ${partner.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f9fa; color: #1a1a2e; padding: 40px 20px; }
    .container { max-width: 700px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden; }
    .header { background: linear-gradient(135deg, #7c3aed, #2563eb); color: white; padding: 40px; }
    .header h1 { font-size: 1.6rem; margin-bottom: 8px; }
    .header .subtitle { opacity: 0.85; font-size: 0.95rem; }
    .body { padding: 40px; }
    .partner-info { background: #f0f4ff; border-radius: 8px; padding: 20px; margin-bottom: 28px; }
    .partner-info h2 { font-size: 1.1rem; color: #7c3aed; margin-bottom: 8px; }
    .partner-info p { font-size: 0.9rem; color: #555; margin-top: 4px; }
    .episode-box { background: #fff8f0; border-left: 4px solid #d97706; border-radius: 4px; padding: 16px 20px; margin-bottom: 28px; }
    .episode-box h2 { font-size: 1rem; color: #d97706; margin-bottom: 6px; }
    .episode-box p { font-size: 0.9rem; color: #555; margin-top: 4px; }
    .category { margin-bottom: 28px; }
    .category h3 { font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #7c3aed; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 14px; }
    ol { padding-left: 22px; }
    .question { font-size: 0.95rem; color: #1a1a2e; padding: 8px 0; line-height: 1.5; }
    .note { display: block; font-size: 0.82rem; color: #888; font-style: italic; margin-top: 2px; }
    .footer { background: #f8f9fa; padding: 20px 40px; text-align: center; font-size: 0.8rem; color: #aaa; border-top: 1px solid #e5e7eb; }
    @media print { body { background: white; padding: 0; } .container { box-shadow: none; } }
    .print-btn { display: inline-block; margin-top: 20px; padding: 10px 24px; background: #7c3aed; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem; }
    @media print { .print-btn { display: none; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Interview-Fragen</h1>
      <div class="subtitle">Vorbereitung für Ihr Podcast-Interview</div>
    </div>
    <div class="body">
      <div class="partner-info">
        <h2>Liebe/r ${partner.name},</h2>
        ${partner.company ? `<p><strong>Unternehmen:</strong> ${partner.company}</p>` : ''}
        ${partner.role ? `<p><strong>Rolle:</strong> ${partner.role}</p>` : ''}
        <p style="margin-top:12px;">vielen Dank, dass Sie sich die Zeit nehmen, bei unserem Podcast als Gast dabei zu sein. Im Folgenden finden Sie die Interview-Fragen zur Vorbereitung.</p>
      </div>
      ${episodeInfo}
      ${questionsHtml || '<p style="color:#888;">Keine Fragen hinterlegt.</p>'}
      <div style="text-align:center;">
        <button class="print-btn" onclick="window.print()">Seite drucken / als PDF speichern</button>
      </div>
    </div>
    <div class="footer">Erstellt mit PodCore &mdash; ${new Date().toLocaleDateString('de-DE')}</div>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(html);
});

// GET /api/editorial/interviews/partners/:partnerId/export-pdf
// Exports a personalized PDF with a cover letter and interview questions
router.get('/interviews/partners/:partnerId/export-pdf', requirePermission('canViewInterviews') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const partner = db.get('SELECT * FROM interview_partners WHERE id = ?', [req.params.partnerId]) as any;
  if (!partner) return res.status(404).json({ success: false, error: 'Interview-Partner nicht gefunden' });

  const customMessage = req.query.customMessage as string | undefined;
  const episodeId = req.query.episodeId as string | undefined;

  let questionsQuery = 'SELECT * FROM interview_questions WHERE partner_id = ?';
  const qParams: any[] = [req.params.partnerId];
  if (episodeId) { questionsQuery += ' AND episode_id = ?'; qParams.push(episodeId); }
  questionsQuery += ' ORDER BY sort_order ASC';
  const questions = db.all(questionsQuery, qParams) as any[];

  const settingsRow = db.get("SELECT value FROM settings WHERE key = 'app'") as any;
  const appSettings = settingsRow ? JSON.parse(settingsRow.value) : {};
  const podcastName = appSettings?.branding?.podcastName || appSettings?.general?.podcastName || 'PodCore';

  const PDFDocument = require('pdfkit');
  const { getDefaultLayoutForType, renderPdfHeader, renderPdfFooter } = require('../pdfLayouts');
  const layout = getDefaultLayoutForType('episode');
  const m = layout.pageMargin;
  const typography = layout.typography;
  const colors = layout.colors;
  const doc = new PDFDocument({
    size: layout.pageSize,
    // Der obere Rand reserviert Platz für die gemeinsame Layout-Kopfzeile.
    margins: { top: m + 86, bottom: m + 30, left: m, right: m },
    bufferPages: true,
  });

  const buffers: Buffer[] = [];
  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', () => {
    const pdfData = Buffer.concat(buffers);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Interview-Fragen-${partner.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);
    res.send(pdfData);
  });

  const documentTitle = `Interview-Vorbereitung: ${partner.name}`;
  const renderHeader = () => renderPdfHeader(doc, layout, {
    podcastName,
    documentTitle,
    logoPath: null,
  });

  doc.on('pageAdded', renderHeader);
  renderHeader();
  // renderPdfHeader setzt die aktuelle Position. Ein Mindestabstand schützt
  // den Inhalt zusätzlich bei individuellen Layoutvarianten.
  doc.y = Math.max(doc.y || 0, m + 86);

  doc.font(typography.fontFamily).fontSize(typography.bodySize).fillColor(colors.text);
  const greeting = customMessage || `Liebe/r ${partner.name},\n\nvielen Dank, dass Sie sich die Zeit nehmen, bei unserem Podcast als Gast dabei zu sein. Hier sind die Interview-Fragen zur Vorbereitung:`;
  doc.text(greeting, { align: 'left', lineGap: 4 });
  doc.moveDown(2);

  doc.font(`${typography.fontFamily}-Bold`).fontSize(typography.headingSize).fillColor(colors.primary);
  doc.text('Ihre Interview-Fragen', { align: 'left' });
  doc.moveDown(0.5);

  doc.font(typography.fontFamily).fontSize(typography.bodySize).fillColor(colors.text);
  if (questions.length === 0) {
    doc.font(`${typography.fontFamily}-Oblique`).text('Aktuell sind noch keine Fragen hinterlegt.');
  } else {
    questions.forEach((q, index) => {
      doc.font(`${typography.fontFamily}-Bold`).text(`${index + 1}. `, { continued: true });
      doc.font(typography.fontFamily).text(q.question, { lineGap: 4 });
      doc.moveDown(0.5);
    });
  }

  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    renderPdfFooter(doc, layout, { podcastName, pageNum: i + 1 });
  }

  doc.end();
});

// POST /api/editorial/interviews/partners/:partnerId/send-email
// Sends interview questions via configured SMTP
router.post('/interviews/partners/:partnerId/send-email', requirePermission('canEditInterviews') as any, async (req: AuthRequest, res: Response) => {
  const db = getDb();
  const partner = db.get('SELECT * FROM interview_partners WHERE id = ?', [req.params.partnerId]) as any;
  if (!partner) return res.status(404).json({ success: false, error: 'Interview-Partner nicht gefunden' });
  if (!partner.email) return res.status(400).json({ success: false, error: 'Keine E-Mail-Adresse für diesen Gast hinterlegt' });

  const { episodeId, customMessage, subject } = req.body;

  // Get SMTP settings
  const smtpHostRow = db.get("SELECT value FROM settings WHERE key = 'smtp_host'") as any;
  const smtpPortRow = db.get("SELECT value FROM settings WHERE key = 'smtp_port'") as any;
  const smtpUserRow = db.get("SELECT value FROM settings WHERE key = 'smtp_user'") as any;
  const smtpPassRow = db.get("SELECT value FROM settings WHERE key = 'smtp_pass'") as any;
  const smtpFromRow = db.get("SELECT value FROM settings WHERE key = 'smtp_from'") as any;

  if (!smtpHostRow?.value || !smtpUserRow?.value) {
    return res.status(400).json({ success: false, error: 'SMTP nicht konfiguriert. Bitte in den Einstellungen konfigurieren.' });
  }

  // Build questions list
  let questionsQuery = 'SELECT * FROM interview_questions WHERE partner_id = ?';
  const qParams: any[] = [req.params.partnerId];
  if (episodeId) { questionsQuery += ' AND episode_id = ?'; qParams.push(episodeId); }
  questionsQuery += ' ORDER BY sort_order ASC';
  const questions = db.all(questionsQuery, qParams) as any[];

  const questionsList = questions.map((q, i) => `${i + 1}. ${q.question}`).join('\n');

  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: smtpHostRow.value,
    port: parseInt(smtpPortRow?.value || '587'),
    secure: parseInt(smtpPortRow?.value || '587') === 465,
    auth: { user: smtpUserRow.value, pass: smtpPassRow?.value || '' },
  });

  const emailSubject = subject || `Interview-Fragen für Ihren Podcast-Auftritt`;
  const emailText = `Liebe/r ${partner.name},\n\n${customMessage || 'vielen Dank, dass Sie sich die Zeit nehmen, bei unserem Podcast als Gast dabei zu sein. Hier sind die Interview-Fragen zur Vorbereitung:'}\n\n${questionsList}\n\nMit freundlichen Grüßen`;

  try {
    await transporter.sendMail({
      from: smtpFromRow?.value || smtpUserRow.value,
      to: partner.email,
      subject: emailSubject,
      text: emailText,
    });
    return res.json({ success: true, message: `E-Mail an ${partner.email} gesendet` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: `E-Mail-Versand fehlgeschlagen: ${err.message}` });
  }
});

// ============================================================
// RECHERCHE / RESEARCH SOURCES
// ============================================================

router.get('/research', requirePermission('canViewIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { ideaId, episodeId, status, type, search } = req.query;
  let query = 'SELECT * FROM research_sources WHERE 1=1';
  const params: any[] = [];

  if (ideaId) { query += ' AND related_idea_id = ?'; params.push(ideaId); }
  if (episodeId) { query += ' AND related_episode_id = ?'; params.push(episodeId); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  if (type) { query += ' AND type = ?'; params.push(type); }
  if (search) { query += ' AND (title LIKE ? OR description LIKE ? OR url LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  query += ' ORDER BY created_at DESC';

  const sources = db.all(query, params).map((r: any) => ({ ...r, tags: JSON.parse(r.tags || '[]') }));
  return res.json({ success: true, data: sources });
});

router.post('/research', requirePermission('canCreateIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { v4: uuidv4 } = require('uuid');
  const { title, url, type = 'link', description, content, tags = [], relatedIdeaId, relatedEpisodeId, status = 'unread' } = req.body;
  if (!title) return res.status(400).json({ success: false, error: 'Titel ist erforderlich' });

  const id = uuidv4();
  db.run(
    'INSERT INTO research_sources (id, title, url, type, description, content, tags, related_idea_id, related_episode_id, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, title, url || null, type, description || null, content || null, JSON.stringify(tags), relatedIdeaId || null, relatedEpisodeId || null, status, req.user!.id]
  );
  const source = db.get('SELECT * FROM research_sources WHERE id = ?', [id]) as any;
  broadcastEditorialResourceUpdated(db, source, req, 'research');
  return res.status(201).json({ success: true, data: { ...source, tags: JSON.parse(source.tags || '[]') } });
});

router.put('/research/:id', requirePermission('canEditIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { title, url, type, description, content, tags, relatedIdeaId, relatedEpisodeId, status } = req.body;
  const existing = db.get('SELECT * FROM research_sources WHERE id = ?', [req.params.id]) as any;
  if (!existing) return res.status(404).json({ success: false, error: 'Quelle nicht gefunden' });

  db.run(
    `UPDATE research_sources SET title = COALESCE(?, title), url = ?, type = COALESCE(?, type),
     description = ?, content = ?, tags = COALESCE(?, tags),
     related_idea_id = ?, related_episode_id = ?, status = COALESCE(?, status),
     updated_at = datetime('now') WHERE id = ?`,
    [title ?? null, url !== undefined ? url : existing.url, type ?? null, description !== undefined ? description : existing.description,
     content !== undefined ? content : existing.content, tags ? JSON.stringify(tags) : null,
     relatedIdeaId !== undefined ? relatedIdeaId : existing.related_idea_id,
     relatedEpisodeId !== undefined ? relatedEpisodeId : existing.related_episode_id,
     status ?? null, req.params.id]
  );
  const updated = db.get('SELECT * FROM research_sources WHERE id = ?', [req.params.id]) as any;
  broadcastEditorialResourceUpdated(db, updated, req, 'research');
  return res.json({ success: true, data: { ...updated, tags: JSON.parse(updated.tags || '[]') } });
});

router.delete('/research/:id', requirePermission('canDeleteIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const existing = db.get('SELECT * FROM research_sources WHERE id = ?', [req.params.id]) as any;
  if (!existing) return res.status(404).json({ success: false, error: 'Quelle nicht gefunden' });
  db.run('DELETE FROM research_sources WHERE id = ?', [req.params.id]);
  broadcastEditorialResourceUpdated(db, existing, req, 'research');
  return res.json({ success: true, message: 'Quelle gelöscht' });
});

// ============================================================
// EPISODEN-EDITOR INTEGRATION: Ideen-Suche & Übernahme
// ============================================================

// GET /editorial/ideas-for-episode - Ideen mit allen Sub-Ressourcen für Episoden-Editor
router.get('/ideas-for-episode', requirePermission('canViewIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { search, status } = req.query as any;
  let query = 'SELECT * FROM ideas WHERE 1=1';
  const params: any[] = [];
  if (search) {
    query += ' AND (title LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  query += ' ORDER BY updated_at DESC LIMIT 50';
  const ideas = db.all(query, params) as any[];
  const result = ideas.map((idea: any) => {
    const notes = db.all('SELECT * FROM idea_notes WHERE idea_id = ? ORDER BY created_at ASC', [idea.id]) as any[];
    const checklists = db.all('SELECT * FROM idea_checklists WHERE idea_id = ? ORDER BY sort_order ASC', [idea.id]) as any[];
    const partners = db.all('SELECT * FROM interview_partners WHERE idea_id = ? ORDER BY created_at ASC', [idea.id]) as any[];
    const uploads = db.all('SELECT * FROM idea_uploads WHERE idea_id = ? ORDER BY created_at ASC', [idea.id]) as any[];
    return {
      ...idea,
      tags: JSON.parse(idea.tags || '[]'),
      createdAt: idea.created_at, updatedAt: idea.updated_at, createdBy: idea.created_by,
      assignedTo: idea.assigned_to, episodeId: idea.episode_id,
      targetAudience: idea.target_audience, episodeFormat: idea.episode_format,
      targetDuration: idea.target_duration, targetDate: idea.target_date,
      notes: notes.map((n: any) => ({ ...n, ideaId: n.idea_id, createdAt: n.created_at })),
      checklists: checklists.map((c: any) => ({ ...c, isDone: c.is_done === 1, ideaId: c.idea_id })),
      interviewPartners: partners.map((p: any) => ({ ...p, guestIntro: p.guest_intro, ideaId: p.idea_id })),
      uploads: uploads.map((u: any) => ({ ...u, ideaId: u.idea_id, createdAt: u.created_at })),
    };
  });
  return res.json({ success: true, data: result });
});

// GET /editorial/ideas/:id/full - Vollständige Idee mit allen Sub-Ressourcen
router.get('/ideas/:id/full', requirePermission('canViewIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const idea = db.get('SELECT * FROM ideas WHERE id = ?', [req.params.id]) as any;
  if (!idea) return res.status(404).json({ success: false, error: 'Idee nicht gefunden' });
  const notes = db.all('SELECT * FROM idea_notes WHERE idea_id = ? ORDER BY created_at ASC', [idea.id]) as any[];
  const checklists = db.all('SELECT * FROM idea_checklists WHERE idea_id = ? ORDER BY sort_order ASC', [idea.id]) as any[];
  const partners = db.all(`
    SELECT DISTINCT p.*
    FROM interview_partners p
    LEFT JOIN idea_interview_partners ip ON ip.partner_id = p.id AND ip.idea_id = ?
    WHERE p.idea_id = ? OR ip.idea_id = ?
    ORDER BY p.created_at ASC
  `, [idea.id, idea.id, idea.id]) as any[];
  const questions = db.all(
    'SELECT q.*, p.name as partner_name FROM interview_questions q LEFT JOIN interview_partners p ON q.partner_id = p.id WHERE q.idea_id = ? ORDER BY q.sort_order ASC',
    [idea.id]
  ) as any[];
  const uploads = db.all('SELECT * FROM idea_uploads WHERE idea_id = ? ORDER BY created_at ASC', [idea.id]) as any[];
  return res.json({
    success: true,
    data: {
      ...idea,
      tags: JSON.parse(idea.tags || '[]'),
      createdAt: idea.created_at, updatedAt: idea.updated_at, createdBy: idea.created_by,
      assignedTo: idea.assigned_to, episodeId: idea.episode_id,
      targetAudience: idea.target_audience, episodeFormat: idea.episode_format,
      targetDuration: idea.target_duration, targetDate: idea.target_date,
      notes: notes.map((n: any) => ({ ...n, ideaId: n.idea_id, createdAt: n.created_at })),
      checklists: checklists.map((c: any) => ({ ...c, isDone: c.is_done === 1, ideaId: c.idea_id })),
      interviewPartners: partners.map((p: any) => ({ ...p, guestIntro: p.guest_intro, ideaId: p.idea_id })),
      interviewQuestions: questions.map((q: any) => ({ ...q, ideaId: q.idea_id, partnerId: q.partner_id, partnerName: q.partner_name, timestampSeconds: q.timestamp_seconds, timestampSource: q.timestamp_source })),
      uploads: uploads.map((u: any) => ({ ...u, ideaId: u.idea_id, createdAt: u.created_at })),
    },
  });
});

// GET /editorial/interviews/for-episode - Interview-Partner für Episoden-Editor
router.get('/interviews/for-episode', requirePermission('canViewInterviews') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const ideaId = typeof req.query.ideaId === 'string' ? req.query.ideaId.trim() : '';
  const partners = ideaId
    ? db.all(
      `SELECT DISTINCT p.*
       FROM interview_partners p
       LEFT JOIN idea_interview_partners link ON link.partner_id = p.id
       WHERE p.idea_id = ? OR link.idea_id = ?
       ORDER BY p.name COLLATE NOCASE ASC`,
      [ideaId, ideaId]
    ) as any[]
    : db.all('SELECT * FROM interview_partners ORDER BY name COLLATE NOCASE ASC') as any[];
  const result = partners.map((p: any) => {
    const approvedQuestions = db.all(
      'SELECT * FROM interview_questions WHERE partner_id = ? AND approved = 1 ORDER BY sort_order ASC',
      [p.id]
    ) as any[];
    const allQuestions = db.all(
      'SELECT * FROM interview_questions WHERE partner_id = ? ORDER BY sort_order ASC',
      [p.id]
    ) as any[];
    return {
      ...p,
      guestIntro: p.guest_intro,
      ideaId: p.idea_id,
        approvedQuestions: approvedQuestions.map((q: any) => ({ ...q, timestampSeconds: q.timestamp_seconds, timestampSource: q.timestamp_source })),
      allQuestions: allQuestions.map((q: any) => ({ ...q, timestampSeconds: q.timestamp_seconds, timestampSource: q.timestamp_source })),
      questionCount: allQuestions.length,
      approvedCount: approvedQuestions.length,
    };
  });
  return res.json({ success: true, data: result });
});

// ============================================================
// v2.14.1: THEMENWERKSTATT UND TEXTBAUSTEINE
// ============================================================

router.get('/ideas/:id/topic-workshop', requirePermission('canViewIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const idea = db.get('SELECT id FROM ideas WHERE id = ?', [req.params.id]);
  if (!idea) return res.status(404).json({ success: false, error: 'Idee nicht gefunden' });
  const draft = db.get('SELECT * FROM idea_topic_drafts WHERE idea_id = ?', [req.params.id]);
  return res.json({ success: true, data: normalizeTopicDraft(draft) });
});

router.put('/ideas/:id/topic-workshop', requirePermission('canEditIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const idea = db.get('SELECT id FROM ideas WHERE id = ?', [req.params.id]);
  if (!idea) return res.status(404).json({ success: false, error: 'Idee nicht gefunden' });

  const {
    angle = '', guidingQuestion = '', coreThesis = '', audienceValue = '', workingTitles = [],
    teaser = '', episodeDescription = '', showNotes = '', callToAction = '', body = '', status = 'draft',
  } = req.body || {};
  if (!Array.isArray(workingTitles)) return res.status(400).json({ success: false, error: 'Arbeitstitel müssen als Liste übergeben werden' });
  if (!TOPIC_DRAFT_STATUSES.has(status)) return res.status(400).json({ success: false, error: 'Ungültiger Entwurfsstatus' });

  const existing = db.get('SELECT id FROM idea_topic_drafts WHERE idea_id = ?', [req.params.id]) as any;
  const id = existing?.id || uuidv4();
  db.run(`INSERT INTO idea_topic_drafts (
      id, idea_id, angle, guiding_question, core_thesis, audience_value, working_titles,
      teaser, episode_description, show_notes, call_to_action, body, status, created_by, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(idea_id) DO UPDATE SET
      angle = excluded.angle, guiding_question = excluded.guiding_question,
      core_thesis = excluded.core_thesis, audience_value = excluded.audience_value,
      working_titles = excluded.working_titles, teaser = excluded.teaser,
      episode_description = excluded.episode_description, show_notes = excluded.show_notes,
      call_to_action = excluded.call_to_action, body = excluded.body, status = excluded.status,
      updated_by = excluded.updated_by, updated_at = datetime('now')`,
    [id, req.params.id, angle, guidingQuestion, coreThesis, audienceValue,
      JSON.stringify(workingTitles.map((title: unknown) => String(title).trim()).filter(Boolean).slice(0, 12)),
      teaser, episodeDescription, showNotes, callToAction, body, status, req.user!.id, req.user!.id]);

  const draft = db.get('SELECT * FROM idea_topic_drafts WHERE idea_id = ?', [req.params.id]);
  broadcastIdeaUpdated(db, req.params.id, req, 'topic-workshop');
  return res.json({ success: true, data: normalizeTopicDraft(draft) });
});

router.get('/text-blocks', requirePermission('canViewIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const ideaId = typeof req.query.ideaId === 'string' ? req.query.ideaId : null;
  const scope = typeof req.query.scope === 'string' ? req.query.scope : 'all';
  const type = typeof req.query.type === 'string' ? req.query.type : null;
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const params: any[] = [];
  let query = 'SELECT * FROM editorial_text_blocks WHERE 1=1';

  if (scope === 'global') query += ' AND idea_id IS NULL';
  else if (scope === 'idea' && ideaId) { query += ' AND idea_id = ?'; params.push(ideaId); }
  else if (ideaId) { query += ' AND (idea_id IS NULL OR idea_id = ?)'; params.push(ideaId); }
  if (type) { query += ' AND block_type = ?'; params.push(type); }
  if (search) {
    query += ' AND (title LIKE ? OR content LIKE ? OR tags LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }
  query += ' ORDER BY is_favorite DESC, updated_at DESC, title ASC';
  const blocks = db.all(query, params).map(normalizeTextBlock);
  return res.json({ success: true, data: blocks });
});

router.post('/text-blocks', requirePermission('canEditIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { ideaId = null, title, type = 'custom', content, tags = [], isFavorite = false } = req.body || {};
  if (!String(title || '').trim()) return res.status(400).json({ success: false, error: 'Titel erforderlich' });
  if (!String(content || '').trim()) return res.status(400).json({ success: false, error: 'Inhalt erforderlich' });
  if (!TEXT_BLOCK_TYPES.has(type)) return res.status(400).json({ success: false, error: 'Ungültiger Textbaustein-Typ' });
  if (!Array.isArray(tags)) return res.status(400).json({ success: false, error: 'Tags müssen als Liste übergeben werden' });
  if (ideaId && !db.get('SELECT id FROM ideas WHERE id = ?', [ideaId])) return res.status(404).json({ success: false, error: 'Idee nicht gefunden' });

  const id = uuidv4();
  db.run(`INSERT INTO editorial_text_blocks (id, idea_id, title, block_type, content, tags, is_favorite, created_by, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, ideaId || null, String(title).trim(), type, String(content), JSON.stringify(tags), isFavorite ? 1 : 0, req.user!.id, req.user!.id]);
  const block = db.get('SELECT * FROM editorial_text_blocks WHERE id = ?', [id]) as any;
  if (ideaId) broadcastIdeaUpdated(db, ideaId, req, 'text-blocks');
  else broadcastRealtime({ type: 'editorial.text-blocks.updated', userId: req.user?.id, payload: { blockId: id, scope: 'global', changedBy: req.user?.displayName || req.user?.username } });
  return res.status(201).json({ success: true, data: normalizeTextBlock(block) });
});

router.put('/text-blocks/:id', requirePermission('canEditIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const current = db.get('SELECT * FROM editorial_text_blocks WHERE id = ?', [req.params.id]) as any;
  if (!current) return res.status(404).json({ success: false, error: 'Textbaustein nicht gefunden' });

  const nextIdeaId = Object.prototype.hasOwnProperty.call(req.body || {}, 'ideaId') ? (req.body.ideaId || null) : current.idea_id;
  const nextType = req.body?.type ?? current.block_type;
  const nextTitle = req.body?.title ?? current.title;
  const nextContent = req.body?.content ?? current.content;
  const nextTags = req.body?.tags ?? JSON.parse(current.tags || '[]');
  const nextFavorite = req.body?.isFavorite ?? (current.is_favorite === 1);
  if (!String(nextTitle || '').trim() || !String(nextContent || '').trim()) return res.status(400).json({ success: false, error: 'Titel und Inhalt sind erforderlich' });
  if (!TEXT_BLOCK_TYPES.has(nextType)) return res.status(400).json({ success: false, error: 'Ungültiger Textbaustein-Typ' });
  if (!Array.isArray(nextTags)) return res.status(400).json({ success: false, error: 'Tags müssen als Liste übergeben werden' });
  if (nextIdeaId && !db.get('SELECT id FROM ideas WHERE id = ?', [nextIdeaId])) return res.status(404).json({ success: false, error: 'Idee nicht gefunden' });

  db.run(`UPDATE editorial_text_blocks SET idea_id = ?, title = ?, block_type = ?, content = ?, tags = ?,
    is_favorite = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ?`,
    [nextIdeaId, String(nextTitle).trim(), nextType, String(nextContent), JSON.stringify(nextTags), nextFavorite ? 1 : 0, req.user!.id, req.params.id]);
  const block = db.get('SELECT * FROM editorial_text_blocks WHERE id = ?', [req.params.id]) as any;
  const affectedIdeas = new Set<string>([current.idea_id, nextIdeaId].filter(Boolean));
  affectedIdeas.forEach(idea => broadcastIdeaUpdated(db, idea, req, 'text-blocks'));
  if (!affectedIdeas.size) broadcastRealtime({ type: 'editorial.text-blocks.updated', userId: req.user?.id, payload: { blockId: req.params.id, scope: 'global', changedBy: req.user?.displayName || req.user?.username } });
  return res.json({ success: true, data: normalizeTextBlock(block) });
});

router.delete('/text-blocks/:id', requirePermission('canEditIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const current = db.get('SELECT * FROM editorial_text_blocks WHERE id = ?', [req.params.id]) as any;
  if (!current) return res.status(404).json({ success: false, error: 'Textbaustein nicht gefunden' });
  db.run('DELETE FROM editorial_text_blocks WHERE id = ?', [req.params.id]);
  if (current.idea_id) broadcastIdeaUpdated(db, current.idea_id, req, 'text-blocks');
  else broadcastRealtime({ type: 'editorial.text-blocks.updated', userId: req.user?.id, payload: { blockId: req.params.id, scope: 'global', deleted: true, changedBy: req.user?.displayName || req.user?.username } });
  return res.json({ success: true, message: 'Textbaustein gelöscht' });
});

export default router;

