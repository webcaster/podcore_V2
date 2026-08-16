import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getDb, DATA_DIR, ASSETS_DIR, BACKUPS_DIR } from '../database';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';

const router: import('express').Router = Router();
router.use(requireAuth as any);

const BACKUP_FORMAT = 'podcore-backup';
const BACKUP_VERSION = '3.0.0';
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const MAX_EMBEDDED_FILE_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_EMBEDDED_BYTES = 60 * 1024 * 1024;

const uploadBackup = multer({
  dest: path.join(DATA_DIR, 'tmp'),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/json' || path.extname(file.originalname).toLowerCase() === '.json') cb(null, true);
    else cb(new Error('Nur JSON-Dateien erlaubt'));
  },
});

// Flüchtige oder sicherheitsrelevante Tabellen werden bewusst nicht exportiert.
const FULL_TABLES = [
  'users', 'roles', 'settings',
  'episodes', 'ideas', 'editorial_plan', 'editorial_notes', 'research_sources',
  'interview_partners', 'interview_questions',
  'assets', 'media_folders',
  'sponsors', 'sponsor_contracts', 'sponsor_offers', 'ad_categories', 'ad_slots', 'ad_placements', 'ad_bookings', 'episode_ad_bookings',
  'seasons', 'season_plan_items', 'season_plan_item_partners',
  'idea_checklists', 'idea_notes', 'idea_uploads', 'idea_interview_partners', 'idea_topic_drafts', 'editorial_text_blocks',
  'episode_templates', 'episode_revisions', 'episode_comments', 'episode_media_links', 'audio_analysis_jobs',
  'podcast_stats', 'chat_messages', 'notifications',
  'tutorials', 'user_tutorial_progress',
];

const LEGACY_TABLE_MAP: Record<string, string> = {
  editorialPlan: 'editorial_plan',
  editorialNotes: 'editorial_notes',
  interviewPartners: 'interview_partners',
  interviewQuestions: 'interview_questions',
  adSlots: 'ad_slots',
  adPlacements: 'ad_placements',
  adCategories: 'ad_categories',
  episodeAdBookings: 'episode_ad_bookings',
  seasonPlanItems: 'season_plan_items',
  seasonPlanItemPartners: 'season_plan_item_partners',
  ideaChecklists: 'idea_checklists',
  ideaNotes: 'idea_notes',
  ideaUploads: 'idea_uploads',
  ideaInterviewPartners: 'idea_interview_partners',
  researchSources: 'research_sources',
  podcastStats: 'podcast_stats',
};

const USER_REFERENCE_COLUMNS = new Set([
  'user_id', 'created_by', 'updated_by', 'uploaded_by', 'changed_by', 'resolved_by', 'deleted_by',
  'assigned_to', 'sender_id', 'recipient_id', 'approved_by', 'approval_requested_by', 'approval_processed_by',
]);

function tableExists(db: any, table: string): boolean {
  return Boolean(db.get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?", [table]));
}

function tableColumns(db: any, table: string): string[] {
  if (!tableExists(db, table)) return [];
  return (db.all(`PRAGMA table_info("${table}")`, []) as any[]).map(column => column.name);
}

function primaryKeyColumns(db: any, table: string, columns: string[]): string[] {
  if (!columns.length) return [];
  const primary = (db.all(`PRAGMA table_info("${table}")`, []) as any[])
    .filter(column => Number(column.pk) > 0)
    .sort((a, b) => Number(a.pk) - Number(b.pk))
    .map(column => column.name);
  return primary.length ? primary : (columns.includes('id') ? ['id'] : []);
}

function safeRelativeDataPath(value: string | null | undefined): string | null {
  if (!value) return null;
  const candidate = path.isAbsolute(value) ? path.resolve(value) : path.resolve(DATA_DIR, value);
  const root = path.resolve(DATA_DIR);
  const relative = path.relative(root, candidate);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return relative.split(path.sep).join('/');
}

function resolveStoredFile(value: string | null | undefined, table: string): string | null {
  if (!value) return null;
  const candidates = [
    value,
    path.resolve(DATA_DIR, value),
    path.join(ASSETS_DIR, value),
    path.join(DATA_DIR, 'idea-uploads', value),
  ];
  const existing = candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  if (existing) return existing;
  if (table === 'assets') {
    const fallback = path.join(ASSETS_DIR, path.basename(value));
    if (fs.existsSync(fallback)) return fallback;
  }
  if (table === 'idea_uploads') {
    const fallback = path.join(DATA_DIR, 'idea-uploads', path.basename(value));
    if (fs.existsSync(fallback)) return fallback;
  }
  return null;
}

function prepareExportRows(db: any, table: string): any[] {
  if (!tableExists(db, table)) return [];
  const columns = tableColumns(db, table);
  return (db.all(`SELECT * FROM "${table}"`, []) as any[]).map(row => {
    const copy = { ...row };
    if (['assets', 'idea_uploads'].includes(table) && typeof copy.filepath === 'string') {
      copy.filepath = safeRelativeDataPath(copy.filepath) || copy.filepath;
    }
    return copy;
  }).map(row => {
    const filtered: Record<string, any> = {};
    columns.forEach(column => { filtered[column] = row[column]; });
    return filtered;
  });
}

function buildFileManifest(tableRows: Record<string, any[]>, includeFiles: boolean) {
  const files: any[] = [];
  let embeddedBytes = 0;
  for (const table of ['assets', 'idea_uploads']) {
    for (const row of tableRows[table] || []) {
      const source = row.filepath;
      const actualPath = resolveStoredFile(source, table);
      const relativePath = safeRelativeDataPath(source) || (actualPath ? safeRelativeDataPath(actualPath) : null);
      const item: any = {
        table,
        rowId: row.id || null,
        field: 'filepath',
        relativePath,
        originalPath: source || null,
        included: false,
        size: actualPath && fs.existsSync(actualPath) ? fs.statSync(actualPath).size : 0,
      };
      if (!actualPath) {
        item.reason = 'Datei am lokalen Speicherort nicht verfügbar';
      } else if (!relativePath) {
        item.reason = 'Datei liegt außerhalb des PodCore-Datenverzeichnisses';
      } else {
        const bytes = Number(item.size || 0);
        item.sha256 = crypto.createHash('sha256').update(fs.readFileSync(actualPath)).digest('hex');
        if (!includeFiles) {
          item.reason = 'Dateiinhalte im Export deaktiviert';
        } else if (bytes > MAX_EMBEDDED_FILE_BYTES) {
          item.reason = `Datei größer als ${MAX_EMBEDDED_FILE_BYTES / 1024 / 1024} MB`; 
        } else if (embeddedBytes + bytes > MAX_TOTAL_EMBEDDED_BYTES) {
          item.reason = `Gesamtlimit von ${MAX_TOTAL_EMBEDDED_BYTES / 1024 / 1024} MB erreicht`;
        } else {
          item.contentBase64 = fs.readFileSync(actualPath).toString('base64');
          item.included = true;
          embeddedBytes += bytes;
        }
      }
      files.push(item);
    }
  }
  return { files, embeddedBytes };
}

function backupDataHash(data: any): string {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

function writeBackupAtomically(filename: string, backup: any): string {
  const target = path.join(BACKUPS_DIR, filename);
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(backup, null, 2), { encoding: 'utf8' });
  fs.renameSync(temporary, target);
  return target;
}

function createFullBackup(db: any, exportedBy: string, includeFiles = true) {
  const tables: Record<string, any[]> = {};
  const tableManifest: Record<string, any> = {};
  for (const table of FULL_TABLES) {
    tables[table] = prepareExportRows(db, table);
    tableManifest[table] = { rows: tables[table].length, columns: tableColumns(db, table) };
  }
  const fileManifest = buildFileManifest(tables, includeFiles);
  const data = { tables, files: fileManifest.files };
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    type: 'full',
    schemaVersion: '2.15.11',
    exportedAt: new Date().toISOString(),
    exportedBy,
    manifest: {
      tables: tableManifest,
      files: fileManifest.files.map(({ contentBase64, ...file }) => file),
      embeddedFileBytes: fileManifest.embeddedBytes,
      excludedTables: ['sessions', 'error_logs'],
    },
    integrity: { algorithm: 'sha256', dataHash: backupDataHash(data) },
    data,
  };
}

function validateBackupIntegrity(importData: any): void {
  const expected = importData?.integrity?.dataHash;
  if (!expected) return; // Ältere Sicherungen bleiben weiterhin importierbar.
  const actual = backupDataHash(importData?.data || {});
  if (actual !== expected) throw new Error('Backup-Prüfsumme stimmt nicht. Die Sicherung wurde verändert oder ist beschädigt.');
}

function normalizeLegacyRow(table: string, source: any): any {
  const row = { ...(source || {}) };
  const jsonColumns = ['hosts', 'guests', 'tags', 'blocks', 'sponsors', 'booked_episodes', 'episodes', 'positions', 'working_titles', 'mentions', 'metadata', 'regions', 'markers', 'comments', 'used_in_episodes', 'episode_refs', 'offer_options', 'custom_metadata'];
  for (const column of jsonColumns) {
    if (Array.isArray(row[column]) || (row[column] && typeof row[column] === 'object' && column !== 'custom_metadata')) row[column] = JSON.stringify(row[column]);
  }
  if (['assets', 'idea_uploads'].includes(table) && typeof row.filepath === 'string' && !path.isAbsolute(row.filepath)) {
    row.filepath = path.resolve(DATA_DIR, row.filepath);
  }
  return row;
}

function getImportTables(importData: any): Record<string, any[]> {
  if (importData?.data?.tables && typeof importData.data.tables === 'object') return importData.data.tables;
  const data = importData?.data || {};
  if (importData.type === 'episodes') return { episodes: Array.isArray(data) ? data : [] };
  if (importData.type === 'editorial') return {
    ideas: data.ideas || [], editorial_plan: data.plan || data.editorialPlan || [], editorial_notes: data.notes || data.editorialNotes || [],
  };
  const result: Record<string, any[]> = {};
  for (const [legacyKey, table] of Object.entries(LEGACY_TABLE_MAP)) if (Array.isArray(data[legacyKey])) result[table] = data[legacyKey];
  for (const table of ['episodes', 'ideas', 'users', 'roles', 'settings', 'sponsors', 'seasons', 'assets', 'media_folders', 'tutorials', 'user_tutorial_progress']) {
    if (Array.isArray(data[table])) result[table] = data[table];
  }
  return result;
}

function applyUserReferenceMap(row: any, userIdMap: Map<string, string>): any {
  const copy = { ...row };
  for (const [column, value] of Object.entries(copy)) {
    if (USER_REFERENCE_COLUMNS.has(column) && typeof value === 'string' && userIdMap.has(value)) copy[column] = userIdMap.get(value);
  }
  return copy;
}

function upsertTableRows(db: any, table: string, rows: any[], mode: string, req: AuthRequest, userIdMap: Map<string, string>) {
  const stats = { imported: 0, updated: 0, skipped: 0, failed: 0 };
  if (!tableExists(db, table) || !Array.isArray(rows)) return stats;
  const columns = tableColumns(db, table);
  const primaryKeys = primaryKeyColumns(db, table, columns);
  if (!columns.length) return stats;

  for (const sourceRow of rows) {
    try {
      let row = applyUserReferenceMap(normalizeLegacyRow(table, sourceRow), userIdMap);
      const existingByUsername = table === 'users' && row.username
        ? db.get('SELECT id FROM users WHERE username = ?', [row.username]) as any
        : null;
      const sourceId = row.id;
      if (table === 'users' && sourceId && existingByUsername?.id && existingByUsername.id !== sourceId) userIdMap.set(sourceId, existingByUsername.id);
      row = applyUserReferenceMap(row, userIdMap);

      const usableColumns = columns.filter(column => Object.prototype.hasOwnProperty.call(row, column));
      if (!usableColumns.length) { stats.failed++; continue; }
      const keyColumns = primaryKeys.length ? primaryKeys : (columns.includes('id') ? ['id'] : []);
      const hasKeys = keyColumns.length > 0 && keyColumns.every(key => row[key] !== undefined && row[key] !== null && row[key] !== '');
      const existing = existingByUsername || (hasKeys ? db.get(`SELECT * FROM "${table}" WHERE ${keyColumns.map(key => `"${key}" = ?`).join(' AND ')}`, keyColumns.map(key => row[key])) : null);

      if (existing) {
        if (mode !== 'overwrite') { stats.skipped++; continue; }
        const updateColumns = usableColumns.filter(column => !keyColumns.includes(column));
        if (!updateColumns.length) { stats.skipped++; continue; }
        db.run(`UPDATE "${table}" SET ${updateColumns.map(column => `"${column}" = ?`).join(', ')} WHERE ${keyColumns.map(key => `"${key}" = ?`).join(' AND ')}`, [...updateColumns.map(column => row[column]), ...keyColumns.map(key => existing[key] ?? row[key])]);
        stats.updated++;
      } else {
        if (columns.includes('id') && (row.id === undefined || row.id === null || row.id === '')) row.id = uuidv4();
        const insertColumns = columns.filter(column => Object.prototype.hasOwnProperty.call(row, column));
        db.run(`INSERT INTO "${table}" (${insertColumns.map(column => `"${column}"`).join(', ')}) VALUES (${insertColumns.map(() => '?').join(', ')})`, insertColumns.map(column => row[column]));
        if (table === 'users' && sourceId && row.id) userIdMap.set(sourceId, row.id);
        stats.imported++;
      }
    } catch (error) {
      stats.failed++;
    }
  }
  return stats;
}

function restoreEmbeddedFiles(importData: any) {
  const files = Array.isArray(importData?.data?.files) ? importData.data.files : [];
  const result = { restored: 0, skipped: 0, failed: 0 };
  for (const file of files) {
    if (!file?.included || !file.contentBase64 || !file.relativePath) { result.skipped++; continue; }
    const relative = safeRelativeDataPath(file.relativePath);
    if (!relative) { result.failed++; continue; }
    try {
      const target = path.join(DATA_DIR, relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const content = Buffer.from(file.contentBase64, 'base64');
      if (file.sha256) {
        const actualHash = crypto.createHash('sha256').update(content).digest('hex');
        if (actualHash !== file.sha256) { result.failed++; continue; }
      }
      const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
      fs.writeFileSync(temporary, content);
      fs.renameSync(temporary, target);
      result.restored++;
    } catch (_) { result.failed++; }
  }
  return result;
}

function countPreview(db: any, importData: any) {
  const tables = getImportTables(importData);
  const preview: Record<string, any> = {};
  for (const [table, rows] of Object.entries(tables)) {
    if (!FULL_TABLES.includes(table) || !Array.isArray(rows) || !tableExists(db, table)) continue;
    const columns = tableColumns(db, table);
    const keys = primaryKeyColumns(db, table, columns);
    let fresh = 0, existing = 0;
    for (const raw of rows) {
      const row = normalizeLegacyRow(table, raw);
      const hasKeys = keys.length > 0 && keys.every(key => row[key] !== undefined && row[key] !== null && row[key] !== '');
      if (!hasKeys) { fresh++; continue; }
      const hit = db.get(`SELECT 1 FROM "${table}" WHERE ${keys.map(key => `"${key}" = ?`).join(' AND ')}`, keys.map(key => row[key]));
      if (hit) existing++; else fresh++;
    }
    preview[table] = { total: rows.length, new: fresh, existing };
  }
  return preview;
}

function removeTempFile(file?: Express.Multer.File) {
  if (file?.path && fs.existsSync(file.path)) {
    try { fs.unlinkSync(file.path); } catch (_) {}
  }
}

function parseUploadedBackup(file: Express.Multer.File) {
  const content = fs.readFileSync(file.path, 'utf-8');
  return JSON.parse(content);
}

// ============================================================
// EXPORT
// ============================================================

router.get('/export/episodes', requirePermission('canExport') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const episodes = prepareExportRows(db, 'episodes');
  return res.json({ version: BACKUP_VERSION, type: 'episodes', exportedAt: new Date().toISOString(), exportedBy: req.user!.username, count: episodes.length, data: episodes });
});

router.get('/export/ideas', requirePermission('canExport') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  return res.json({
    version: BACKUP_VERSION,
    type: 'editorial',
    exportedAt: new Date().toISOString(),
    exportedBy: req.user!.username,
    data: {
      ideas: prepareExportRows(db, 'ideas'),
      plan: prepareExportRows(db, 'editorial_plan'),
      notes: prepareExportRows(db, 'editorial_notes'),
    },
  });
});

router.get('/export/full', requirePermission('canManageSettings') as any, (req: AuthRequest, res: Response) => {
  const includeFiles = req.query.includeFiles !== '0' && req.query.includeFiles !== 'false';
  const backup = createFullBackup(getDb(), req.user!.username, includeFiles);
  const filename = `full-backup-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
  writeBackupAtomically(filename, backup);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="podcore-full-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  return res.json(backup);
});

// ============================================================
// IMPORT – spezielle Legacy-Endpunkte
// ============================================================

router.post('/import/episodes', requirePermission('canManageSettings') as any, uploadBackup.single('file'), (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'Keine Datei hochgeladen' });
  try {
    const importData = parseUploadedBackup(req.file);
    validateBackupIntegrity(importData);
    if (importData.type !== 'episodes' && importData.type !== 'full') return res.status(400).json({ success: false, error: 'Ungültiges Backup-Format' });
    const stats = upsertTableRows(getDb(), 'episodes', getImportTables(importData).episodes || [], 'merge', req, new Map());
    return res.json({ success: true, data: { ...stats, imported: stats.imported, total: (getImportTables(importData).episodes || []).length } });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: `Import fehlgeschlagen: ${error.message}` });
  } finally { removeTempFile(req.file); }
});

router.post('/import/ideas', requirePermission('canManageSettings') as any, uploadBackup.single('file'), (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'Keine Datei hochgeladen' });
  try {
    const importData = parseUploadedBackup(req.file);
    validateBackupIntegrity(importData);
    if (importData.type !== 'editorial' && importData.type !== 'full') return res.status(400).json({ success: false, error: 'Ungültiges Backup-Format' });
    const db = getDb();
    const tables = getImportTables(importData);
    const userMap = new Map<string, string>();
    const stats = {
      ideas: upsertTableRows(db, 'ideas', tables.ideas || [], 'merge', req, userMap),
      editorial_notes: upsertTableRows(db, 'editorial_notes', tables.editorial_notes || [], 'merge', req, userMap),
      editorial_plan: upsertTableRows(db, 'editorial_plan', tables.editorial_plan || [], 'merge', req, userMap),
    };
    const imported = Object.values(stats).reduce((sum, value) => sum + value.imported, 0);
    return res.json({ success: true, data: { imported, stats, total: Object.values(tables).reduce((sum, value) => sum + value.length, 0) } });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: `Import fehlgeschlagen: ${error.message}` });
  } finally { removeTempFile(req.file); }
});

// ============================================================
// IMPORT – Vorschau und vollständiger Import
// ============================================================

router.post('/import/preview', requirePermission('canManageSettings') as any, uploadBackup.single('file'), (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'Keine Datei hochgeladen' });
  try {
    const importData = parseUploadedBackup(req.file);
    validateBackupIntegrity(importData);
    if (!['full', 'episodes', 'editorial'].includes(importData.type)) return res.status(400).json({ success: false, error: `Unbekannter Backup-Typ: "${importData.type}"` });
    const tables = getImportTables(importData);
    const files = Array.isArray(importData?.data?.files) ? importData.data.files : [];
    return res.json({
      success: true,
      data: {
        type: importData.type,
        format: importData.format || 'legacy',
        exportedAt: importData.exportedAt,
        exportedBy: importData.exportedBy,
        version: importData.version,
        schemaVersion: importData.schemaVersion,
        preview: countPreview(getDb(), importData),
        fileSummary: { total: files.length, included: files.filter((file: any) => file.included).length, missing: files.filter((file: any) => !file.included).length },
        tableCount: Object.keys(tables).length,
      },
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: `Vorschau fehlgeschlagen: ${error.message}` });
  } finally { removeTempFile(req.file); }
});

router.post('/import/full', requirePermission('canManageSettings') as any, uploadBackup.single('file'), (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'Keine Datei hochgeladen' });
  const mode = req.body?.mode === 'overwrite' ? 'overwrite' : 'merge';
  const db = getDb();
  let preImportBackup = '';
  try {
    const importData = parseUploadedBackup(req.file);
    validateBackupIntegrity(importData);
    if (!['full', 'episodes', 'editorial'].includes(importData.type)) return res.status(400).json({ success: false, error: `Unbekannter Backup-Typ: "${importData.type}"` });

    const preImport = createFullBackup(db, 'system (pre-import-backup)', false);
    preImportBackup = `pre-import-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    writeBackupAtomically(preImportBackup, preImport);

    const sourceTables = getImportTables(importData);
    const orderedTables = FULL_TABLES.filter(table => Array.isArray(sourceTables[table]));
    const stats: Record<string, any> = {};
    const userIdMap = new Map<string, string>();
    const warnings: string[] = [];
    db.exec('BEGIN');
    for (const table of orderedTables) stats[table] = upsertTableRows(db, table, sourceTables[table], mode, req, userIdMap);
    db.exec('COMMIT');

    const fileRestore = restoreEmbeddedFiles(importData);
    if (fileRestore.skipped > 0) warnings.push(`${fileRestore.skipped} Datei(en) waren im Backup nicht eingebettet und wurden nur als Verweis übernommen.`);
    if (fileRestore.failed > 0) warnings.push(`${fileRestore.failed} eingebettete Datei(en) konnten nicht wiederhergestellt werden.`);

    const summary = Object.values(stats).reduce((sum: any, value: any) => ({
      totalImported: sum.totalImported + value.imported,
      totalUpdated: sum.totalUpdated + value.updated,
      totalSkipped: sum.totalSkipped + value.skipped,
      totalFailed: sum.totalFailed + value.failed,
    }), { totalImported: 0, totalUpdated: 0, totalSkipped: 0, totalFailed: 0 });
    return res.json({ success: true, data: { mode, stats, summary, fileRestore, warnings, preImportBackup, importedTables: orderedTables } });
  } catch (error: any) {
    try { db.exec('ROLLBACK'); } catch (_) {}
    return res.status(400).json({ success: false, error: `Import fehlgeschlagen: ${error.message}`, preImportBackup });
  } finally { removeTempFile(req.file); }
});

// ============================================================
// BACKUP LISTE / LÖSCHEN
// ============================================================

router.get('/list', requirePermission('canManageSettings') as any, (_req: AuthRequest, res: Response) => {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) return res.json({ success: true, data: [] });
    const files = fs.readdirSync(BACKUPS_DIR).filter(file => file.endsWith('.json')).map(filename => {
      const stat = fs.statSync(path.join(BACKUPS_DIR, filename));
      return { filename, size: stat.size, createdAt: stat.birthtime.toISOString() };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return res.json({ success: true, data: files });
  } catch (error: any) { return res.status(500).json({ success: false, error: error.message }); }
});

router.delete('/:filename', requirePermission('canManageSettings') as any, (req: AuthRequest, res: Response) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(BACKUPS_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: 'Backup nicht gefunden' });
  fs.unlinkSync(filePath);
  return res.json({ success: true, message: 'Backup gelöscht' });
});

export default router;
