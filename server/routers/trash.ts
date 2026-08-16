import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ASSETS_DIR, DATA_DIR, getDb } from '../database';
import { permanentlyDeleteIdeaData } from './editorial';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';

const router: import('express').Router = Router();
router.use(requireAuth as any);
router.use(requirePermission('canManageTrash') as any);

const ENTITY_TYPES = new Set(['idea', 'episode', 'sponsor', 'asset']);

function safeJson(value: any, fallback: any = {}) {
  try { return value ? JSON.parse(value) : fallback; } catch (_) { return fallback; }
}

function getEntry(db: any, entryId: string) {
  return db.get(`SELECT * FROM trash_entries
    WHERE id = ? AND restored_at IS NULL AND purged_at IS NULL`, [entryId]) as any;
}

function removeAssetFile(filepath: string | null | undefined) {
  if (!filepath) return;
  const candidates = [filepath, path.join(ASSETS_DIR, path.basename(filepath)), path.resolve(DATA_DIR, filepath)];
  const root = path.resolve(DATA_DIR);
  for (const candidate of candidates) {
    try {
      const resolved = path.resolve(candidate);
      if (!resolved.startsWith(`${root}${path.sep}`) || !fs.existsSync(resolved)) continue;
      fs.unlinkSync(resolved);
      return;
    } catch (_) {}
  }
}

/** Liste der noch wiederherstellbaren Kerninhalte. */
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const entityType = String(req.query.type || '');
  const params: any[] = [];
  let filter = 'WHERE te.restored_at IS NULL AND te.purged_at IS NULL';
  if (entityType && ENTITY_TYPES.has(entityType)) {
    filter += ' AND te.entity_type = ?';
    params.push(entityType);
  }
  const entries = db.all(`SELECT te.*, u.display_name AS deleted_by_name, u.username AS deleted_by_username
    FROM trash_entries te LEFT JOIN users u ON u.id = te.deleted_by
    ${filter} ORDER BY te.deleted_at DESC`, params).map((entry: any) => ({
    id: entry.id,
    entityType: entry.entity_type,
    entityId: entry.entity_id,
    title: entry.title || 'Ohne Titel',
    deletedAt: entry.deleted_at,
    deletedBy: entry.deleted_by,
    deletedByName: entry.deleted_by_name || entry.deleted_by_username || 'Unbekannt',
    retentionUntil: entry.retention_until,
    snapshot: safeJson(entry.snapshot),
  }));
  return res.json({ success: true, data: entries });
});

/** Wiederherstellung inklusive der beim Löschen gelösten Episodenverknüpfungen. */
router.post('/:entryId/restore', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const entry = getEntry(db, req.params.entryId);
  if (!entry) return res.status(404).json({ success: false, error: 'Papierkorb-Eintrag nicht gefunden oder bereits verarbeitet' });
  const snapshot = safeJson(entry.snapshot);
  try {
    db.exec('BEGIN IMMEDIATE');
    if (entry.entity_type === 'idea') {
      db.run('UPDATE ideas SET deleted_at = NULL, deleted_by = NULL, updated_at = datetime(\'now\') WHERE id = ?', [entry.entity_id]);
    } else if (entry.entity_type === 'episode') {
      db.run('UPDATE episodes SET deleted_at = NULL, deleted_by = NULL, updated_at = datetime(\'now\') WHERE id = ?', [entry.entity_id]);
      for (const item of snapshot.seasonPlanItems || []) {
        db.run('UPDATE season_plan_items SET episode_id = ?, status = ?, updated_at = datetime(\'now\') WHERE id = ?', [entry.entity_id, item.status, item.id]);
      }
      for (const idea of snapshot.ideas || []) {
        db.run('UPDATE ideas SET episode_id = ?, updated_at = datetime(\'now\') WHERE id = ?', [entry.entity_id, idea.id]);
      }
    } else if (entry.entity_type === 'sponsor') {
      db.run('UPDATE sponsors SET deleted_at = NULL, deleted_by = NULL, updated_at = datetime(\'now\') WHERE id = ?', [entry.entity_id]);
    } else if (entry.entity_type === 'asset') {
      db.run('UPDATE assets SET deleted_at = NULL, deleted_by = NULL, updated_at = datetime(\'now\') WHERE id = ?', [entry.entity_id]);
    } else {
      throw new Error('Nicht unterstützter Inhaltstyp');
    }
    db.run('UPDATE trash_entries SET restored_at = datetime(\'now\'), restored_by = ? WHERE id = ?', [req.user!.id, entry.id]);
    db.exec('COMMIT');
    return res.json({ success: true, message: `${entry.title || 'Inhalt'} wurde wiederhergestellt.` });
  } catch (error: any) {
    try { db.exec('ROLLBACK'); } catch (_) {}
    return res.status(500).json({ success: false, error: error?.message || 'Wiederherstellung fehlgeschlagen' });
  }
});

/** Finale Bereinigung: nur über den Admin-Papierkorb und nur nach expliziter Bestätigung. */
router.delete('/:entryId', (req: AuthRequest, res: Response) => {
  if (req.body?.confirm !== true) return res.status(400).json({ success: false, error: 'Explizite Löschbestätigung erforderlich' });
  const db = getDb();
  const entry = getEntry(db, req.params.entryId);
  if (!entry) return res.status(404).json({ success: false, error: 'Papierkorb-Eintrag nicht gefunden oder bereits verarbeitet' });
  let assetPath: string | null = null;
  try {
    db.exec('BEGIN IMMEDIATE');
    if (entry.entity_type === 'idea') {
      permanentlyDeleteIdeaData(db, entry.entity_id);
    } else if (entry.entity_type === 'episode') {
      db.run('DELETE FROM episode_comments WHERE episode_id = ?', [entry.entity_id]);
      db.run('DELETE FROM episode_revisions WHERE episode_id = ?', [entry.entity_id]);
      db.run('DELETE FROM episode_media_links WHERE episode_id = ?', [entry.entity_id]);
      db.run('DELETE FROM episode_ad_bookings WHERE episode_id = ?', [entry.entity_id]);
      db.run('DELETE FROM episodes WHERE id = ?', [entry.entity_id]);
    } else if (entry.entity_type === 'sponsor') {
      db.run('DELETE FROM ad_bookings WHERE sponsor_id = ?', [entry.entity_id]);
      db.run('DELETE FROM sponsor_contracts WHERE sponsor_id = ?', [entry.entity_id]);
      db.run('DELETE FROM ad_slots WHERE sponsor_id = ?', [entry.entity_id]);
      db.run('DELETE FROM episode_ad_bookings WHERE sponsor_id = ?', [entry.entity_id]);
      db.run('DELETE FROM sponsors WHERE id = ?', [entry.entity_id]);
    } else if (entry.entity_type === 'asset') {
      const asset = db.get('SELECT filepath FROM assets WHERE id = ?', [entry.entity_id]) as any;
      assetPath = asset?.filepath || null;
      db.run('DELETE FROM episode_media_links WHERE asset_id = ?', [entry.entity_id]);
      db.run('DELETE FROM assets WHERE id = ?', [entry.entity_id]);
    } else {
      throw new Error('Nicht unterstützter Inhaltstyp');
    }
    db.run('UPDATE trash_entries SET purged_at = datetime(\'now\'), purged_by = ? WHERE id = ?', [req.user!.id, entry.id]);
    db.exec('COMMIT');
    if (assetPath) removeAssetFile(assetPath);
    return res.json({ success: true, message: `${entry.title || 'Inhalt'} wurde endgültig entfernt.` });
  } catch (error: any) {
    try { db.exec('ROLLBACK'); } catch (_) {}
    return res.status(500).json({ success: false, error: error?.message || 'Endgültige Bereinigung fehlgeschlagen' });
  }
});

/** Hilfsfunktion für reguläre Löschrouten: erzeugt einen zentralen Papierkorb-Eintrag. */
export function createTrashEntry(db: any, entityType: string, entityId: string, title: string, deletedBy: string, snapshot: any = {}) {
  const existing = db.get(`SELECT id FROM trash_entries WHERE entity_type = ? AND entity_id = ? AND restored_at IS NULL AND purged_at IS NULL`, [entityType, entityId]) as any;
  if (existing) return existing.id;
  const id = uuidv4();
  db.run(`INSERT INTO trash_entries (id, entity_type, entity_id, title, deleted_by, snapshot, retention_until)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+30 days'))`, [id, entityType, entityId, title, deletedBy, JSON.stringify(snapshot || {})]);
  return id;
}

export default router;
