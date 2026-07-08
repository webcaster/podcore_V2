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
  if (!row) return res.status(404).json({ success: false, error: 'Episode nicht gefunden' });

  const ep = parseEpisode(row);
  const PDFDocument = require('pdfkit');
  const fs = require('fs');
  const path = require('path');
  const { DATA_DIR } = require('../database');
  const { getDefaultLayoutForType, getLayoutById, renderPdfHeader, renderPdfFooter, renderSectionHeading, renderWatermark, getLineSpacingFactor } = require('../pdfLayouts');

  // Layout auswählen: ?layoutId=... oder Standard
  const layoutId = req.query.layoutId as string | undefined;
  const layout = layoutId ? (getLayoutById(layoutId) || getDefaultLayoutForType('episode')) : getDefaultLayoutForType('episode');
  const m = layout.pageMargin;

  // Anpassbarer Dokumententitel
  const customDocTitle = req.query.documentTitle as string | undefined;
  const documentTitle = customDocTitle ? decodeURIComponent(customDocTitle) : 'Episoden-Dokument';

  const doc = new PDFDocument({ margin: m, size: layout.pageSize, layout: layout.pageOrientation === 'landscape' ? 'landscape' : 'portrait', autoFirstPage: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="episode-${ep.number || ep.id}.pdf"`);
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

  // ── Header ──────────────────────────────────────────────────────────
  renderPdfHeader(doc, layout, { podcastName, documentTitle, logoPath });

  // ── Episodentitel ─────────────────────────────────────────────────
  doc.fontSize(layout.typography.subtitleSize + 2).font(`${layout.typography.fontFamily}-Bold`)
    .fillColor(layout.colors.primary)
    .text(`${ep.number ? `#${ep.number} — ` : ''}${ep.title}`, { align: 'center' });
  if (ep.subtitle) {
    doc.fontSize(layout.typography.subtitleSize).font(layout.typography.fontFamily)
      .fillColor(layout.colors.muted).text(ep.subtitle, { align: 'center' });
  }
  doc.fillColor(layout.colors.text);
  doc.moveDown(0.8);

  // ── Meta ───────────────────────────────────────────────────────────
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

  // ── Beschreibung ────────────────────────────────────────────────
  if (layout.sections.showDescription && ep.description) {
    renderSectionHeading(doc, layout, 'Beschreibung');
    doc.fontSize(layout.typography.bodySize).font(layout.typography.fontFamily)
      .fillColor(layout.colors.text).text(ep.description, { paragraphGap: 4 });
    doc.moveDown();
  }

  // ── Blöcke / Script ───────────────────────────────────────────────
  if (layout.sections.showBlocks && ep.blocks?.length > 0) {
    const blockColors: Record<string, string> = {
      intro: '#0891b2', segment: '#2563eb', interview: '#7c3aed',
      interview_questions: '#7c3aed', highlights: '#ca8a04', ad: '#d97706',
      jingle: '#059669', outro: '#dc2626', custom: '#6b7280', moderation: '#0891b2',
    };
    const blockTypeLabels: Record<string, string> = {
      intro: 'INTRO', segment: 'SEGMENT', interview: 'INTERVIEW',
      interview_questions: 'INTERVIEW-FRAGEN', highlights: 'HIGHLIGHTS',
      ad: 'WERBUNG', jingle: 'JINGLE', outro: 'OUTRO', custom: 'CUSTOM',
      moderation: 'MODERATION',
    };

    const stripHtml = (html: string) =>
      (html || '').replace(/<[^>]*>?/gm, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim();

    for (const block of ep.blocks) {
      const bColor = blockColors[block.type] || layout.colors.secondary;
      const typeLabel = blockTypeLabels[block.type] || (block.type || 'BLOCK').toUpperCase();
      const durationStr = block.duration ? ` (${block.duration}s)` : '';
      const blockTitle = block.title ? `${block.title}${durationStr}` : `${typeLabel}${durationStr}`;

      // Block-Titel
      doc.fontSize(layout.typography.bodySize).font(`${layout.typography.fontFamily}-Bold`).fillColor(bColor)
        .text(blockTitle);
      doc.fillColor(layout.colors.text);

      // ── Spezielles Rendering für interview_questions ──────────────────
      if (block.type === 'interview_questions' && Array.isArray(block.questions) && block.questions.length > 0) {
        for (let qi = 0; qi < block.questions.length; qi++) {
          const q = block.questions[qi];
          const questionText = stripHtml(q.text || q.question || '');
          if (!questionText) continue;

          // Fragen-Nummer und Text
          doc.fontSize(layout.typography.bodySize - 1)
            .font(`${layout.typography.fontFamily}-Bold`)
            .fillColor(bColor)
            .text(`F${qi + 1}: `, { continued: true, indent: 15 });
          doc.font(layout.typography.fontFamily)
            .fillColor(layout.colors.text)
            .text(questionText, { paragraphGap: 2 });

          // Kategorie (wenn vorhanden)
          if (q.category) {
            doc.fontSize(layout.typography.bodySize - 2)
              .font(layout.typography.fontFamily)
              .fillColor(layout.colors.muted)
              .text(`Kategorie: ${q.category}`, { indent: 25, paragraphGap: 1 });
          }

          // Antwortzeit (wenn vorhanden)
          if (q.answerDuration) {
            doc.fontSize(layout.typography.bodySize - 2)
              .font(layout.typography.fontFamily)
              .fillColor(layout.colors.muted)
              .text(`Antwortzeit: ${q.answerDuration}s`, { indent: 25, paragraphGap: 2 });
          }

          // Moderationshinweis (wenn vorhanden, nicht intern)
          if (q.note && !q.internalOnly) {
            const noteText = stripHtml(q.note);
            if (noteText) {
              doc.fontSize(layout.typography.bodySize - 2)
                .font(layout.typography.fontFamily)
                .fillColor(layout.colors.muted)
                .text(`Hinweis: ${noteText}`, { indent: 25, paragraphGap: 2 });
            }
          }
        }
        doc.moveDown(0.5);
        continue;
      }

      // ── Standard-Rendering für alle anderen Block-Typen ──────────────
      let cleanContent = (block.content || '').replace(/\[(INTRO|OUTRO|AD|JINGLE|SEGMENT|INTERVIEW|CUSTOM|MODERATION)\]/gi, '').trim();
      const plainText = stripHtml(cleanContent);

      if (plainText) {
        doc.fontSize(layout.typography.bodySize).font(layout.typography.fontFamily)
          .text(plainText, { indent: 15, paragraphGap: 3 });
      } else if (!plainText && block.type !== 'jingle' && block.type !== 'ad') {
        // Kein Inhalt – kurze Platzhalter-Zeile
        doc.fontSize(layout.typography.bodySize - 1).font(layout.typography.fontFamily)
          .fillColor(layout.colors.muted)
          .text('(kein Inhalt)', { indent: 15, paragraphGap: 2 });
        doc.fillColor(layout.colors.text);
      }
      doc.moveDown(0.5);
    }
    doc.moveDown(0.3);
  }

  // ── Produktions-Info ──────────────────────────────────────────────
  if (layout.sections.showProductionInfo && ep.productionInfo) {
    renderSectionHeading(doc, layout, 'Produktions-Informationen');
    doc.fontSize(layout.typography.bodySize).font(layout.typography.fontFamily)
      .fillColor(layout.colors.text).text(ep.productionInfo, { paragraphGap: 4 });
    doc.moveDown();
  }

  // ── Technische Daten ──────────────────────────────────────────────
  if (layout.sections.showTechnicalData) {
    const td = ep.technicalData || {};
    const tdFields = Object.entries(td).filter(([, v]) => v);
    if (tdFields.length > 0) {
      renderSectionHeading(doc, layout, 'Technische Daten');
      for (const [key, value] of tdFields) {
        doc.fontSize(layout.typography.bodySize);
        doc.font(`${layout.typography.fontFamily}-Bold`).fillColor(layout.colors.secondary).text(`${key}: `, { continued: true });
        doc.font(layout.typography.fontFamily).fillColor(layout.colors.text).text(String(value));
      }
      doc.moveDown();
    }
  }

  // ── Interne Notizen ───────────────────────────────────────────────
  if (layout.sections.showNotes && ep.notes) {
    renderSectionHeading(doc, layout, 'Interne Notizen');
    doc.fontSize(layout.typography.bodySize).font(layout.typography.fontFamily)
      .fillColor(layout.colors.muted).text(ep.notes, { paragraphGap: 4 });
    doc.fillColor(layout.colors.text);
    doc.moveDown();
  }

  // ── Show-Notes (öffentlich) ───────────────────────────────────────
  if (layout.sections.showShowNotes && ep.showNotes) {
    renderSectionHeading(doc, layout, 'Show-Notes');
    const showNotesText = ep.showNotes.replace(/<[^>]*>?/gm, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim();
    if (showNotesText) {
      doc.fontSize(layout.typography.bodySize).font(layout.typography.fontFamily)
        .fillColor(layout.colors.text).text(showNotesText, { paragraphGap: 4 });
    }
    doc.moveDown();
  }

  // ── Alternative Episodenlänge ─────────────────────────────────────
  if (layout.sections.showAltDuration && ep.altDuration) {
    renderSectionHeading(doc, layout, 'Sonderfolge – Alternative Ziel-Länge');
    doc.fontSize(layout.typography.bodySize).font(layout.typography.fontFamily)
      .fillColor(layout.colors.text).text(`${ep.altDuration} Minuten (Sonderformat)`);
    doc.moveDown();
  }

  // ── Sponsoren (Episode) ───────────────────────────────────────────
  if (layout.sections.showSponsors && ep.sponsors?.length > 0) {
    renderSectionHeading(doc, layout, 'Sponsoren');
    for (const sp of ep.sponsors) {
      doc.fontSize(layout.typography.bodySize).font(`${layout.typography.fontFamily}-Bold`)
        .fillColor(layout.colors.secondary).text(sp.name || sp.sponsorId || 'Sponsor', { continued: sp.position ? true : false });
      if (sp.position) {
        doc.font(layout.typography.fontFamily).fillColor(layout.colors.muted)
          .text(`  (${sp.position}${sp.duration ? `, ${sp.duration}s` : ''})`);
      } else {
        doc.text('');
      }
      doc.fillColor(layout.colors.text);
    }
    doc.moveDown();
  }

  // ── Wasserzeichen ─────────────────────────────────────────────────
  renderWatermark(doc, layout);

  // ── Footer ───────────────────────────────────────────────────────────
  renderPdfFooter(doc, layout, { podcastName, pageNum: 1 });
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
