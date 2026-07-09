import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';

const router: import("express").Router = Router();
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
    scriptReady: row.script_ready === 1 || row.script_ready === true,
    scriptReadyAt: row.script_ready_at || null,
    scriptReadyBy: row.script_ready_by || null,
    showNotes: row.show_notes || '',
    altDuration: row.alt_duration ?? null,
    plannedDate: row.planned_date || null,
    // Freigabe-Workflow
    approvalStatus: row.approval_status || 'ausstehend',
    approvedBy: row.approved_by || null,
    approvedAt: row.approved_at || null,
    approvalNotes: row.approval_notes || null,
    approvalRequestedBy: row.approval_requested_by || null,
    approvalRequestedAt: row.approval_requested_at || null,
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

// GET /api/episodes/pending-approval — list episodes awaiting approval (MUST be before /:id)
router.get('/pending-approval', requirePermission('canViewEpisodes') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const episodes = db.all(
    `SELECT * FROM episodes WHERE approval_status = 'angefragt' ORDER BY approval_requested_at ASC`,
    []
  ).map(parseEpisode);
  return res.json({ success: true, data: episodes });
});

// ── Episoden-Vorlagen (MUSS vor /:id stehen!) ──────────────────────────────
// Alle Vorlagen laden
router.get('/templates', requirePermission('canViewEpisodes') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const templates = db.all(
    'SELECT * FROM episode_templates ORDER BY created_at DESC'
  ) as any[];
  return res.json({
    success: true,
    data: templates.map((t: any) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      blocks: JSON.parse(t.blocks || '[]'),
      hosts: JSON.parse(t.hosts || '[]'),
      tags: JSON.parse(t.tags || '[]'),
      defaultDuration: t.default_duration,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      createdBy: t.created_by,
    })),
  });
});

// Vorlage erstellen
router.post('/templates', requirePermission('canEditEpisodes') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { name, description, blocks, hosts, tags, defaultDuration } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name erforderlich' });
  const id = uuidv4();
  db.run(
    `INSERT INTO episode_templates (id, name, description, blocks, hosts, tags, default_duration, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      name,
      description || null,
      JSON.stringify(blocks || []),
      JSON.stringify(hosts || []),
      JSON.stringify(tags || []),
      defaultDuration || null,
      (req as any).user?.id || null,
    ]
  );
  const template = db.get('SELECT * FROM episode_templates WHERE id = ?', [id]) as any;
  return res.status(201).json({
    success: true,
    data: {
      id: template.id,
      name: template.name,
      description: template.description,
      blocks: JSON.parse(template.blocks || '[]'),
      hosts: JSON.parse(template.hosts || '[]'),
      tags: JSON.parse(template.tags || '[]'),
      defaultDuration: template.default_duration,
      createdAt: template.created_at,
      updatedAt: template.updated_at,
      createdBy: template.created_by,
    },
  });
});

// Vorlage aktualisieren
router.put('/templates/:templateId', requirePermission('canEditEpisodes') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { name, description, blocks, hosts, tags, defaultDuration } = req.body;
  db.run(
    `UPDATE episode_templates SET name = ?, description = ?, blocks = ?, hosts = ?, tags = ?, default_duration = ?, updated_at = datetime('now') WHERE id = ?`,
    [
      name,
      description || null,
      JSON.stringify(blocks || []),
      JSON.stringify(hosts || []),
      JSON.stringify(tags || []),
      defaultDuration || null,
      req.params.templateId,
    ]
  );
  const template = db.get('SELECT * FROM episode_templates WHERE id = ?', [req.params.templateId]) as any;
  if (!template) return res.status(404).json({ success: false, error: 'Vorlage nicht gefunden' });
  return res.json({
    success: true,
    data: {
      id: template.id,
      name: template.name,
      description: template.description,
      blocks: JSON.parse(template.blocks || '[]'),
      hosts: JSON.parse(template.hosts || '[]'),
      tags: JSON.parse(template.tags || '[]'),
      defaultDuration: template.default_duration,
      createdAt: template.created_at,
      updatedAt: template.updated_at,
      createdBy: template.created_by,
    },
  });
});

// Vorlage löschen
router.delete('/templates/:templateId', requirePermission('canEditEpisodes') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.run('DELETE FROM episode_templates WHERE id = ?', [req.params.templateId]);
  return res.json({ success: true });
});
// ── Ende Episoden-Vorlagen ───────────────────────────────────────────────────

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

  // --- Auto Ad Assignment on Create (same logic as PUT) ---
  if (publishDate) {
    const slots = db.all(`
      SELECT s.*, c.is_exclusive, c.id as category_id
      FROM ad_slots s
      LEFT JOIN ad_categories c ON s.category_id = c.id
      WHERE s.status IN ('bestätigt', 'aktiv')
      AND (s.start_date IS NULL OR s.start_date <= ?)
      AND (s.end_date IS NULL OR s.end_date >= ?)
    `, [publishDate, publishDate]) as any[];

    for (const slot of slots) {
      if (slot.is_exclusive) {
        const exclusiveExists = db.get(`
          SELECT b.id FROM episode_ad_bookings b
          JOIN episodes e ON b.episode_id = e.id
          WHERE b.ad_category_id = ? AND e.publish_date = ?
        `, [slot.category_id, publishDate]);
        if (exclusiveExists) continue;
      }
      db.run(`
        INSERT INTO episode_ad_bookings (id, episode_id, ad_slot_id, ad_category_id, sponsor_id, position, confirmed)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `, [uuidv4(), id, slot.id, slot.category_id, slot.sponsor_id, slot.category?.default_position || 'mid-roll']);
    }
  }

  const episode = db.get('SELECT * FROM episodes WHERE id = ?', [id]);
  return res.status(201).json({ success: true, data: parseEpisode(episode) });
});

// PUT /api/episodes/:id
router.put('/:id', requirePermission('canEditEpisodes') as any, (req: AuthRequest, res: Response) => {
  try {
  const db = getDb();
  const existing = db.get('SELECT * FROM episodes WHERE id = ?', [req.params.id]) as any;

  if (!existing) {
    return res.status(404).json({ success: false, error: 'Episode nicht gefunden' });
  }

  const {
    number, title, subtitle, description, status,
    recordingDate, publishDate, duration, hosts, guests,
    tags, blocks, sponsors, notes, productionInfo, technicalData,
    scriptReady, showNotes, altDuration, plannedDate,
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
      show_notes = COALESCE(?, show_notes),
      alt_duration = COALESCE(?, alt_duration),
      planned_date = COALESCE(?, planned_date),
      script_ready = COALESCE(?, script_ready),
      script_ready_at = ?,
      script_ready_by = ?,
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
    showNotes !== undefined ? showNotes : null,
    altDuration !== undefined ? altDuration : null,
    plannedDate !== undefined ? (plannedDate || null) : null,
    // scriptReady params
    scriptReady !== undefined ? (scriptReady ? 1 : 0) : null,
    scriptReady !== undefined ? (scriptReady ? new Date().toISOString() : null) : null,
    scriptReady !== undefined ? (scriptReady ? ((req as any).user?.id || null) : null) : null,
    req.params.id
  ]);

  // --- Episode Editor Pro: Automatic Ad Assignment ---
  if (publishDate) {
    // 1. Get all confirmed ad slots that cover this publish date
    const slots = db.all(`
      SELECT s.*, c.is_exclusive, c.id as category_id
      FROM ad_slots s
      LEFT JOIN ad_categories c ON s.category_id = c.id
      WHERE s.status IN ('bestätigt', 'aktiv')
      AND (s.start_date IS NULL OR s.start_date <= ?)
      AND (s.end_date IS NULL OR s.end_date >= ?)
    `, [publishDate, publishDate]) as any[];

    for (const slot of slots) {
      // Check if already booked for this episode
      const exists = db.get('SELECT id FROM episode_ad_bookings WHERE episode_id = ? AND ad_slot_id = ?', [req.params.id, slot.id]);
      if (exists) continue;

      // Check exclusivity: if category is exclusive, check if ANY booking for this category exists on this publish date
      if (slot.is_exclusive) {
        const exclusiveExists = db.get(`
          SELECT b.id FROM episode_ad_bookings b
          JOIN episodes e ON b.episode_id = e.id
          WHERE b.ad_category_id = ? AND e.publish_date = ?
        `, [slot.category_id, publishDate]);
        if (exclusiveExists) continue;
      }

      // Create booking
      db.run(`
        INSERT INTO episode_ad_bookings (id, episode_id, ad_slot_id, ad_category_id, sponsor_id, position, confirmed)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `, [uuidv4(), req.params.id, slot.id, slot.category_id, slot.sponsor_id, slot.category?.default_position || 'mid-roll']);
    }
  }

  const episode = db.get('SELECT * FROM episodes WHERE id = ?', [req.params.id]);
  return res.json({ success: true, data: parseEpisode(episode) });
  } catch (err: any) {
    console.error('[Episodes PUT] Error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Fehler beim Speichern der Episode' });
  }
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

// GET /api/episodes/:id/export-pdf
// Query-Parameter:
//   layoutId=...       → PDF-Layout-ID (Standard: episode-default)
//   documentTitle=...  → Dokumententitel (URL-encoded)
//   scriptLayout=1     → Tabellen-Skript-Layout (neu, Standard)
//   classicLayout=1    → Klassisches Abschnitts-Layout
//   addNotesPage=1     → Leere Notizseite am Ende anfügen
router.get('/:id/export-pdf', requirePermission('canViewEpisodes') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const row = db.get('SELECT * FROM episodes WHERE id = ?', [req.params.id]) as any;
  if (!row) return res.status(404).json({ success: false, error: 'Episode nicht gefunden' });
  const ep = parseEpisode(row);
  const PDFDocument = require('pdfkit');
  const fs = require('fs');
  const path = require('path');
  const { DATA_DIR } = require('../database');
  const { getDefaultLayoutForType, getLayoutById, renderPdfHeader, renderPdfFooter, renderSectionHeading, renderWatermark, getLineSpacingFactor } = require('../pdfLayouts');

  // Layout auswählen
  const layoutId = req.query.layoutId as string | undefined;
  const layout = layoutId ? (getLayoutById(layoutId) || getDefaultLayoutForType('episode')) : getDefaultLayoutForType('episode');
  const m = layout.pageMargin;

  // Dokumententitel
  const customDocTitle = req.query.documentTitle as string | undefined;
  const documentTitle = customDocTitle ? decodeURIComponent(customDocTitle) : 'Episoden-Skript';

  // Optionen
  const useScriptLayout = req.query.classicLayout !== '1'; // Standard: Skript-Tabellen-Layout
  const addNotesPage = req.query.addNotesPage === '1';

  // Branding laden
  const brandingDir = path.join(DATA_DIR, 'branding');
  let logoPath: string | null = null;
  if (fs.existsSync(brandingDir)) {
    const lf = fs.readdirSync(brandingDir).find((f: string) => f.startsWith('logo.'));
    if (lf) logoPath = path.join(brandingDir, lf);
  }
  const settingsRow = db.get("SELECT value FROM settings WHERE key = 'app'") as any;
  const appSettings = settingsRow ? JSON.parse(settingsRow.value) : {};
  const podcastName = appSettings?.branding?.podcastName || appSettings?.general?.podcastName || 'PodCore';

  // HTML-Stripping Hilfsfunktion
  function stripHtml(html: string): string {
    if (!html) return '';
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<li>/gi, '• ')
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, '\n\n').trim();
  }

  // Regieanweisungen extrahieren [in eckigen Klammern]
  function extractDirections(text: string): string {
    const matches = text.match(/\[[^\]]+\]/g) || [];
    return matches.map(m => m.replace(/^\[|\]$/g, '')).join(' | ');
  }

  // Sprechtext ohne Regieanweisungen
  function getSpeechText(text: string): string {
    return text.replace(/\[[^\]]+\]/g, '').replace(/\s{2,}/g, ' ').trim();
  }

  // Block-Typ-Label und Farbe
  const BLOCK_META: Record<string, { label: string; color: string; symbol: string }> = {
    intro:              { label: 'Intro',           color: '#0891b2', symbol: '■' },
    segment:            { label: 'Segment',         color: '#2563eb', symbol: '✓' },
    interview:          { label: 'Interview',       color: '#7c3aed', symbol: '●' },
    interview_questions:{ label: 'Interview-Fragen',color: '#7c3aed', symbol: '●' },
    highlights:         { label: 'Highlights',      color: '#ca8a04', symbol: '★' },
    ad:                 { label: 'Werbung',         color: '#d97706', symbol: '◆' },
    jingle:             { label: 'Jingle',          color: '#059669', symbol: '♪' },
    outro:              { label: 'Outro',           color: '#dc2626', symbol: '■' },
    custom:             { label: 'Custom',          color: '#6b7280', symbol: '○' },
    moderation:         { label: 'Moderation',      color: '#0891b2', symbol: '●' },
  };

  // Dauer formatieren
  function formatDur(seconds: number | null | undefined): string {
    if (!seconds || seconds <= 0) return '--';
    if (seconds < 60) return `${seconds}s`;
    const m2 = Math.floor(seconds / 60);
    const s2 = seconds % 60;
    return s2 > 0 ? `${m2}m ${s2}s` : `${m2}m`;
  }

  // Status-Label
  const STATUS_LABELS: Record<string, string> = {
    idee: 'Idee', entwurf: 'Entwurf', aufnahme: 'Aufnahme',
    produktion: 'Produktion', geplant: 'Geplant',
    veroeffentlicht: 'Veröffentlicht', archiviert: 'Archiviert',
  };

  const doc = new PDFDocument({
    margin: m,
    size: layout.pageSize,
    layout: layout.pageOrientation === 'landscape' ? 'landscape' : 'portrait',
    autoFirstPage: true,
    bufferPages: true,
  });

  res.setHeader('Content-Type', 'application/pdf');
  const safeTitle = (ep.title || 'episode').replace(/[^a-zA-Z0-9äöüÄÖÜß\-_]/g, '_').substring(0, 40);
  res.setHeader('Content-Disposition', `attachment; filename="skript-${ep.number || safeTitle}.pdf"`);

  // Error-Handler vor pipe
  doc.on('error', (err: any) => {
    console.error('[Episode PDF] Stream error:', err);
  });
  doc.pipe(res);

  let pageNum = 1;

  // ─── Hilfsfunktion: Footer auf aktueller Seite ───────────────────────────
  function addFooter(pNum: number) {
    const pageW = doc.page.width;
    const footerY = doc.page.height - 25;
    doc.moveTo(m, footerY - 4).lineTo(pageW - m, footerY - 4)
      .strokeColor(layout.colors.accent || '#cccccc').lineWidth(0.4).stroke();
    doc.fontSize(7).font('Helvetica').fillColor(layout.colors.muted || '#888888')
      .text(podcastName, m, footerY, { width: (pageW - m * 2) * 0.6, align: 'left' });
    doc.fontSize(7).font('Helvetica').fillColor(layout.colors.muted || '#888888')
      .text(`Seite ${pNum}`, m, footerY, { width: pageW - m * 2, align: 'right' });
  }

  if (useScriptLayout) {
    // ═══════════════════════════════════════════════════════════════════════
    // NEUES TABELLEN-SKRIPT-LAYOUT
    // ═══════════════════════════════════════════════════════════════════════
    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const contentW = pageW - 2 * m;

    // ── Header-Bereich ──────────────────────────────────────────────────
    const primaryColor = layout.colors.primary || '#1a1a2e';
    const accentColor = layout.colors.accent || '#4a4a8a';

    // Logo (wenn vorhanden)
    let headerY = m;
    let logoW = 0;
    if (logoPath) {
      try {
        doc.image(logoPath, m, headerY, { fit: [45, 45] });
        logoW = 52;
      } catch (_) {}
    }

    // Episodentitel
    const titleX = m + logoW;
    const titleW = contentW - logoW;
    doc.fontSize(16).font('Helvetica-Bold').fillColor(primaryColor)
      .text(`${ep.number ? `#${ep.number} ` : ''}${ep.title}`, titleX, headerY, { width: titleW });

    const afterTitle = doc.y;

    // Status + Datum
    const statusLabel = STATUS_LABELS[ep.status] || ep.status || '';
    const dateStr = ep.publishDate
      ? new Date(ep.publishDate).toLocaleDateString('de-DE')
      : ep.recordingDate
        ? new Date(ep.recordingDate).toLocaleDateString('de-DE')
        : new Date().toLocaleDateString('de-DE');

    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(accentColor)
      .text('Status: ', titleX, afterTitle + 2, { continued: true });
    doc.font('Helvetica').fillColor(primaryColor).text(statusLabel);
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(accentColor)
      .text('Datum: ', titleX, doc.y, { continued: true });
    doc.font('Helvetica').fillColor(primaryColor).text(dateStr);

    // Hosts / Gäste
    if (ep.hosts?.length > 0) {
      doc.fontSize(8).font('Helvetica').fillColor(layout.colors.muted || '#666666')
        .text(`Hosts: ${ep.hosts.join(', ')}`, titleX, doc.y);
    }
    if (ep.guests?.length > 0) {
      doc.fontSize(8).font('Helvetica').fillColor(layout.colors.muted || '#666666')
        .text(`Gäste: ${ep.guests.join(', ')}`, titleX, doc.y);
    }

    // Trennlinie unter Header
    const headerBottom = Math.max(doc.y + 4, headerY + (logoW > 0 ? 50 : 0));
    doc.moveTo(m, headerBottom)
      .lineTo(pageW - m, headerBottom)
      .strokeColor(accentColor).lineWidth(1.5).stroke();

    let tableY = headerBottom + 8;

    // ── Tabellen-Header ──────────────────────────────────────────────────
    // Spaltenbreiten (in mm-ähnlichen Punkten)
    const COL_BLOCK  = contentW * 0.18;  // Block-Typ
    const COL_TEXT   = contentW * 0.47;  // Sprechtext
    const COL_DETAIL = contentW * 0.25;  // Details & Regie
    const COL_DUR    = contentW * 0.10;  // Dauer

    const COL_X = [
      m,
      m + COL_BLOCK,
      m + COL_BLOCK + COL_TEXT,
      m + COL_BLOCK + COL_TEXT + COL_DETAIL,
    ];

    const ROW_H_HEADER = 18;
    const headerBg = accentColor;

    // Header-Hintergrund
    doc.rect(m, tableY, contentW, ROW_H_HEADER).fill(headerBg);

    // Header-Text
    const headerLabels = [
      { x: COL_X[0], w: COL_BLOCK,  text: '🎙 Sprechtext / Inhalt (Stichpunkte)' },
      { x: COL_X[1], w: COL_TEXT,   text: '' },
      { x: COL_X[2], w: COL_DETAIL, text: 'Details & Regieanweisung' },
      { x: COL_X[3], w: COL_DUR,    text: 'Dauer' },
    ];

    // Kombinierter Header: Spalte 1+2 zusammen
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff')
      .text('🎙 Sprechtext / Inhalt (Stichpunkte)', COL_X[0] + 3, tableY + 5,
        { width: COL_BLOCK + COL_TEXT - 6, align: 'left' });
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff')
      .text('Details & Regieanweisung', COL_X[2] + 3, tableY + 5,
        { width: COL_DETAIL - 6, align: 'left' });
    // Uhr-Symbol + Dauer
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff')
      .text('⏱ Dauer', COL_X[3] + 2, tableY + 5,
        { width: COL_DUR - 4, align: 'center' });

    // Vertikale Trennlinien im Header
    doc.moveTo(COL_X[2], tableY).lineTo(COL_X[2], tableY + ROW_H_HEADER)
      .strokeColor('#ffffff').lineWidth(0.5).stroke();
    doc.moveTo(COL_X[3], tableY).lineTo(COL_X[3], tableY + ROW_H_HEADER)
      .strokeColor('#ffffff').lineWidth(0.5).stroke();

    tableY += ROW_H_HEADER;

    // ── Tabellen-Zeilen ──────────────────────────────────────────────────
    const blocks = ep.blocks || [];
    const ROW_PADDING = 4;
    const FONT_SIZE_BODY = 8;
    const FONT_SIZE_SMALL = 7;
    const MIN_ROW_H = 16;
    const FOOTER_RESERVE = 30;

    let rowAlt = false;

    for (let bi = 0; bi < blocks.length; bi++) {
      const block = blocks[bi];
      const meta = BLOCK_META[block.type] || BLOCK_META['custom'];

      // Inhalt aufbereiten
      const rawContent = stripHtml(block.content || '');
      const speechText = getSpeechText(rawContent);
      const directions = extractDirections(rawContent);
      const blockNotes = block.notes ? stripHtml(block.notes) : '';

      // Für interview_questions: Fragen als Stichpunkte
      let cellTextCol1 = speechText;
      let cellTextCol2 = directions || blockNotes || '--';

      if (block.type === 'interview_questions' && Array.isArray(block.questions) && block.questions.length > 0) {
        const qLines = block.questions.map((q: any, qi: number) => {
          const qt = stripHtml(q.text || q.question || '');
          return `• ${qt}${q.answerDuration ? ` (${q.answerDuration}s)` : ''}`;
        });
        cellTextCol1 = qLines.join('\n');
        if (block.partnerName) cellTextCol2 = `Gast: ${block.partnerName}`;
      }

      // Asset-Info für Jingle/Intro/Outro
      if (block.assetName && !cellTextCol1) {
        cellTextCol1 = `[${block.assetName}]`;
      }

      const blockLabel = block.title || meta.label;
      const durStr = formatDur(block.duration);

      // Zeilenhöhe berechnen (Schätzung)
      const linesText = Math.max(1, Math.ceil(cellTextCol1.length / 55) + (cellTextCol1.match(/\n/g) || []).length);
      const linesDetail = Math.max(1, Math.ceil(cellTextCol2.length / 28));
      const linesBlock = Math.max(1, Math.ceil(blockLabel.length / 14));
      const maxLines = Math.max(linesText, linesDetail, linesBlock);
      const rowH = Math.max(MIN_ROW_H, maxLines * (FONT_SIZE_BODY + 3) + ROW_PADDING * 2);

      // Seitenumbruch prüfen
      if (tableY + rowH + FOOTER_RESERVE > pageH) {
        addFooter(pageNum);
        doc.addPage();
        pageNum++;
        tableY = m;

        // Tabellen-Header wiederholen
        doc.rect(m, tableY, contentW, ROW_H_HEADER).fill(headerBg);
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff')
          .text('🎙 Sprechtext / Inhalt (Stichpunkte)', COL_X[0] + 3, tableY + 5,
            { width: COL_BLOCK + COL_TEXT - 6, align: 'left' });
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff')
          .text('Details & Regieanweisung', COL_X[2] + 3, tableY + 5,
            { width: COL_DETAIL - 6, align: 'left' });
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff')
          .text('⏱ Dauer', COL_X[3] + 2, tableY + 5,
            { width: COL_DUR - 4, align: 'center' });
        doc.moveTo(COL_X[2], tableY).lineTo(COL_X[2], tableY + ROW_H_HEADER)
          .strokeColor('#ffffff').lineWidth(0.5).stroke();
        doc.moveTo(COL_X[3], tableY).lineTo(COL_X[3], tableY + ROW_H_HEADER)
          .strokeColor('#ffffff').lineWidth(0.5).stroke();
        tableY += ROW_H_HEADER;
        rowAlt = false;
      }

      // Zeilen-Hintergrund (alternierend)
      const rowBg = rowAlt ? '#f8f8f8' : '#ffffff';
      doc.rect(m, tableY, contentW, rowH).fill(rowBg);
      rowAlt = !rowAlt;

      // Äußerer Rahmen der Zeile
      doc.rect(m, tableY, contentW, rowH)
        .strokeColor('#dddddd').lineWidth(0.3).stroke();

      // Vertikale Trennlinien
      doc.moveTo(COL_X[1], tableY).lineTo(COL_X[1], tableY + rowH)
        .strokeColor('#dddddd').lineWidth(0.3).stroke();
      doc.moveTo(COL_X[2], tableY).lineTo(COL_X[2], tableY + rowH)
        .strokeColor('#dddddd').lineWidth(0.3).stroke();
      doc.moveTo(COL_X[3], tableY).lineTo(COL_X[3], tableY + rowH)
        .strokeColor('#dddddd').lineWidth(0.3).stroke();

      // ── Spalte 1: Block-Typ ──────────────────────────────────────────
      // Farbiger linker Rand
      doc.rect(m, tableY, 3, rowH).fill(meta.color);

      doc.fontSize(FONT_SIZE_BODY).font('Helvetica-Bold').fillColor(meta.color)
        .text(blockLabel, m + 5, tableY + ROW_PADDING,
          { width: COL_BLOCK - 8, align: 'left' });

      // ── Spalte 2: Sprechtext ─────────────────────────────────────────
      if (cellTextCol1) {
        doc.fontSize(FONT_SIZE_BODY).font('Helvetica').fillColor('#1a1a1a')
          .text(cellTextCol1, COL_X[1] + 3, tableY + ROW_PADDING,
            { width: COL_TEXT - 6, align: 'left' });
      } else {
        doc.fontSize(FONT_SIZE_SMALL).font('Helvetica').fillColor('#aaaaaa')
          .text('--', COL_X[1] + 3, tableY + ROW_PADDING,
            { width: COL_TEXT - 6, align: 'left' });
      }

      // ── Spalte 3: Details & Regieanweisung ───────────────────────────
      doc.fontSize(FONT_SIZE_SMALL).font('Helvetica').fillColor('#555555')
        .text(cellTextCol2, COL_X[2] + 3, tableY + ROW_PADDING,
          { width: COL_DETAIL - 6, align: 'left' });

      // ── Spalte 4: Dauer ──────────────────────────────────────────────
      doc.fontSize(FONT_SIZE_BODY).font('Helvetica-Bold').fillColor('#333333')
        .text(durStr, COL_X[3] + 2, tableY + ROW_PADDING,
          { width: COL_DUR - 4, align: 'center' });

      tableY += rowH;
    }

    // Abschluss-Linie unter Tabelle
    doc.moveTo(m, tableY).lineTo(pageW - m, tableY)
      .strokeColor(accentColor).lineWidth(0.5).stroke();

    // Gesamtdauer
    const totalDur = blocks.reduce((sum: number, b: any) => sum + (b.duration || 0), 0);
    if (totalDur > 0) {
      tableY += 6;
      doc.fontSize(8).font('Helvetica-Bold').fillColor(primaryColor)
        .text(`Gesamtdauer: ${formatDur(totalDur)}`, m, tableY, { align: 'right', width: contentW });
    }

    // Wasserzeichen
    renderWatermark(doc, layout);
    addFooter(pageNum);

  } else {
    // ═══════════════════════════════════════════════════════════════════════
    // KLASSISCHES LAYOUT (unveränderter Code)
    // ═══════════════════════════════════════════════════════════════════════
    function stripHtmlClassic(html: string): string {
      if (!html) return '';
      return html
        .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<li>/gi, '• ')
        .replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
        .replace(/\n{3,}/g, '\n\n').trim();
    }
    const blockColors: Record<string, string> = {
      intro: '#0891b2', segment: '#2563eb', interview: '#7c3aed',
      interview_questions: '#7c3aed', highlights: '#ca8a04', ad: '#d97706',
      jingle: '#059669', outro: '#dc2626', custom: '#6b7280', moderation: '#0891b2',
    };
    renderPdfHeader(doc, layout, { podcastName, documentTitle, logoPath });
    doc.fontSize(layout.typography.subtitleSize + 2).font(`${layout.typography.fontFamily}-Bold`)
      .fillColor(layout.colors.primary)
      .text(`${ep.number ? `#${ep.number} — ` : ''}${ep.title}`, { align: 'center' });
    if (ep.subtitle) {
      doc.fontSize(layout.typography.subtitleSize).font(layout.typography.fontFamily)
        .fillColor(layout.colors.muted).text(ep.subtitle, { align: 'center' });
    }
    doc.fillColor(layout.colors.text);
    doc.moveDown(0.8);
    if (layout.sections.showMeta) {
      const metaParts = [
        ep.status && `Status: ${ep.status}`,
        ep.recordingDate && `Aufnahme: ${new Date(ep.recordingDate).toLocaleDateString('de-DE')}`,
        ep.publishDate && `Veröffentlichung: ${new Date(ep.publishDate).toLocaleDateString('de-DE')}`,
        ep.hosts?.length && `Hosts: ${ep.hosts.join(', ')}`,
        ep.guests?.length && `Gäste: ${ep.guests.join(', ')}`,
      ].filter(Boolean).join('   |   ');
      if (metaParts) {
        doc.fontSize(layout.typography.smallSize).font(layout.typography.fontFamily)
          .fillColor(layout.colors.muted).text(metaParts);
        doc.fillColor(layout.colors.text);
      }
      doc.moveDown(0.5);
    }
    if (layout.sections.showDescription && ep.description) {
      renderSectionHeading(doc, layout, 'Beschreibung');
      doc.fontSize(layout.typography.bodySize).font(layout.typography.fontFamily)
        .fillColor(layout.colors.text).text(ep.description, { paragraphGap: 4 });
      doc.moveDown();
    }
    if (layout.sections.showBlocks && ep.blocks?.length > 0) {
      renderSectionHeading(doc, layout, 'Skript / Ablauf');
      for (const block of ep.blocks) {
        const bColor = blockColors[block.type] || '#6b7280';
        const blockLabel = block.title || block.type;
        const durText = block.duration ? ` (${formatDur(block.duration)})` : '';
        if (doc.y > doc.page.height - 80) { doc.addPage(); pageNum++; }
        doc.fontSize(layout.typography.bodySize + 1).font(`${layout.typography.fontFamily}-Bold`)
          .fillColor(bColor).text(`${blockLabel}${durText}`);
        doc.fillColor(layout.colors.text);
        if (block.type === 'interview_questions' && Array.isArray(block.questions) && block.questions.length > 0) {
          for (let qi = 0; qi < block.questions.length; qi++) {
            const q = block.questions[qi];
            const questionText = stripHtmlClassic(q.text || q.question || '');
            if (!questionText) continue;
            doc.fontSize(layout.typography.bodySize - 1).font(`${layout.typography.fontFamily}-Bold`)
              .fillColor(bColor).text(`F${qi + 1}: `, { continued: true, indent: 15 });
            doc.font(layout.typography.fontFamily).fillColor(layout.colors.text)
              .text(questionText, { paragraphGap: 2 });
          }
          doc.moveDown(0.5);
          continue;
        }
        let cleanContent = (block.content || '').replace(/\[(INTRO|OUTRO|AD|JINGLE|SEGMENT|INTERVIEW|CUSTOM|MODERATION)\]/gi, '').trim();
        const plainText = stripHtmlClassic(cleanContent);
        if (plainText) {
          doc.fontSize(layout.typography.bodySize).font(layout.typography.fontFamily)
            .text(plainText, { indent: 15, paragraphGap: 3 });
        } else if (!plainText && block.type !== 'jingle' && block.type !== 'ad') {
          doc.fontSize(layout.typography.bodySize - 1).font(layout.typography.fontFamily)
            .fillColor(layout.colors.muted).text('(kein Inhalt)', { indent: 15, paragraphGap: 2 });
          doc.fillColor(layout.colors.text);
        }
        doc.moveDown(0.5);
      }
      doc.moveDown(0.3);
    }
    renderWatermark(doc, layout);
    renderPdfFooter(doc, layout, { podcastName, pageNum });
  }

  // ── Optionale Notizseite ──────────────────────────────────────────────────
  if (addNotesPage) {
    doc.addPage();
    pageNum++;
    const pageW2 = doc.page.width;
    const pageH2 = doc.page.height;
    const contentW2 = pageW2 - 2 * m;
    const accentColor2 = layout.colors.accent || '#4a4a8a';

    // Überschrift
    doc.fontSize(14).font('Helvetica-Bold').fillColor(layout.colors.primary || '#1a1a2e')
      .text('Notizen', m, m);
    doc.fontSize(8).font('Helvetica').fillColor(layout.colors.muted || '#888888')
      .text(`${ep.title}  |  ${new Date().toLocaleDateString('de-DE')}`, m, m + 18);

    // Trennlinie
    doc.moveTo(m, m + 30).lineTo(pageW2 - m, m + 30)
      .strokeColor(accentColor2).lineWidth(1).stroke();

    // Linierte Fläche für Notizen
    const lineStartY = m + 40;
    const lineSpacing = 18;
    const numLines = Math.floor((pageH2 - lineStartY - 40) / lineSpacing);
    for (let i = 0; i < numLines; i++) {
      const ly = lineStartY + i * lineSpacing;
      doc.moveTo(m, ly).lineTo(pageW2 - m, ly)
        .strokeColor('#e0e0e0').lineWidth(0.4).stroke();
    }

    // Footer
    addFooter(pageNum);
  }

  doc.end();
});

// ============================================================
// EPISODE APPROVAL WORKFLOW (continued)
// ============================================================

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

// POST /api/episodes/schedule-pdf — Episodenplanung als PDF exportieren
router.post('/schedule-pdf', requirePermission('canViewEpisodes') as any, (req: AuthRequest, res: Response) => {
  const PDFDocument = require('pdfkit');
  const { episodes: eps, title = 'Episodenplanung', month } = req.body;

  const STATUS_LABELS: Record<string, string> = {
    idee: 'Idee', entwurf: 'Entwurf', aufnahme: 'Aufnahme',
    produktion: 'Produktion', geplant: 'Geplant',
    veroeffentlicht: 'Veröffentlicht', archiviert: 'Archiviert',
  };

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="episodenplanung.pdf"`);
  doc.pipe(res);

  // Header
  doc.fontSize(22).fillColor('#7c3aed').text(title, { align: 'center' });
  if (month) doc.fontSize(14).fillColor('#888').text(month, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#888').text(`Erstellt am ${new Date().toLocaleDateString('de-DE')} — ${eps.length} Episode${eps.length !== 1 ? 'n' : ''}`, { align: 'center' });
  doc.moveDown(1);

  // Trennlinie
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#7c3aed').lineWidth(1).stroke();
  doc.moveDown(0.5);

  // Episoden-Tabelle
  const colX = [50, 80, 280, 370, 460, 530];
  const headers = ['#', 'Titel', 'Status', 'Aufnahme', 'Veröffentl.', 'Script'];

  // Tabellen-Header
  doc.fontSize(9).fillColor('#7c3aed');
  headers.forEach((h, i) => doc.text(h, colX[i], doc.y, { width: (colX[i + 1] || 560) - colX[i] - 4, continued: i < headers.length - 1 }));
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').lineWidth(0.5).stroke();
  doc.moveDown(0.3);

  // Episoden-Zeilen
  const sorted = [...(eps || [])].sort((a: any, b: any) => {
    const da = a.publishDate || a.recordingDate || '';
    const db2 = b.publishDate || b.recordingDate || '';
    return da.localeCompare(db2);
  });

  sorted.forEach((ep: any, idx: number) => {
    if (doc.y > 750) { doc.addPage(); }
    const rowY = doc.y;
    const bg = idx % 2 === 0 ? '#f8f8f8' : '#ffffff';
    doc.rect(50, rowY - 2, 495, 16).fillColor(bg).fill();

    doc.fontSize(8).fillColor('#222');
    const cells = [
      ep.number ? `#${ep.number}` : '—',
      (ep.title || '').slice(0, 35),
      STATUS_LABELS[ep.status] || ep.status || '—',
      ep.recordingDate ? new Date(ep.recordingDate).toLocaleDateString('de-DE') : '—',
      ep.publishDate ? new Date(ep.publishDate).toLocaleDateString('de-DE') : '—',
      ep.scriptReady ? '✓' : '—',
    ];
    cells.forEach((c, i) => {
      doc.text(String(c), colX[i], rowY, { width: (colX[i + 1] || 560) - colX[i] - 4, continued: i < cells.length - 1 });
    });
    doc.moveDown(0.3);
  });

  doc.end();
});

export default router;
