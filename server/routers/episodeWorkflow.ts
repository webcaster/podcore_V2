import { execFile } from 'child_process';
import { Router, Response } from 'express';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';
import { AuthRequest, requireAuth, requirePermission } from '../middleware/auth';
import { broadcastRealtime, notifyUserRealtime } from '../services/realtime';

const router: import('express').Router = Router();
router.use(requireAuth as any);

const FIELD_MAP: Record<string, { column: string; json?: boolean; nullable?: boolean }> = {
  number: { column: 'number', nullable: true },
  title: { column: 'title' },
  subtitle: { column: 'subtitle', nullable: true },
  description: { column: 'description', nullable: true },
  status: { column: 'status' },
  recordingDate: { column: 'recording_date', nullable: true },
  publishDate: { column: 'publish_date', nullable: true },
  plannedDate: { column: 'planned_date', nullable: true },
  duration: { column: 'duration', nullable: true },
  altDuration: { column: 'alt_duration', nullable: true },
  hosts: { column: 'hosts', json: true },
  guests: { column: 'guests', json: true },
  tags: { column: 'tags', json: true },
  blocks: { column: 'blocks', json: true },
  sponsors: { column: 'sponsors', json: true },
  notes: { column: 'notes', nullable: true },
  showNotes: { column: 'show_notes', nullable: true },
  productionInfo: { column: 'production_info', nullable: true },
  technicalData: { column: 'technical_data', json: true },
};

const STATUS_VALUES = new Set([
  'idee', 'entwurf', 'aufnahme', 'produktion', 'in-bearbeitung', 'review',
  'freigegeben', 'geplant', 'veröffentlicht', 'veroeffentlicht', 'archiviert',
  'draft', 'recording', 'editing', 'approved', 'scheduled', 'published', 'archived',
]);

function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value !== 'string') return value as T;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function episodeSnapshot(row: any): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {};
  for (const [field, config] of Object.entries(FIELD_MAP)) {
    const raw = row[config.column];
    snapshot[field] = config.json ? parseJson(raw, field === 'technicalData' ? {} : []) : raw;
  }
  snapshot.id = row.id;
  snapshot.ideaId = row.idea_id || null;
  snapshot.updatedAt = row.updated_at;
  return snapshot;
}

function nextRevisionNumber(db: any, episodeId: string): number {
  const row = db.get('SELECT COALESCE(MAX(revision_number), 0) AS revision FROM episode_revisions WHERE episode_id = ?', [episodeId]) as any;
  return Number(row?.revision || 0) + 1;
}

function writeRevision(db: any, episode: any, changedFields: string[], changeType: string, req: AuthRequest): any {
  const id = uuidv4();
  const revisionNumber = nextRevisionNumber(db, episode.id);
  db.run(
    `INSERT INTO episode_revisions (id, episode_id, revision_number, snapshot, changed_fields, change_type, changed_by, changed_by_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, episode.id, revisionNumber, JSON.stringify(episodeSnapshot(episode)), JSON.stringify(changedFields), changeType,
      req.user?.id || null, req.user?.displayName || req.user?.username || null]
  );
  return { id, revisionNumber };
}

function createNotification(db: any, userId: string, type: string, title: string, message: string, episodeId?: string, metadata: any = {}): void {
  const id = uuidv4();
  db.run(
    `INSERT INTO notifications (id, user_id, type, title, message, entity_type, entity_id, metadata)
     VALUES (?, ?, ?, ?, ?, 'episode', ?, ?)`,
    [id, userId, type, title, message, episodeId || null, JSON.stringify(metadata)]
  );
  notifyUserRealtime(userId, { type: 'notification.created', episodeId, payload: { id, type, title, message, metadata } });
}

function parseComment(row: any): any {
  return {
    id: row.id,
    episodeId: row.episode_id,
    fieldKey: row.field_key,
    parentId: row.parent_id,
    content: row.content,
    mentions: parseJson(row.mentions, []),
    isResolved: row.is_resolved === 1,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at,
    createdBy: row.created_by,
    authorName: row.author_name || row.author_username || 'Unbekannt',
    authorUsername: row.author_username,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validateField(field: string, value: any): string | null {
  if (!FIELD_MAP[field]) return 'Dieses Feld unterstützt kein Inline-Speichern.';
  if (field === 'title' && (!String(value || '').trim() || String(value).length > 240)) return 'Der Titel muss 1 bis 240 Zeichen enthalten.';
  if (field === 'status' && !STATUS_VALUES.has(String(value))) return 'Ungültiger Episodenstatus.';
  if (['duration', 'altDuration'].includes(field) && value !== null && value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0)) return 'Die Dauer muss eine positive Zahl sein.';
  if (FIELD_MAP[field].json && field !== 'technicalData' && !Array.isArray(value)) return `${field} muss eine Liste sein.`;
  return null;
}

// Persönlicher Notification-Feed.
router.get('/notifications', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const limit = Math.min(Math.max(Number(req.query.limit || 30), 1), 100);
  const rows = db.all('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', [req.user!.id, limit]) as any[];
  return res.json({ success: true, data: rows.map(row => ({ ...row, isRead: row.is_read === 1, metadata: parseJson(row.metadata, {}) })) });
});

router.post('/notifications/read', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  if (ids.length) {
    const placeholders = ids.map(() => '?').join(',');
    db.run(`UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id IN (${placeholders})`, [req.user!.id, ...ids]);
  } else {
    db.run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user!.id]);
  }
  return res.json({ success: true, data: { updated: ids.length || 'all' } });
});

router.get('/team', (_req: AuthRequest, res: Response) => {
  const db = getDb();
  const users = db.all('SELECT id, username, display_name, role FROM users WHERE is_active = 1 ORDER BY display_name, username') as any[];
  return res.json({ success: true, data: users.map(user => ({ id: user.id, username: user.username, displayName: user.display_name, role: user.role })) });
});

// Feldweises Auto-Save mit optimistischer Konflikterkennung und Audit-Snapshot.
router.patch('/:episodeId/field', requirePermission('canEditEpisodes') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { field, value, expectedUpdatedAt } = req.body || {};
  const error = validateField(field, value);
  if (error) return res.status(400).json({ success: false, error });

  const existing = db.get('SELECT * FROM episodes WHERE id = ?', [req.params.episodeId]) as any;
  if (!existing) return res.status(404).json({ success: false, error: 'Episode nicht gefunden.' });
  if (expectedUpdatedAt && existing.updated_at && expectedUpdatedAt !== existing.updated_at) {
    return res.status(409).json({ success: false, error: 'Die Episode wurde zwischenzeitlich von einer anderen Person geändert.', data: { updatedAt: existing.updated_at } });
  }

  const config = FIELD_MAP[field];
  const storedValue = config.json ? JSON.stringify(value ?? (field === 'technicalData' ? {} : [])) : (value === '' && config.nullable ? null : value);
  db.run(`UPDATE episodes SET ${config.column} = ?, updated_at = datetime('now') WHERE id = ?`, [storedValue, req.params.episodeId]);
  const updated = db.get('SELECT * FROM episodes WHERE id = ?', [req.params.episodeId]) as any;
  const revision = writeRevision(db, updated, [field], 'auto-save', req);

  const event = {
    type: 'episode.field.updated',
    episodeId: updated.id,
    userId: req.user!.id,
    payload: { field, value, updatedAt: updated.updated_at, revisionNumber: revision.revisionNumber, changedBy: req.user!.displayName },
  };
  broadcastRealtime(event);
  return res.json({ success: true, data: { episode: episodeSnapshot(updated), revision } });
});

// Feldbezogene Kommentare, Antworten und @Mentions.
router.get('/:episodeId/comments', requirePermission('canViewEpisodes') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { fieldKey } = req.query;
  const params: any[] = [req.params.episodeId];
  let where = 'c.episode_id = ?';
  if (fieldKey) { where += ' AND c.field_key = ?'; params.push(String(fieldKey)); }
  const rows = db.all(
    `SELECT c.*, u.display_name AS author_name, u.username AS author_username
     FROM episode_comments c LEFT JOIN users u ON u.id = c.created_by
     WHERE ${where} ORDER BY c.created_at ASC`, params
  ) as any[];
  return res.json({ success: true, data: rows.map(parseComment) });
});

router.post('/:episodeId/comments', requirePermission('canEditEpisodes') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const content = String(req.body?.content || '').trim();
  const fieldKey = String(req.body?.fieldKey || 'general');
  const parentId = req.body?.parentId || null;
  if (!content) return res.status(400).json({ success: false, error: 'Kommentar darf nicht leer sein.' });

  const episode = db.get('SELECT id, title FROM episodes WHERE id = ?', [req.params.episodeId]) as any;
  if (!episode) return res.status(404).json({ success: false, error: 'Episode nicht gefunden.' });

  const explicitMentions = Array.isArray(req.body?.mentions) ? req.body.mentions : [];
  const usernames = Array.from(content.matchAll(/@([a-zA-Z0-9_.-]+)/g)).map(match => match[1]);
  let mentionedUsers: any[] = [];
  if (usernames.length) {
    const placeholders = usernames.map(() => '?').join(',');
    mentionedUsers = db.all(`SELECT id, username FROM users WHERE username IN (${placeholders})`, usernames) as any[];
  }
  const mentionIds = Array.from(new Set([...explicitMentions, ...mentionedUsers.map(user => user.id)])).filter(id => id !== req.user!.id);

  const id = uuidv4();
  db.run(
    `INSERT INTO episode_comments (id, episode_id, field_key, parent_id, content, mentions, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, episode.id, fieldKey, parentId, content, JSON.stringify(mentionIds), req.user!.id]
  );
  const row = db.get(
    `SELECT c.*, u.display_name AS author_name, u.username AS author_username
     FROM episode_comments c LEFT JOIN users u ON u.id = c.created_by WHERE c.id = ?`, [id]
  ) as any;
  const comment = parseComment(row);

  for (const userId of mentionIds as string[]) {
    createNotification(db, userId, 'mention', `Erwähnung in „${episode.title}“`, `${req.user!.displayName} hat dich in einem Kommentar erwähnt.`, episode.id, { commentId: id, fieldKey });
  }
  broadcastRealtime({ type: 'episode.comment.created', episodeId: episode.id, userId: req.user!.id, payload: comment });
  return res.status(201).json({ success: true, data: comment });
});

router.patch('/:episodeId/comments/:commentId/resolve', requirePermission('canEditEpisodes') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const resolved = req.body?.resolved !== false;
  db.run(
    `UPDATE episode_comments SET is_resolved = ?, resolved_by = ?, resolved_at = ?, updated_at = datetime('now')
     WHERE id = ? AND episode_id = ?`,
    [resolved ? 1 : 0, resolved ? req.user!.id : null, resolved ? new Date().toISOString() : null, req.params.commentId, req.params.episodeId]
  );
  broadcastRealtime({ type: 'episode.comment.resolved', episodeId: req.params.episodeId, userId: req.user!.id, payload: { commentId: req.params.commentId, resolved } });
  return res.json({ success: true, data: { id: req.params.commentId, resolved } });
});

router.delete('/:episodeId/comments/:commentId', requirePermission('canEditEpisodes') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const comment = db.get('SELECT created_by FROM episode_comments WHERE id = ? AND episode_id = ?', [req.params.commentId, req.params.episodeId]) as any;
  if (!comment) return res.status(404).json({ success: false, error: 'Kommentar nicht gefunden.' });
  if (comment.created_by !== req.user!.id && req.user!.role !== 'admin') return res.status(403).json({ success: false, error: 'Nur Autor oder Admin darf diesen Kommentar löschen.' });
  db.run('DELETE FROM episode_comments WHERE id = ? OR parent_id = ?', [req.params.commentId, req.params.commentId]);
  broadcastRealtime({ type: 'episode.comment.deleted', episodeId: req.params.episodeId, userId: req.user!.id, payload: { commentId: req.params.commentId } });
  return res.json({ success: true, data: { id: req.params.commentId } });
});

// Lückenloser Revisionsverlauf und Rollback.
router.get('/:episodeId/history', requirePermission('canViewEpisodes') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const rows = db.all('SELECT * FROM episode_revisions WHERE episode_id = ? ORDER BY revision_number DESC', [req.params.episodeId]) as any[];
  return res.json({ success: true, data: rows.map(row => ({
    id: row.id, episodeId: row.episode_id, revisionNumber: row.revision_number,
    snapshot: parseJson(row.snapshot, {}), changedFields: parseJson(row.changed_fields, []),
    changeType: row.change_type, changedBy: row.changed_by, changedByName: row.changed_by_name, createdAt: row.created_at,
  })) });
});

router.post('/:episodeId/history/:revisionId/rollback', requirePermission('canEditEpisodes') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const revision = db.get('SELECT * FROM episode_revisions WHERE id = ? AND episode_id = ?', [req.params.revisionId, req.params.episodeId]) as any;
  if (!revision) return res.status(404).json({ success: false, error: 'Revision nicht gefunden.' });
  const snapshot = parseJson<Record<string, any>>(revision.snapshot, {});
  const fields = Object.keys(FIELD_MAP).filter(field => Object.prototype.hasOwnProperty.call(snapshot, field));
  if (!fields.length) return res.status(400).json({ success: false, error: 'Revision enthält keine wiederherstellbaren Felder.' });

  const assignments = fields.map(field => `${FIELD_MAP[field].column} = ?`).join(', ');
  const values = fields.map(field => FIELD_MAP[field].json ? JSON.stringify(snapshot[field]) : snapshot[field]);
  db.run(`UPDATE episodes SET ${assignments}, updated_at = datetime('now') WHERE id = ?`, [...values, req.params.episodeId]);
  const updated = db.get('SELECT * FROM episodes WHERE id = ?', [req.params.episodeId]) as any;
  const rollbackRevision = writeRevision(db, updated, fields, `rollback:${revision.revision_number}`, req);
  broadcastRealtime({ type: 'episode.rollback.completed', episodeId: req.params.episodeId, userId: req.user!.id, payload: { sourceRevision: revision.revision_number, revision: rollbackRevision, episode: episodeSnapshot(updated) } });
  return res.json({ success: true, data: { episode: episodeSnapshot(updated), revision: rollbackRevision } });
});

// Medienverknüpfungen im Editor.
router.get('/:episodeId/media', requirePermission('canViewEpisodes') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const rows = db.all(
    `SELECT l.id AS link_id, l.relation_type, l.sort_order, l.created_at AS linked_at, a.*
     FROM episode_media_links l JOIN assets a ON a.id = l.asset_id
     WHERE l.episode_id = ? ORDER BY l.sort_order, l.created_at`, [req.params.episodeId]
  ) as any[];
  return res.json({ success: true, data: rows.map(row => ({ ...row, linkId: row.link_id, relationType: row.relation_type, tags: parseJson(row.tags, []), markers: parseJson(row.markers, []) })) });
});

router.post('/:episodeId/media', requirePermission('canEditEpisodes') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const assetId = String(req.body?.assetId || '');
  const asset = db.get('SELECT * FROM assets WHERE id = ?', [assetId]) as any;
  if (!asset) return res.status(404).json({ success: false, error: 'Medium nicht gefunden.' });
  const id = uuidv4();
  db.run(
    `INSERT OR IGNORE INTO episode_media_links (id, episode_id, asset_id, relation_type, sort_order, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, req.params.episodeId, assetId, req.body?.relationType || 'source', Number(req.body?.sortOrder || 0), req.user!.id]
  );
  broadcastRealtime({ type: 'episode.media.linked', episodeId: req.params.episodeId, userId: req.user!.id, payload: { assetId } });
  return res.status(201).json({ success: true, data: { id, assetId } });
});

router.delete('/:episodeId/media/:assetId', requirePermission('canEditEpisodes') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.run('DELETE FROM episode_media_links WHERE episode_id = ? AND asset_id = ?', [req.params.episodeId, req.params.assetId]);
  broadcastRealtime({ type: 'episode.media.unlinked', episodeId: req.params.episodeId, userId: req.user!.id, payload: { assetId: req.params.assetId } });
  return res.json({ success: true, data: { assetId: req.params.assetId } });
});

// Gewichtetes, erklärbares Sponsor-Matching.
router.get('/:episodeId/sponsoring/recommendations', requirePermission('canViewSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const episode = db.get('SELECT * FROM episodes WHERE id = ?', [req.params.episodeId]) as any;
  if (!episode) return res.status(404).json({ success: false, error: 'Episode nicht gefunden.' });
  const episodeTags = parseJson<string[]>(episode.tags, []).map(tag => String(tag).toLowerCase());
  const haystack = `${episode.title || ''} ${episode.subtitle || ''} ${episode.description || ''}`.toLowerCase();
  const sponsors = db.all("SELECT * FROM sponsors WHERE status NOT IN ('inaktiv', 'abgelehnt') ORDER BY name") as any[];

  const recommendations = sponsors.map(sponsor => {
    const sponsorTags = [...parseJson<string[]>(sponsor.tags, []), ...parseJson<string[]>(sponsor.target_tags, [])].map(tag => String(tag).toLowerCase());
    const overlap = Array.from(new Set(episodeTags.filter(tag => sponsorTags.includes(tag))));
    const audienceWords = String(sponsor.target_audience || sponsor.description || '').toLowerCase().split(/[^a-z0-9äöüß]+/).filter((word: string) => word.length >= 4);
    const audienceMatches = audienceWords.filter((word: string) => haystack.includes(word)).slice(0, 5);
    const slots = db.all(
      `SELECT s.*, c.name AS category_name, c.default_position, c.default_duration
       FROM ad_slots s LEFT JOIN ad_categories c ON c.id = s.category_id
       WHERE s.sponsor_id = ? AND s.status IN ('aktiv', 'bestätigt', 'verfügbar')`, [sponsor.id]
    ) as any[];
    let score = 15;
    const reasons: string[] = ['Aktiver Sponsorenkontakt'];
    if (overlap.length) { score += Math.min(45, overlap.length * 15); reasons.push(`Tag-Match: ${overlap.join(', ')}`); }
    if (audienceMatches.length) { score += Math.min(20, audienceMatches.length * 5); reasons.push(`Zielgruppenbezug: ${audienceMatches.join(', ')}`); }
    const duration = Number(episode.duration || episode.alt_duration || 0);
    const durationFits = (!sponsor.min_episode_duration || duration >= sponsor.min_episode_duration) && (!sponsor.max_episode_duration || duration <= sponsor.max_episode_duration);
    if (durationFits) { score += 10; reasons.push('Episodenlänge passt'); }
    if (slots.length) { score += 10; reasons.push(`${slots.length} verfügbarer Werbeplatz` + (slots.length === 1 ? '' : 'e')); }
    return { sponsor: { ...sponsor, tags: parseJson(sponsor.tags, []), targetTags: parseJson(sponsor.target_tags, []), targetCategories: parseJson(sponsor.target_categories, []) }, score: Math.min(score, 100), reasons, slots };
  }).sort((a, b) => b.score - a.score);

  return res.json({ success: true, data: recommendations });
});

router.post('/:episodeId/sponsoring/quick-book', requirePermission('canEditSponsors') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const sponsorId = String(req.body?.sponsorId || '');
  const slotId = String(req.body?.slotId || '');
  const sponsor = db.get('SELECT * FROM sponsors WHERE id = ?', [sponsorId]) as any;
  const slot = db.get('SELECT * FROM ad_slots WHERE id = ? AND sponsor_id = ?', [slotId, sponsorId]) as any;
  if (!sponsor || !slot) return res.status(400).json({ success: false, error: 'Sponsor oder Werbeplatz ist nicht verfügbar.' });
  const existing = db.get('SELECT id FROM episode_ad_bookings WHERE episode_id = ? AND ad_slot_id = ?', [req.params.episodeId, slotId]);
  if (existing) return res.status(409).json({ success: false, error: 'Dieser Werbeplatz ist bereits für die Episode gebucht.' });

  const id = uuidv4();
  db.run(
    `INSERT INTO episode_ad_bookings (id, episode_id, ad_slot_id, ad_category_id, sponsor_id, position, duration, confirmed, presentation_text)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [id, req.params.episodeId, slotId, slot.category_id || null, sponsorId, req.body?.position || 'mid-roll', req.body?.duration || null, req.body?.presentationText || null]
  );
  writeRevision(db, db.get('SELECT * FROM episodes WHERE id = ?', [req.params.episodeId]), ['sponsors'], 'sponsoring-quick-book', req);
  broadcastRealtime({ type: 'episode.sponsoring.booked', episodeId: req.params.episodeId, userId: req.user!.id, payload: { id, sponsorId, slotId, sponsorName: sponsor.name } });
  return res.status(201).json({ success: true, data: { id, sponsorId, slotId } });
});

function markerSeconds(marker: any): number | null {
  const value = marker?.time ?? marker?.start ?? marker?.position ?? marker?.timestamp;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? Math.round(seconds) : null;
}

function runAudioAnalysis(jobId: string, episodeId: string, assetId: string): void {
  const db = getDb();
  const asset = db.get('SELECT * FROM assets WHERE id = ?', [assetId]) as any;
  const episode = db.get('SELECT id, idea_id FROM episodes WHERE id = ?', [episodeId]) as any;
  if (!asset || !episode) return;
  db.run("UPDATE audio_analysis_jobs SET status = 'processing', progress = 10, updated_at = datetime('now') WHERE id = ?", [jobId]);

  const finish = (chapters: any[], source: string, durationFromProbe?: number) => {
    try {
      const questions = db.all(
        `SELECT * FROM interview_questions WHERE episode_id = ? OR (? IS NOT NULL AND idea_id = ?) ORDER BY sort_order, created_at`,
        [episodeId, episode.idea_id, episode.idea_id]
      ) as any[];
      const duration = Number(durationFromProbe || asset.duration || 0);
      let timestamps = chapters.map(markerSeconds).filter((value): value is number => value !== null).sort((a, b) => a - b);
      if (!timestamps.length && questions.length) {
        const usableDuration = duration > 0 ? duration : Math.max(questions.length * 120, 600);
        timestamps = questions.map((_, index) => Math.round((usableDuration * (index + 1)) / (questions.length + 1)));
        source = duration > 0 ? 'audio-duration' : 'estimated-structure';
      }
      const mapped = questions.map((question, index) => {
        const timestamp = timestamps[Math.min(index, Math.max(timestamps.length - 1, 0))] ?? null;
        db.run('UPDATE interview_questions SET timestamp_seconds = ?, timestamp_source = ?, updated_at = datetime(\'now\') WHERE id = ?', [timestamp, source, question.id]);
        return { questionId: question.id, question: question.question, timestampSeconds: timestamp, source };
      });
      const result = { mapped, source, markersFound: chapters.length, duration };
      db.run("UPDATE audio_analysis_jobs SET status = 'completed', progress = 100, result = ?, source = ?, updated_at = datetime('now') WHERE id = ?", [JSON.stringify(result), source, jobId]);
      broadcastRealtime({ type: 'episode.audio-analysis.completed', episodeId, payload: { jobId, ...result } });
    } catch (error: any) {
      db.run("UPDATE audio_analysis_jobs SET status = 'failed', error = ?, updated_at = datetime('now') WHERE id = ?", [error.message || 'Analyse fehlgeschlagen', jobId]);
      broadcastRealtime({ type: 'episode.audio-analysis.failed', episodeId, payload: { jobId, error: error.message } });
    }
  };

  const embedded = parseJson<any[]>(asset.markers, []);
  if (embedded.length) {
    finish(embedded, 'asset-markers');
    return;
  }
  if (!asset.filepath || !fs.existsSync(asset.filepath)) {
    finish([], 'estimated-structure');
    return;
  }

  execFile('ffprobe', ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_chapters', asset.filepath], { timeout: 30000 }, (error, stdout) => {
    if (error) { finish([], 'audio-duration'); return; }
    try {
      const data = JSON.parse(stdout || '{}');
      const chapters = Array.isArray(data.chapters) ? data.chapters.map((chapter: any) => ({ time: Number(chapter.start_time), title: chapter.tags?.title })) : [];
      finish(chapters, chapters.length ? 'embedded-chapters' : 'audio-duration', Number(data.format?.duration || 0));
    } catch {
      finish([], 'audio-duration');
    }
  });
}

router.post('/:episodeId/audio/:assetId/analyze', requirePermission('canEditEpisodes') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const link = db.get('SELECT id FROM episode_media_links WHERE episode_id = ? AND asset_id = ?', [req.params.episodeId, req.params.assetId]);
  const asset = db.get('SELECT * FROM assets WHERE id = ?', [req.params.assetId]) as any;
  if (!asset) return res.status(404).json({ success: false, error: 'Audiodatei nicht gefunden.' });
  if (!link) {
    db.run('INSERT OR IGNORE INTO episode_media_links (id, episode_id, asset_id, relation_type, created_by) VALUES (?, ?, ?, ?, ?)', [uuidv4(), req.params.episodeId, req.params.assetId, 'analysis-source', req.user!.id]);
  }
  const jobId = uuidv4();
  db.run('INSERT INTO audio_analysis_jobs (id, episode_id, asset_id, created_by) VALUES (?, ?, ?, ?)', [jobId, req.params.episodeId, req.params.assetId, req.user!.id]);
  setImmediate(() => runAudioAnalysis(jobId, req.params.episodeId, req.params.assetId));
  broadcastRealtime({ type: 'episode.audio-analysis.started', episodeId: req.params.episodeId, userId: req.user!.id, payload: { jobId, assetId: req.params.assetId } });
  return res.status(202).json({ success: true, data: { jobId, status: 'queued' } });
});

router.get('/:episodeId/audio/jobs/:jobId', requirePermission('canViewEpisodes') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const job = db.get('SELECT * FROM audio_analysis_jobs WHERE id = ? AND episode_id = ?', [req.params.jobId, req.params.episodeId]) as any;
  if (!job) return res.status(404).json({ success: false, error: 'Analyseauftrag nicht gefunden.' });
  return res.json({ success: true, data: { ...job, result: parseJson(job.result, null) } });
});

export default router;
