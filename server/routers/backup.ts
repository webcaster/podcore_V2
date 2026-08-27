import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import unzipper from 'unzipper';
import { pipeline } from 'stream/promises';
import { getDb, DATA_DIR, ASSETS_DIR, BACKUPS_DIR } from '../database';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';

const router: import('express').Router = Router();
router.use(requireAuth as any);

const BACKUP_FORMAT = 'podcore-backup';
const BACKUP_VERSION = '4.0.0';
const BACKUP_MANIFEST_FILE = 'podcore-backup.json';
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;
const BACKUP_FILE_FOLDERS = new Set(['assets', 'idea-uploads', 'branding', 'sponsor-logos']);

type AutomaticBackupSource = 'in-app' | 'system';
type AutomaticBackupConfig = {
  enabled: boolean;
  intervalHours: number;
  retentionCount: number;
  includeFiles: boolean;
  lastRunAt: string | null;
  lastStatus: 'never' | 'success' | 'error';
  lastError: string | null;
};

const DEFAULT_AUTOMATIC_BACKUP: AutomaticBackupConfig = {
  enabled: true,
  intervalHours: 24,
  retentionCount: 14,
  includeFiles: true,
  lastRunAt: null,
  lastStatus: 'never',
  lastError: null,
};
let automaticBackupRunning = false;

const uploadBackup = multer({
  dest: path.join(DATA_DIR, 'tmp'),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (file.mimetype === 'application/json' || extension === '.json' || extension === '.zip') cb(null, true);
    else cb(new Error('Nur PodCore-Backupdateien im ZIP- oder JSON-Format sind erlaubt'));
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
  'tutorials', 'user_tutorial_progress', 'trash_entries',
];
const EXCLUDED_BACKUP_TABLES = new Set(['sessions', 'error_logs', 'ad_bookings_new', 'ad_placements_new']);

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
const NATURAL_KEY_COLUMNS: Record<string, string[]> = {
  roles: ['name'],
};

function tableExists(db: any, table: string): boolean {
  return Boolean(db.get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?", [table]));
}

function tableColumns(db: any, table: string): string[] {
  if (!tableExists(db, table)) return [];
  return (db.all(`PRAGMA table_info("${table}")`, []) as any[]).map(column => column.name);
}

function getBackupTables(db: any): string[] {
  const known = FULL_TABLES.filter(table => tableExists(db, table));
  const dynamic = (db.all("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'", []) as any[])
    .map(row => String(row.name))
    .filter(table => !EXCLUDED_BACKUP_TABLES.has(table) && !known.includes(table) && tableExists(db, table));
  return [...known, ...dynamic.sort()];
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

function safeRestorePath(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return null;
  const normalized = path.posix.normalize(value.replace(/\\/g, '/')).replace(/^\/+/, '');
  if (!normalized || normalized === '.' || normalized.startsWith('../') || normalized.includes('/../')) return null;
  return BACKUP_FILE_FOLDERS.has(normalized.split('/')[0]) ? normalized : null;
}

function safeFilename(value: string): string {
  const name = path.basename(value).replace(/[^a-zA-Z0-9._-]/g, '_');
  return name || `file-${uuidv4()}`;
}

async function hashFile(filePath: string): Promise<string> {
  const hash = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
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
    return copy;
  }).map(row => {
    const filtered: Record<string, any> = {};
    columns.forEach(column => { filtered[column] = row[column]; });
    return filtered;
  });
}

async function buildFileManifest(tableRows: Record<string, any[]>, includeFiles: boolean) {
  const files: any[] = [];
  const seen = new Set<string>();
  const addFile = async (sourcePath: string | null, restorePath: string | null, detail: Record<string, any>) => {
    const safePath = safeRestorePath(restorePath);
    const item: any = { ...detail, restorePath: safePath, archivePath: safePath ? `files/${safePath}` : null, included: false, size: 0 };
    if (!sourcePath || !fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
      item.reason = 'Datei am lokalen Speicherort nicht verfügbar';
    } else if (!safePath) {
      item.reason = 'Ungültiger Wiederherstellungspfad';
    } else if (seen.has(safePath)) {
      item.reason = 'Datei bereits über einen anderen Datenverweis enthalten';
    } else {
      item.size = fs.statSync(sourcePath).size;
      item.sha256 = await hashFile(sourcePath);
      if (!includeFiles) item.reason = 'Dateiinhalte im Export deaktiviert';
      else {
        item.included = true;
        item.sourcePath = sourcePath;
        seen.add(safePath);
      }
    }
    files.push(item);
  };

  for (const table of ['assets', 'idea_uploads']) {
    for (const row of tableRows[table] || []) {
      const source = typeof row.filepath === 'string' ? row.filepath : null;
      const actualPath = resolveStoredFile(source, table);
      const folder = table === 'assets' ? 'assets' : 'idea-uploads';
      const restorePath = `${folder}/${String(row.id || uuidv4())}-${safeFilename(source || actualPath || 'file')}`;
      if (actualPath) row.filepath = restorePath;
      await addFile(actualPath, restorePath, { category: table === 'assets' ? 'media' : 'idea-upload', table, rowId: row.id || null, field: 'filepath' });
    }
  }

  for (const source of [
    { category: 'branding', directory: path.join(DATA_DIR, 'branding') },
    { category: 'sponsor-logo', directory: path.join(DATA_DIR, 'sponsor-logos') },
  ]) {
    if (!fs.existsSync(source.directory)) continue;
    for (const entry of fs.readdirSync(source.directory, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const restorePath = `${path.basename(source.directory)}/${safeFilename(entry.name)}`;
      await addFile(path.join(source.directory, entry.name), restorePath, { category: source.category, table: null, rowId: null, field: null });
    }
  }

  const summary = {
    total: files.length,
    included: files.filter(file => file.included).length,
    missing: files.filter(file => !file.included).length,
    totalBytes: files.reduce((sum, file) => sum + Number(file.size || 0), 0),
    includedBytes: files.filter(file => file.included).reduce((sum, file) => sum + Number(file.size || 0), 0),
  };
  return { files, summary };
}

function backupDataHash(data: any): string {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

async function writeBackupArchiveAtomically(filename: string, backup: any, files: any[]): Promise<string> {
  const target = path.join(BACKUPS_DIR, filename);
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(temporary);
    const ZipArchive: any = (archiver as any).ZipArchive;
    if (!ZipArchive) throw new Error('ZIP-Archivbibliothek konnte nicht initialisiert werden');
    const archive = new ZipArchive({ zlib: { level: 9 } });
    const fail = (error: Error) => { try { output.destroy(); } catch (_) {} reject(error); };
    output.on('close', () => resolve());
    output.on('error', fail);
    archive.on('error', fail);
    archive.pipe(output);
    archive.append(JSON.stringify(backup, null, 2), { name: BACKUP_MANIFEST_FILE });
    for (const file of files.filter(file => file.included && file.sourcePath && file.archivePath)) {
      archive.file(file.sourcePath, { name: file.archivePath });
    }
    void archive.finalize();
  });
  fs.renameSync(temporary, target);
  return target;
}

function readAppSettings(db: any): Record<string, any> {
  try {
    const row = db.get("SELECT value FROM settings WHERE key = 'app'") as any;
    return row?.value ? JSON.parse(row.value) : {};
  } catch (_) {
    return {};
  }
}

function normalizeAutomaticBackupConfig(value: any): AutomaticBackupConfig {
  const source = value && typeof value === 'object' ? value : {};
  const intervalCandidate = Number(source.intervalHours);
  const retentionCandidate = Number(source.retentionCount);
  return {
    enabled: source.enabled !== false,
    intervalHours: Number.isFinite(intervalCandidate) ? Math.min(168, Math.max(1, Math.round(intervalCandidate))) : DEFAULT_AUTOMATIC_BACKUP.intervalHours,
    retentionCount: Number.isFinite(retentionCandidate) ? Math.min(90, Math.max(3, Math.round(retentionCandidate))) : DEFAULT_AUTOMATIC_BACKUP.retentionCount,
    includeFiles: source.includeFiles !== false,
    lastRunAt: typeof source.lastRunAt === 'string' ? source.lastRunAt : null,
    lastStatus: source.lastStatus === 'success' || source.lastStatus === 'error' ? source.lastStatus : 'never',
    lastError: typeof source.lastError === 'string' ? source.lastError.slice(0, 500) : null,
  };
}

function saveAutomaticBackupConfig(db: any, config: AutomaticBackupConfig): void {
  const settings = readAppSettings(db);
  const storage = settings.storage && typeof settings.storage === 'object' ? settings.storage : {};
  settings.storage = { ...storage, automaticBackup: config };
  db.run(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, ['app', JSON.stringify(settings)]);
}

function removeExpiredAutomaticBackups(retentionCount: number): number {
  if (!fs.existsSync(BACKUPS_DIR)) return 0;
  const automaticFiles = fs.readdirSync(BACKUPS_DIR)
    .filter(filename => /^(automatic|scheduled)-full-backup-.*\.(zip|json)$/i.test(filename))
    .map(filename => {
      const filePath = path.join(BACKUPS_DIR, filename);
      return { path: filePath, mtime: fs.statSync(filePath).mtimeMs };
    })
    .sort((left, right) => right.mtime - left.mtime);
  let removed = 0;
  automaticFiles.slice(retentionCount).forEach(file => {
    try { fs.unlinkSync(file.path); removed += 1; } catch (_) {}
  });
  return removed;
}

async function createFullBackup(db: any, exportedBy: string, includeFiles = true) {
  const tables: Record<string, any[]> = {};
  const tableManifest: Record<string, any> = {};
  for (const table of getBackupTables(db)) {
    tables[table] = prepareExportRows(db, table);
    tableManifest[table] = { rows: tables[table].length, columns: tableColumns(db, table) };
  }
  const fileManifest = await buildFileManifest(tables, includeFiles);
  const files = fileManifest.files.map(({ sourcePath, ...file }) => file);
  const data = { tables, files };
  const backup = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    type: 'full',
    schemaVersion: '2.15.11',
    exportedAt: new Date().toISOString(),
    exportedBy,
    manifest: {
      tables: tableManifest,
      files,
      fileSummary: fileManifest.summary,
      excludedTables: ['sessions', 'error_logs'],
    },
    integrity: { algorithm: 'sha256', dataHash: backupDataHash(data) },
    data,
  };
  return { backup, archiveFiles: fileManifest.files };
}

/** Erstellt eine atomare lokale Vollsicherung für In-App- und Systemläufe. */
export async function runAutomaticBackup(options: { force?: boolean; source?: AutomaticBackupSource } = {}) {
  if (automaticBackupRunning) return { created: false, reason: 'running' as const };
  const db = getDb();
  const current = normalizeAutomaticBackupConfig(readAppSettings(db)?.storage?.automaticBackup);
  const source = options.source || 'in-app';
  const lastRunMs = current.lastRunAt ? Date.parse(current.lastRunAt) : NaN;
  const due = !Number.isFinite(lastRunMs) || Date.now() - lastRunMs >= current.intervalHours * 60 * 60 * 1000;
  if (!options.force && (!current.enabled || !due)) {
    return { created: false, reason: current.enabled ? 'not-due' as const : 'disabled' as const, config: current };
  }

  automaticBackupRunning = true;
  try {
    const bundle = await createFullBackup(db, source === 'system' ? 'system scheduler' : 'in-app scheduler', current.includeFiles);
    const prefix = source === 'system' ? 'scheduled' : 'automatic';
    const filename = `${prefix}-full-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;
    const filePath = await writeBackupArchiveAtomically(filename, bundle.backup, bundle.archiveFiles);
    const next: AutomaticBackupConfig = { ...current, lastRunAt: new Date().toISOString(), lastStatus: 'success', lastError: null };
    saveAutomaticBackupConfig(db, next);
    const removed = removeExpiredAutomaticBackups(next.retentionCount);
    return { created: true, filename, filePath, removed, config: next, integrity: bundle.backup.integrity, fileSummary: bundle.backup.manifest.fileSummary };
  } catch (error: any) {
    const next: AutomaticBackupConfig = { ...current, lastStatus: 'error', lastError: error?.message || String(error) };
    saveAutomaticBackupConfig(db, next);
    throw error;
  } finally {
    automaticBackupRunning = false;
  }
}

function startAutomaticBackupTimer(): void {
  if (process.env.PODCORE_DISABLE_AUTO_BACKUP === '1') return;
  const run = () => {
    void runAutomaticBackup().catch((error: any) => console.warn('[backup] Automatische Sicherung fehlgeschlagen:', error?.message || error));
  };
  const initial = setTimeout(run, 8_000);
  const interval = setInterval(run, 15 * 60 * 1000);
  initial.unref?.();
  interval.unref?.();
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
    const safePath = safeRestorePath(row.filepath);
    row.filepath = safePath ? path.resolve(DATA_DIR, safePath) : path.resolve(DATA_DIR, row.filepath);
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
  for (const table of [...FULL_TABLES, 'trash_entries']) {
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

function upsertTableRows(db: any, table: string, rows: any[], mode: string, req: AuthRequest, userIdMap: Map<string, string>, throwOnFailure = false) {
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
      const naturalKeys = NATURAL_KEY_COLUMNS[table] || [];
      const hasNaturalKeys = naturalKeys.length > 0 && naturalKeys.every(key => row[key] !== undefined && row[key] !== null && row[key] !== '');
      const existingByNaturalKey = hasNaturalKeys
        ? db.get(`SELECT * FROM "${table}" WHERE ${naturalKeys.map(key => `"${key}" = ?`).join(' AND ')}`, naturalKeys.map(key => row[key])) as any
        : null;
      const sourceId = row.id;
      if (table === 'users' && sourceId && existingByUsername?.id && existingByUsername.id !== sourceId) userIdMap.set(sourceId, existingByUsername.id);
      row = applyUserReferenceMap(row, userIdMap);

      const usableColumns = columns.filter(column => Object.prototype.hasOwnProperty.call(row, column));
      if (!usableColumns.length) {
        stats.failed++;
        if (throwOnFailure) throw new Error(`Keine kompatiblen Spalten für einen Datensatz in ${table}`);
        continue;
      }
      const keyColumns = primaryKeys.length ? primaryKeys : (columns.includes('id') ? ['id'] : []);
      const hasKeys = keyColumns.length > 0 && keyColumns.every(key => row[key] !== undefined && row[key] !== null && row[key] !== '');
      const existing = existingByUsername || existingByNaturalKey || (hasKeys ? db.get(`SELECT * FROM "${table}" WHERE ${keyColumns.map(key => `"${key}" = ?`).join(' AND ')}`, keyColumns.map(key => row[key])) : null);

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
    } catch (error: any) {
      stats.failed++;
      if (throwOnFailure) throw new Error(`Datensatz in ${table} konnte nicht importiert werden: ${error?.message || String(error)}`);
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

type OpenArchive = Awaited<ReturnType<typeof unzipper.Open.file>>;
type ImportedBackup = { data: any; archive: OpenArchive | null; isArchive: boolean };

async function readUploadedBackup(file: Express.Multer.File): Promise<ImportedBackup> {
  const isArchive = path.extname(file.originalname).toLowerCase() === '.zip';
  if (!isArchive) return { data: JSON.parse(fs.readFileSync(file.path, 'utf-8')), archive: null, isArchive: false };
  const archive = await unzipper.Open.file(file.path);
  const manifest = archive.files.find(entry => entry.path === BACKUP_MANIFEST_FILE && entry.type === 'File');
  if (!manifest) throw new Error(`ZIP-Backup enthält keine ${BACKUP_MANIFEST_FILE}`);
  let data: any;
  try { data = JSON.parse((await manifest.buffer()).toString('utf-8')); }
  catch (_) { throw new Error('Das ZIP-Backup enthält ein ungültiges Datenmanifest'); }
  return { data, archive, isArchive: true };
}

function archiveEntriesByPath(archive: OpenArchive | null): Map<string, any> {
  return new Map((archive?.files || []).filter(entry => entry.type === 'File').map(entry => [entry.path, entry]));
}

function validateFileManifest(importData: any, archive: OpenArchive | null, isArchive: boolean) {
  const files = Array.isArray(importData?.data?.files) ? importData.data.files : [];
  const result = { total: files.length, included: 0, missing: 0, invalid: 0, requiredArchiveFiles: 0 };
  const entries = archiveEntriesByPath(archive);
  for (const file of files) {
    if (!file?.included) { result.missing++; continue; }
    result.included++;
    const restorePath = safeRestorePath(file.restorePath || file.relativePath);
    const archivePath = typeof file.archivePath === 'string' ? file.archivePath : restorePath ? `files/${restorePath}` : '';
    if (!isArchive || !restorePath || !archivePath || !entries.has(archivePath)) result.invalid++;
    else result.requiredArchiveFiles++;
  }
  return result;
}

async function stageArchiveFiles(importData: any, archive: OpenArchive | null, isArchive: boolean): Promise<{
  restored: number; skipped: number; failed: number; verified: number; total: number; staged: Array<{ tempPath: string; target: string }>; legacy: boolean;
}> {
  const manifest = Array.isArray(importData?.data?.files) ? importData.data.files : [];
  const result = { restored: 0, skipped: 0, failed: 0, verified: 0, total: manifest.length, staged: [] as Array<{ tempPath: string; target: string }>, legacy: false };
  if (!isArchive) return { ...result, legacy: true };
  const entries = archiveEntriesByPath(archive);
  const stagingDir = path.join(DATA_DIR, 'tmp', `restore-${uuidv4()}`);
  fs.mkdirSync(stagingDir, { recursive: true });
  try {
    for (const file of manifest) {
      if (!file?.included) { result.skipped++; continue; }
      const restorePath = safeRestorePath(file.restorePath);
      const archivePath = typeof file.archivePath === 'string' ? file.archivePath : restorePath ? `files/${restorePath}` : '';
      const entry = archivePath ? entries.get(archivePath) : null;
      if (!restorePath || !entry) { result.failed++; continue; }
      const tempPath = path.join(stagingDir, restorePath);
      fs.mkdirSync(path.dirname(tempPath), { recursive: true });
      await pipeline(entry.stream(), fs.createWriteStream(tempPath));
      if (file.sha256 && await hashFile(tempPath) !== file.sha256) {
        try { fs.unlinkSync(tempPath); } catch (_) {}
        result.failed++;
        continue;
      }
      result.verified++;
      result.staged.push({ tempPath, target: path.join(DATA_DIR, restorePath) });
    }
    if (result.failed) throw new Error(`${result.failed} Datei(en) im ZIP-Backup fehlen oder stimmen nicht mit der Prüfsumme überein`);
    return result;
  } catch (error) {
    try { fs.rmSync(stagingDir, { recursive: true, force: true }); } catch (_) {}
    throw error;
  }
}

function promoteStagedFiles(staged: Array<{ tempPath: string; target: string }>) {
  const moves: Array<{ target: string; rollback: string | null }> = [];
  try {
    for (const item of staged) {
      fs.mkdirSync(path.dirname(item.target), { recursive: true });
      const rollback = fs.existsSync(item.target) ? `${item.target}.pre-import-${process.pid}-${Date.now()}` : null;
      if (rollback) fs.renameSync(item.target, rollback);
      fs.renameSync(item.tempPath, item.target);
      moves.push({ target: item.target, rollback });
    }
    return {
      commit: () => moves.forEach(move => { if (move.rollback) try { fs.unlinkSync(move.rollback); } catch (_) {} }),
      rollback: () => moves.reverse().forEach(move => {
        try { if (fs.existsSync(move.target)) fs.unlinkSync(move.target); } catch (_) {}
        try { if (move.rollback && fs.existsSync(move.rollback)) fs.renameSync(move.rollback, move.target); } catch (_) {}
      }),
    };
  } catch (error) {
    moves.reverse().forEach(move => {
      try { if (fs.existsSync(move.target)) fs.unlinkSync(move.target); } catch (_) {}
      try { if (move.rollback && fs.existsSync(move.rollback)) fs.renameSync(move.rollback, move.target); } catch (_) {}
    });
    throw error;
  }
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

router.get('/export/full', requirePermission('canManageSettings') as any, async (req: AuthRequest, res: Response) => {
  const includeFiles = req.query.includeFiles !== '0' && req.query.includeFiles !== 'false';
  try {
    const bundle = await createFullBackup(getDb(), req.user!.username, includeFiles);
    const filename = `full-backup-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.zip`;
    const filePath = await writeBackupArchiveAtomically(filename, bundle.backup, bundle.archiveFiles);
    return res.download(filePath, `podcore-full-backup-${new Date().toISOString().slice(0, 10)}.zip`);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: `Vollbackup konnte nicht erstellt werden: ${error?.message || String(error)}` });
  }
});

// ============================================================
// AUTOMATISCHE SICHERUNGEN
// ============================================================

router.get('/automation/status', requirePermission('canManageSettings') as any, (_req: AuthRequest, res: Response) => {
  const db = getDb();
  const config = normalizeAutomaticBackupConfig(readAppSettings(db)?.storage?.automaticBackup);
  const savedAutomaticBackups = fs.existsSync(BACKUPS_DIR)
    ? fs.readdirSync(BACKUPS_DIR).filter(filename => /^(automatic|scheduled)-full-backup-.*\.(zip|json)$/i.test(filename)).length
    : 0;
  return res.json({ success: true, data: { config, savedAutomaticBackups, backupsPath: BACKUPS_DIR } });
});

router.post('/automation/run', requirePermission('canManageSettings') as any, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await runAutomaticBackup({ force: true, source: 'in-app' });
    return res.json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: `Automatische Sicherung fehlgeschlagen: ${error?.message || String(error)}` });
  }
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

router.post('/import/preview', requirePermission('canManageSettings') as any, uploadBackup.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'Keine Datei hochgeladen' });
  try {
    const uploaded = await readUploadedBackup(req.file);
    const importData = uploaded.data;
    validateBackupIntegrity(importData);
    if (!['full', 'episodes', 'editorial'].includes(importData.type)) return res.status(400).json({ success: false, error: `Unbekannter Backup-Typ: "${importData.type}"` });
    const tables = getImportTables(importData);
    const fileSummary = validateFileManifest(importData, uploaded.archive, uploaded.isArchive);
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
        fileSummary,
        archive: uploaded.isArchive,
        tableCount: Object.keys(tables).length,
      },
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: `Vorschau fehlgeschlagen: ${error.message}` });
  } finally { removeTempFile(req.file); }
});

router.post('/import/full', requirePermission('canManageSettings') as any, uploadBackup.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'Keine Datei hochgeladen' });
  const mode = req.body?.mode === 'overwrite' ? 'overwrite' : 'merge';
  const db = getDb();
  let preImportBackup = '';
  let filePromotion: { commit: () => void; rollback: () => void } | null = null;
  try {
    const uploaded = await readUploadedBackup(req.file);
    const importData = uploaded.data;
    validateBackupIntegrity(importData);
    if (!['full', 'episodes', 'editorial'].includes(importData.type)) return res.status(400).json({ success: false, error: `Unbekannter Backup-Typ: "${importData.type}"` });
    const fileValidation = validateFileManifest(importData, uploaded.archive, uploaded.isArchive);
    if (importData.type === 'full' && Number(importData.version?.split?.('.')[0] || 0) >= 4 && fileValidation.invalid > 0) {
      return res.status(400).json({ success: false, error: `ZIP-Backup ist unvollständig oder beschädigt: ${fileValidation.invalid} erforderliche Datei(en) fehlen.` });
    }

    const preImport = await createFullBackup(db, 'system (pre-import-backup)', true);
    preImportBackup = `pre-import-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.zip`;
    await writeBackupArchiveAtomically(preImportBackup, preImport.backup, preImport.archiveFiles);

    const sourceTables = getImportTables(importData);
    const orderedTables = getBackupTables(db).filter(table => Array.isArray(sourceTables[table]));
    const stats: Record<string, any> = {};
    const userIdMap = new Map<string, string>();
    const warnings: string[] = [];
    const stagedFiles = await stageArchiveFiles(importData, uploaded.archive, uploaded.isArchive);
    if (stagedFiles.legacy) warnings.push('Älteres JSON-Backup erkannt. Es enthält keine vollständige ZIP-Dateiprüfung; eingebettete Altdateien werden nach dem Datenimport wiederhergestellt.');
    if (fileValidation.missing > 0) warnings.push(`${fileValidation.missing} Datei(en) wurden bewusst nicht im Backup eingebettet und können nicht wiederhergestellt werden.`);
    db.exec('BEGIN');
    filePromotion = stagedFiles.legacy ? null : promoteStagedFiles(stagedFiles.staged);
    for (const table of orderedTables) stats[table] = upsertTableRows(db, table, sourceTables[table], mode, req, userIdMap, true);
    db.exec('COMMIT');
    filePromotion?.commit();

    const fileRestore = stagedFiles.legacy
      ? restoreEmbeddedFiles(importData)
      : { restored: stagedFiles.staged.length, skipped: stagedFiles.skipped, failed: 0, verified: stagedFiles.verified, total: stagedFiles.total };
    if (fileRestore.skipped > 0) warnings.push(`${fileRestore.skipped} Datei(en) waren im Backup nicht eingebettet und wurden nur als Verweis übernommen.`);
    if (fileRestore.failed > 0) warnings.push(`${fileRestore.failed} eingebettete Datei(en) konnten nicht wiederhergestellt werden.`);

    const summary = Object.values(stats).reduce((sum: any, value: any) => ({
      totalImported: sum.totalImported + value.imported,
      totalUpdated: sum.totalUpdated + value.updated,
      totalSkipped: sum.totalSkipped + value.skipped,
      totalFailed: sum.totalFailed + value.failed,
    }), { totalImported: 0, totalUpdated: 0, totalSkipped: 0, totalFailed: 0 });
    return res.json({ success: true, data: { mode, stats, summary, fileRestore, fileValidation, warnings, preImportBackup, importedTables: orderedTables } });
  } catch (error: any) {
    try { filePromotion?.rollback(); } catch (_) {}
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
    const files = fs.readdirSync(BACKUPS_DIR).filter(file => /\.(zip|json)$/i.test(file)).map(filename => {
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

startAutomaticBackupTimer();

export default router;
