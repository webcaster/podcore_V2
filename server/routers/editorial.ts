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
  broadcastIdeaUpdated(db, req.params.id, req, 'idea');
  return res.json({ success: true, data: { ...idea, tags: JSON.parse(idea.tags), createdAt: idea.created_at, updatedAt: idea.updated_at, createdBy: idea.created_by } });
});

router.delete('/ideas/:id', requirePermission('canDeleteIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.run('DELETE FROM ideas WHERE id = ?', [req.params.id]);
  return res.json({ success: true, message: 'Idee gelöscht' });
});

// GET single idea with all sub-resources
router.get('/ideas/:id', requirePermission('canViewIdeas') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const idea = db.get('SELECT * FROM ideas WHERE id = ?', [req.params.id]) as any;
  if (!idea) return res.status(404).json({ success: false, error: 'Idee nicht gefunden' });
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

  // Get idea notes to use as show notes
  const ideaNotes = db.all('SELECT content FROM idea_notes WHERE idea_id = ? ORDER BY created_at ASC', [req.params.id]) as any[];
  const notesText = ideaNotes.map((n: any) => n.content).join('\n\n');

  // Get research sources
  const sources = db.all('SELECT title, url, description FROM research_sources WHERE related_idea_id = ? ORDER BY created_at ASC', [req.params.id]) as any[];
  const questions = db.all('SELECT partner_id, question, category FROM interview_questions WHERE idea_id = ? ORDER BY sort_order ASC', [req.params.id]) as any[];
  const questionsText = questions.length > 0
    ? '\n\n## Interview-Fragen\n' + questions.map((q: any) => `- ${q.question}${q.category ? ` (${q.category})` : ''}`).join('\n')
    : '';

  const sourcesText = sources.length > 0
    ? '\n\n## Quellen\n' + sources.map((s: any) => `- ${s.title}${s.url ? ` (${s.url})` : ''}${s.description ? `: ${s.description}` : ''}`).join('\n')
    : '';

  const episodeId = uuidv4();
  const { title, description } = req.body;

  db.run(`INSERT INTO episodes (id, title, description, notes, status, created_by) VALUES (?, ?, ?, ?, 'entwurf', ?)`,
    [episodeId, title || idea.title, description || idea.description || '',
     (notesText + sourcesText + questionsText).trim() || null, req.user!.id]);

  // Link idea to episode
  db.run(`UPDATE ideas SET episode_id = ?, status = 'in_bearbeitung', updated_at = datetime('now') WHERE id = ?`, [episodeId, req.params.id]);

  // Copy interview questions to episode
  for (const q of questions) {
    const qId = uuidv4();
    db.run('INSERT INTO interview_questions (id, episode_id, question, category, sort_order, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [qId, episodeId, q.question, q.category || null, questions.indexOf(q), null]);
  }

  const episode = db.get('SELECT * FROM episodes WHERE id = ?', [episodeId]) as any;
  return res.status(201).json({ success: true, data: { ...episode, episodeId, ideaId: req.params.id } });
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
  const partners = db.all('SELECT * FROM interview_partners ORDER BY name ASC', []).map((r: any) => ({
    ...r, tags: JSON.parse(r.tags || '[]'), episodes: JSON.parse(r.episodes || '[]'),
    createdAt: r.created_at, updatedAt: r.updated_at, guestIntro: r.guest_intro,
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
  const { name, company, role, email, phone, bio, tags, episodes, notes, guestIntro } = req.body;

  db.run(`UPDATE interview_partners SET name = COALESCE(?, name), company = ?, role = ?, email = ?, phone = ?, bio = ?, tags = COALESCE(?, tags), episodes = COALESCE(?, episodes), notes = ?, guest_intro = ?, updated_at = datetime('now') WHERE id = ?`,
    [name ?? null, company ?? null, role ?? null, email ?? null, phone ?? null, bio ?? null, tags ? JSON.stringify(tags) : null, episodes ? JSON.stringify(episodes) : null, notes ?? null, guestIntro ?? null, req.params.id]);

  const partner = db.get('SELECT * FROM interview_partners WHERE id = ?', [req.params.id]) as any;
  return res.json({ success: true, data: { ...partner, tags: JSON.parse(partner.tags), episodes: JSON.parse(partner.episodes), createdAt: partner.created_at, guestIntro: partner.guest_intro } });
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
    ...r, approved: r.approved === 1,
    approvedBy: r.approved_by, approvedAt: r.approved_at,
    partnerId: r.partner_id, episodeId: r.episode_id,
    createdAt: r.created_at, updatedAt: r.updated_at,
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
  broadcastEditorialResourceUpdated(db, q, req, 'interview-questions');
  return res.status(201).json({ success: true, data: { ...q, answered: q.answered === 1, partnerId: q.partner_id, episodeId: q.episode_id, createdAt: q.created_at } });
});

router.put('/interviews/questions/:id', requirePermission('canEditInterviews') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { question, category, order, notes } = req.body;

  db.run(
    `UPDATE interview_questions SET question = COALESCE(?, question), category = ?, sort_order = COALESCE(?, sort_order), notes = ?, updated_at = datetime('now') WHERE id = ?`,
    [question ?? null, category ?? null, order ?? null, notes ?? null, req.params.id]
  );

  const q = db.get('SELECT * FROM interview_questions WHERE id = ?', [req.params.id]) as any;
  if (!q) return res.status(404).json({ success: false, error: 'Frage nicht gefunden' });
  broadcastEditorialResourceUpdated(db, q, req, 'interview-questions');
  return res.json({ success: true, data: {
    ...q, approved: q.approved === 1,
    approvedBy: q.approved_by, approvedAt: q.approved_at,
    partnerId: q.partner_id, episodeId: q.episode_id,
    createdAt: q.created_at, updatedAt: q.updated_at,
  }});
});

// POST /api/editorial/interviews/questions/:id/approve — Moderator gibt Frage frei
router.post('/interviews/questions/:id/approve', requirePermission('canApproveInterviewQuestions') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const q = db.get('SELECT * FROM interview_questions WHERE id = ?', [req.params.id]) as any;
  if (!q) return res.status(404).json({ success: false, error: 'Frage nicht gefunden' });

  db.run(
    `UPDATE interview_questions SET approved = 1, approved_by = ?, approved_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
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
  const q = db.get('SELECT * FROM interview_questions WHERE id = ?', [req.params.id]) as any;
  if (!q) return res.status(404).json({ success: false, error: 'Frage nicht gefunden' });

  db.run(
    `UPDATE interview_questions SET approved = 0, approved_by = NULL, approved_at = NULL, updated_at = datetime('now') WHERE id = ?`,
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
  const partners = db.all('SELECT * FROM interview_partners WHERE idea_id = ? ORDER BY created_at ASC', [idea.id]) as any[];
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
  const partners = db.all('SELECT * FROM interview_partners ORDER BY name ASC') as any[];
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

