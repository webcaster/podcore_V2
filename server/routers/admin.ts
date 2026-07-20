import { Router, Response, Request } from 'express';
import multer from 'multer';
import AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as path from 'path';
import { execFileSync, spawn } from 'child_process';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { DATA_DIR as DATABASE_DATA_DIR, getDb, getDefaultPermissions } from '../database';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';
import {
  UpdateBackupManifest,
  applyStagedApplication,
  extractUpdateArchive,
  findPodCoreRoot,
  inspectUpdateArchive,
  readPackageVersion,
  restoreUpdateBackup,
  validateStagedApplication,
} from '../services/updateService';

const router: import("express").Router = Router();

// ============================================================
// PUBLIC ROUTES (kein Auth nötig)
// ============================================================

// GET /api/admin/settings/public — Podcast-Profil und technische Defaults für alle Nutzer
router.get('/settings/public', (req: Request, res: Response) => {
  const db = getDb();
  const row = db.get('SELECT value FROM settings WHERE key = ?', ['app']) as any;
  const settings = row ? JSON.parse(row.value) : {};
  // Feature-Flags: Defaults (alle aktiv wenn nicht konfiguriert)
  const defaultFeatures = {
    sponsoring: true,
    editorial: true,
    statistics: true,
    chat: true,
    podigee: true,
    mediaLibrary: true,
    seasons: true,
    wiki: true,
    branding: true,
  };
  const features = { ...defaultFeatures, ...(settings.features || {}) };

  return res.json({
    success: true,
    data: {
      podcast: settings.podcast || {},
      technicalDefaults: settings.technicalDefaults || {},
      general: {
        podcastName: settings.general?.podcastName || settings.podcast?.name || 'PodCore',
        language: settings.general?.language || 'de',
        timezone: settings.general?.timezone || 'Europe/Berlin',
      },
      branding: settings.branding || {},
      features,
    },
  });
});

// All routes below require authentication
router.use(requireAuth as any);

function parseUser(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    email: row.email,
    role: row.role,
    permissions: JSON.parse(row.permissions || '{}'),
    isActive: row.is_active === 1,
    avatarColor: row.avatar_color,
    lastLogin: row.last_login,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================
// USERS
// ============================================================

router.get('/users', requirePermission('canManageUsers') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const users = db.all('SELECT * FROM users ORDER BY created_at ASC', []).map(parseUser);
  return res.json({ success: true, data: users });
});

router.get('/users/:id', requirePermission('canManageUsers') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ success: false, error: 'Benutzer nicht gefunden' });
  return res.json({ success: true, data: parseUser(user) });
});

router.post('/users', requirePermission('canManageUsers') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { username, displayName, email, password, role = 'redakteur', permissions, avatarColor } = req.body;

  if (!username || !displayName || !password) {
    return res.status(400).json({ success: false, error: 'Benutzername, Anzeigename und Passwort erforderlich' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, error: 'Passwort muss mindestens 6 Zeichen haben' });
  }

  const existing = db.get('SELECT id FROM users WHERE username = ?', [username]);
  if (existing) return res.status(409).json({ success: false, error: 'Benutzername bereits vergeben' });

  const id = uuidv4();
  const passwordHash = bcrypt.hashSync(password, 10);
  const userPermissions = permissions || getDefaultPermissions(role);
  const colors = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#0891b2'];
  const color = avatarColor || colors[Math.floor(Math.random() * colors.length)];

  db.run('INSERT INTO users (id, username, display_name, email, password_hash, role, permissions, is_active, avatar_color) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)',
    [id, username, displayName, email || null, passwordHash, role, JSON.stringify(userPermissions), color]);

  const user = db.get('SELECT * FROM users WHERE id = ?', [id]);
  return res.status(201).json({ success: true, data: parseUser(user) });
});

router.put('/users/:id', requirePermission('canManageUsers') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { displayName, email, role, permissions, isActive, avatarColor } = req.body;

  // If role is being changed and no explicit permissions are provided,
  // automatically apply the default permissions for the new role
  let resolvedPermissions: string | null = null;
  if (permissions) {
    // Explicit permissions provided — use them directly
    resolvedPermissions = JSON.stringify(permissions);
  } else if (role) {
    // Role changed without explicit permissions — apply role defaults
    const defaultPerms = getDefaultPermissions(role);
    resolvedPermissions = JSON.stringify(defaultPerms);
  }

  db.run(`UPDATE users SET display_name = COALESCE(?, display_name), email = ?, role = COALESCE(?, role), permissions = COALESCE(?, permissions), is_active = COALESCE(?, is_active), avatar_color = COALESCE(?, avatar_color), updated_at = datetime('now') WHERE id = ?`,
    [displayName ?? null, email ?? null, role ?? null, resolvedPermissions, isActive !== undefined ? (isActive ? 1 : 0) : null, avatarColor ?? null, req.params.id]);

  const user = db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ success: false, error: 'Benutzer nicht gefunden' });
  return res.json({ success: true, data: parseUser(user) });
});

router.post('/users/:id/reset-password', requirePermission('canManageUsers') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, error: 'Passwort muss mindestens 6 Zeichen haben' });
  }

  const passwordHash = bcrypt.hashSync(newPassword, 10);
  db.run(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`, [passwordHash, req.params.id]);
  db.run('DELETE FROM sessions WHERE user_id = ?', [req.params.id]);

  return res.json({ success: true, message: 'Passwort zurückgesetzt' });
});

// GET /users/:id/linked-data — Verknüpfte Daten eines Benutzers abfragen
router.get('/users/:id/linked-data', requirePermission('canManageUsers') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const userId = req.params.id;
  const episodeCount = (db.get('SELECT COUNT(*) as c FROM episodes WHERE created_by = ?', [userId]) as any)?.c || 0;
  const ideaCount = (db.get('SELECT COUNT(*) as c FROM ideas WHERE created_by = ?', [userId]) as any)?.c || 0;
  const sponsorCount = (db.get('SELECT COUNT(*) as c FROM sponsors WHERE created_by = ?', [userId]) as any)?.c || 0;
  const assetCount = (db.get('SELECT COUNT(*) as c FROM assets WHERE uploaded_by = ?', [userId]) as any)?.c || 0;
  const noteCount = (db.get('SELECT COUNT(*) as c FROM editorial_notes WHERE created_by = ?', [userId]) as any)?.c || 0;
  const total = episodeCount + ideaCount + sponsorCount + assetCount + noteCount;
  return res.json({ success: true, data: { episodeCount, ideaCount, sponsorCount, assetCount, noteCount, total } });
});

router.delete('/users/:id', requirePermission('canManageUsers') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const userId = req.params.id;
  // transferToUserId: ID eines anderen Benutzers ODER 'global' für anonyme Übertragung
  const transferToUserId: string | undefined = (req.query.transferTo as string) || undefined;

  if (userId === req.user!.id) {
    return res.status(400).json({ success: false, error: 'Sie können sich nicht selbst löschen' });
  }

  // Prüfen ob der Benutzer noch Daten angelegt hat
  const episodeCount = (db.get('SELECT COUNT(*) as c FROM episodes WHERE created_by = ?', [userId]) as any)?.c || 0;
  const ideaCount = (db.get('SELECT COUNT(*) as c FROM ideas WHERE created_by = ?', [userId]) as any)?.c || 0;
  const sponsorCount = (db.get('SELECT COUNT(*) as c FROM sponsors WHERE created_by = ?', [userId]) as any)?.c || 0;
  const assetCount = (db.get('SELECT COUNT(*) as c FROM assets WHERE uploaded_by = ?', [userId]) as any)?.c || 0;
  const noteCount = (db.get('SELECT COUNT(*) as c FROM editorial_notes WHERE created_by = ?', [userId]) as any)?.c || 0;

  const totalLinked = episodeCount + ideaCount + sponsorCount + assetCount + noteCount;

  if (totalLinked > 0 && !transferToUserId) {
    const details: string[] = [];
    if (episodeCount > 0) details.push(`${episodeCount} Episode(n)`);
    if (ideaCount > 0) details.push(`${ideaCount} Idee(n)`);
    if (sponsorCount > 0) details.push(`${sponsorCount} Sponsor(en)`);
    if (assetCount > 0) details.push(`${assetCount} Media-Asset(s)`);
    if (noteCount > 0) details.push(`${noteCount} Notiz(en)`);
    return res.status(409).json({
      success: false,
      error: `Benutzer hat noch verknüpfte Inhalte: ${details.join(', ')}. Bitte Übergabe-Option wählen.`,
      linkedData: { episodeCount, ideaCount, sponsorCount, assetCount, noteCount },
      requiresTransfer: true,
    });
  }

  if (totalLinked > 0 && transferToUserId) {
    // Ziel-Benutzer validieren (außer 'global')
    if (transferToUserId !== 'global') {
      const targetUser = db.get('SELECT id FROM users WHERE id = ?', [transferToUserId]) as any;
      if (!targetUser) {
        return res.status(400).json({ success: false, error: 'Ziel-Benutzer nicht gefunden' });
      }
      if (transferToUserId === userId) {
        return res.status(400).json({ success: false, error: 'Ziel-Benutzer darf nicht der zu löschende Benutzer sein' });
      }
    }

    // Bestimme die tatsächliche Ziel-ID
    // Bei 'global': Suche nach einem System-Benutzer oder nutze den aktuellen Admin als Fallback
    let targetId = transferToUserId;
    if (transferToUserId === 'global') {
      // Suche nach einem 'system' oder 'admin' Benutzer
      const systemUser = db.get("SELECT id FROM users WHERE username = 'system' OR role = 'admin' ORDER BY created_at ASC LIMIT 1") as any;
      targetId = systemUser?.id || req.user!.id;
    }

    // Inhalte übertragen
    if (episodeCount > 0) {
      db.run('UPDATE episodes SET created_by = ? WHERE created_by = ?', [targetId, userId]);
    }
    if (ideaCount > 0) {
      db.run('UPDATE ideas SET created_by = ? WHERE created_by = ?', [targetId, userId]);
    }
    if (sponsorCount > 0) {
      db.run('UPDATE sponsors SET created_by = ? WHERE created_by = ?', [targetId, userId]);
    }
    if (assetCount > 0) {
      db.run('UPDATE assets SET uploaded_by = ? WHERE uploaded_by = ?', [targetId, userId]);
    }
    if (noteCount > 0) {
      db.run('UPDATE editorial_notes SET created_by = ? WHERE created_by = ?', [targetId, userId]);
    }
    // Weitere Tabellen mit created_by / uploaded_by
    try { db.run('UPDATE research_sources SET created_by = ? WHERE created_by = ?', [targetId, userId]); } catch (_) {}
    try { db.run('UPDATE seasons SET created_by = ? WHERE created_by = ?', [targetId, userId]); } catch (_) {}
    try { db.run('UPDATE idea_notes SET created_by = ? WHERE created_by = ?', [targetId, userId]); } catch (_) {}
    try { db.run('UPDATE idea_uploads SET uploaded_by = ? WHERE uploaded_by = ?', [targetId, userId]); } catch (_) {}
    // Approval-Felder auf NULL setzen (kein Benutzer mehr vorhanden)
    try { db.run('UPDATE episodes SET approved_by = NULL WHERE approved_by = ?', [userId]); } catch (_) {}
    try { db.run('UPDATE episodes SET approval_requested_by = NULL WHERE approval_requested_by = ?', [userId]); } catch (_) {}
    // Chat-Nachrichten: Sender auf Ziel-Benutzer übertragen
    try { db.run('UPDATE chat_messages SET sender_id = ? WHERE sender_id = ?', [targetId, userId]); } catch (_) {}
  }

  db.run('DELETE FROM sessions WHERE user_id = ?', [userId]);
  db.run('DELETE FROM users WHERE id = ?', [userId]);

  const transferredMsg = totalLinked > 0 && transferToUserId
    ? ` ${totalLinked} Inhalt(e) wurden übertragen.`
    : '';
  return res.json({ success: true, message: `Benutzer gelöscht.${transferredMsg}` });
});

router.get('/roles/:role/permissions', requirePermission('canManageUsers') as any, (req: AuthRequest, res: Response) => {
  const permissions = getDefaultPermissions(req.params.role);
  return res.json({ success: true, data: permissions });
});

// POST /api/admin/roles/reset-permissions — Alle System-Rollen auf Standard-Berechtigungen zurücksetzen
router.post('/roles/reset-permissions', requirePermission('canManageUsers') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const systemRoles = ['admin', 'redakteur', 'moderator', 'produktion', 'leser'];
  let updated = 0;
  for (const roleName of systemRoles) {
    const perms = getDefaultPermissions(roleName);
    const result = db.run(
      `UPDATE roles SET permissions = ?, updated_at = datetime('now') WHERE name = ?`,
      [JSON.stringify(perms), roleName]
    ) as any;
    if (result?.changes > 0) updated++;
  }
  return res.json({ success: true, message: `${updated} System-Rollen wurden auf Standard-Berechtigungen zurückgesetzt`, updated });
});

// ============================================================
// ROLES MANAGEMENT
// ============================================================

// GET all roles
router.get('/roles', requirePermission('canManageUsers') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const rows = db.all('SELECT * FROM roles ORDER BY is_system DESC, label ASC', []);
  const roles = rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    label: r.label,
    description: r.description,
    color: r.color,
    permissions: JSON.parse(r.permissions || '{}'),
    isSystem: r.is_system === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
  return res.json({ success: true, data: roles });
});

// PUT update a role's label, description, color and permissions
router.put('/roles/:id', requirePermission('canManageUsers') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { label, description, color, permissions } = req.body;

  const existing = db.get('SELECT * FROM roles WHERE id = ?', [req.params.id]) as any;
  if (!existing) return res.status(404).json({ success: false, error: 'Rolle nicht gefunden' });

  db.run(
    `UPDATE roles SET
      label = COALESCE(?, label),
      description = COALESCE(?, description),
      color = COALESCE(?, color),
      permissions = COALESCE(?, permissions),
      updated_at = datetime('now')
    WHERE id = ?`,
    [
      label ?? null,
      description ?? null,
      color ?? null,
      permissions ? JSON.stringify(permissions) : null,
      req.params.id,
    ]
  );

  // Propagate new permissions to all users that have this role assigned
  // (only updates users whose permissions were not individually customized,
  //  i.e. their permissions match the old role permissions exactly)
  if (permissions) {
    const roleName = existing.name;
    const usersWithRole = db.all(
      `SELECT id, permissions FROM users WHERE role = ? AND is_active = 1`,
      [roleName]
    ) as any[];

    const oldRolePerms = JSON.parse(existing.permissions || '{}');
    const newPermsStr = JSON.stringify(permissions);

    for (const u of usersWithRole) {
      const userPerms = JSON.parse(u.permissions || '{}');
      // Check if user's permissions match the old role defaults (not individually customized)
      const userPermsStr = JSON.stringify(userPerms);
      const oldRolePermsStr = JSON.stringify(oldRolePerms);
      if (userPermsStr === oldRolePermsStr || userPermsStr === '{}') {
        // User has default role permissions — propagate the new role permissions
        db.run(
          `UPDATE users SET permissions = ?, updated_at = datetime('now') WHERE id = ?`,
          [newPermsStr, u.id]
        );
      }
    }
  }

  const updated = db.get('SELECT * FROM roles WHERE id = ?', [req.params.id]) as any;
  return res.json({
    success: true,
    data: {
      id: updated.id,
      name: updated.name,
      label: updated.label,
      description: updated.description,
      color: updated.color,
      permissions: JSON.parse(updated.permissions || '{}'),
      isSystem: updated.is_system === 1,
    },
  });
});

// POST create a custom role
router.post('/roles', requirePermission('canManageUsers') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { name, label, description, color = '#7c3aed', permissions = {} } = req.body;

  if (!name || !label) {
    return res.status(400).json({ success: false, error: 'Name und Bezeichnung erforderlich' });
  }

  const existing = db.get('SELECT id FROM roles WHERE name = ?', [name]);
  if (existing) return res.status(409).json({ success: false, error: 'Rollenname bereits vergeben' });

  const id = uuidv4();
  db.run(
    'INSERT INTO roles (id, name, label, description, color, permissions, is_system) VALUES (?, ?, ?, ?, ?, ?, 0)',
    [id, name, label, description || null, color, JSON.stringify(permissions)]
  );

  const created = db.get('SELECT * FROM roles WHERE id = ?', [id]) as any;
  return res.status(201).json({
    success: true,
    data: {
      id: created.id,
      name: created.name,
      label: created.label,
      description: created.description,
      color: created.color,
      permissions: JSON.parse(created.permissions || '{}'),
      isSystem: false,
    },
  });
});

// DELETE a custom role (system roles cannot be deleted)
router.delete('/roles/:id', requirePermission('canManageUsers') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const role = db.get('SELECT * FROM roles WHERE id = ?', [req.params.id]) as any;

  if (!role) return res.status(404).json({ success: false, error: 'Rolle nicht gefunden' });
  if (role.is_system === 1) return res.status(403).json({ success: false, error: 'System-Rollen können nicht gelöscht werden' });

  db.run('DELETE FROM roles WHERE id = ?', [req.params.id]);
  return res.json({ success: true, message: 'Rolle gelöscht' });
});

// ============================================================
// ERROR LOGS
// ============================================================

router.get('/logs', requirePermission('canViewErrorLogs') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { level, category, from, to, page = '1', pageSize = '50' } = req.query;

  let query = 'SELECT * FROM error_logs WHERE 1=1';
  let countQuery = 'SELECT COUNT(*) as count FROM error_logs WHERE 1=1';
  const params: any[] = [];
  const countParams: any[] = [];

  if (level) { query += ' AND level = ?'; countQuery += ' AND level = ?'; params.push(level); countParams.push(level); }
  if (category) { query += ' AND category = ?'; countQuery += ' AND category = ?'; params.push(category); countParams.push(category); }
  if (from) { query += ' AND timestamp >= ?'; countQuery += ' AND timestamp >= ?'; params.push(from); countParams.push(from); }
  if (to) { query += ' AND timestamp <= ?'; countQuery += ' AND timestamp <= ?'; params.push(to); countParams.push(to); }

  const countRow = db.get(countQuery, countParams) as any;
  const total = countRow?.count || 0;

  const pageNum = parseInt(page as string);
  const pageSizeNum = parseInt(pageSize as string);
  query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
  params.push(pageSizeNum, (pageNum - 1) * pageSizeNum);

  const logs = db.all(query, params).map((r: any) => ({
    ...r, userId: r.user_id, userAgent: r.user_agent,
  }));

  return res.json({ success: true, data: { items: logs, total, page: pageNum, pageSize: pageSizeNum, totalPages: Math.ceil(total / pageSizeNum) } });
});

router.post('/logs', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { level = 'error', category = 'frontend', message, details, stack, url } = req.body;

  if (!message) return res.status(400).json({ success: false, error: 'Nachricht erforderlich' });

  const id = uuidv4();
  db.run('INSERT INTO error_logs (id, level, category, message, details, stack, user_id, user_agent, url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, level, category, message, details || null, stack || null, req.user?.id || null, req.headers['user-agent'] || null, url || null]);

  return res.status(201).json({ success: true, data: { id } });
});

router.delete('/logs', requirePermission('canViewErrorLogs') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { before } = req.query;

  if (before) {
    db.run('DELETE FROM error_logs WHERE timestamp < ?', [before]);
  } else {
    db.run('DELETE FROM error_logs', []);
  }

  return res.json({ success: true, message: 'Logs gelöscht' });
});

// ============================================================
// SETTINGS
// ============================================================

router.get('/settings', requirePermission('canManageSettings') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const row = db.get('SELECT value FROM settings WHERE key = ?', ['app']) as any;
  const settings = row ? JSON.parse(row.value) : {};
  return res.json({ success: true, data: settings });
});

router.put('/settings', requirePermission('canManageSettings') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const current = db.get('SELECT value FROM settings WHERE key = ?', ['app']) as any;
  const currentSettings = current ? JSON.parse(current.value) : {};
  const newSettings = { ...currentSettings, ...req.body };

  // node-sqlite3-wasm supports ON CONFLICT
  db.run(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    ['app', JSON.stringify(newSettings)]);

  return res.json({ success: true, data: newSettings });
});

// ============================================================
// SYSTEM INFO
// ============================================================

function getApplicationRoot(): string {
  return findPodCoreRoot(__dirname);
}

// Beim Prozessstart erfassen: Paketdateien werden während eines Updates bereits vor
// dem Neustart ersetzt und dürfen daher nicht als Nachweis der laufenden Version dienen.
const RUNNING_SERVER_VERSION = readPackageVersion(path.join(getApplicationRoot(), 'server', 'package.json'));

router.get('/system', requirePermission('canManageSettings') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const appRoot = getApplicationRoot();
  const stats = {
    episodes: (db.get('SELECT COUNT(*) as count FROM episodes', []) as any)?.count || 0,
    ideas: (db.get('SELECT COUNT(*) as count FROM ideas', []) as any)?.count || 0,
    assets: (db.get('SELECT COUNT(*) as count FROM assets', []) as any)?.count || 0,
    sponsors: (db.get('SELECT COUNT(*) as count FROM sponsors', []) as any)?.count || 0,
    users: (db.get('SELECT COUNT(*) as count FROM users', []) as any)?.count || 0,
    errorLogs: (db.get('SELECT COUNT(*) as count FROM error_logs', []) as any)?.count || 0,
    version: RUNNING_SERVER_VERSION,
    nodeVersion: process.version,
    uptime: process.uptime(),
    platform: process.platform,
  };
  return res.json({ success: true, data: stats });
});

// ============================================================
// IN-APP UPDATE SYSTEM
// ============================================================

const UPDATE_DIR = path.join(DATABASE_DATA_DIR, 'updates');
const UPDATE_STATUS_FILE = path.join(UPDATE_DIR, 'status.json');
const UPDATE_LOG_FILE = path.join(DATABASE_DATA_DIR, 'update.log');
if (!fs.existsSync(UPDATE_DIR)) fs.mkdirSync(UPDATE_DIR, { recursive: true });

type PersistedUpdateStatus = {
  state: 'idle' | 'uploaded' | 'staging' | 'applying' | 'restart-pending' | 'completed' | 'failed';
  updateId?: string;
  previousVersion?: string;
  targetVersion?: string;
  message?: string;
  updatedAt: string;
};

function readUpdateStatus(): PersistedUpdateStatus {
  try {
    return JSON.parse(fs.readFileSync(UPDATE_STATUS_FILE, 'utf8')) as PersistedUpdateStatus;
  } catch {
    return { state: 'idle', updatedAt: new Date().toISOString() };
  }
}

function writeUpdateStatus(status: Omit<PersistedUpdateStatus, 'updatedAt'> & { updatedAt?: string }): PersistedUpdateStatus {
  const persisted = { ...status, updatedAt: status.updatedAt || new Date().toISOString() } as PersistedUpdateStatus;
  fs.mkdirSync(UPDATE_DIR, { recursive: true });
  fs.writeFileSync(UPDATE_STATUS_FILE, JSON.stringify(persisted, null, 2) + '\n');
  return persisted;
}

function appendUpdateLog(lines: string[]): void {
  try {
    fs.appendFileSync(UPDATE_LOG_FILE, lines.map(line => `[${new Date().toISOString()}] ${line}`).join('\n') + '\n');
  } catch {}
}

function commandExists(command: string): boolean {
  try {
    execFileSync(command, ['--version'], { stdio: 'ignore', timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}

function runUpdateCommand(command: string, args: string[], cwd: string, log: string[]): void {
  log.push(`Ausführung: ${command} ${args.join(' ')}`);
  try {
    const output = execFileSync(command, args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 15 * 60 * 1000,
      env: {
        ...process.env,
        CI: 'true',
        NODE_ENV: 'development',
        PNPM_CONFIG_CONFIRM_MODULES_PURGE: 'false',
      },
      maxBuffer: 10 * 1024 * 1024,
    });
    if (output?.trim()) log.push(output.trim().split('\n').slice(-8).join('\n'));
  } catch (error: any) {
    const details = [error?.stdout, error?.stderr, error?.message].filter(Boolean).join('\n').trim();
    throw new Error(`${command} ${args.join(' ')} fehlgeschlagen${details ? `: ${details.slice(-3000)}` : ''}`);
  }
}

function prepareStagedApplication(stagingRoot: string, isSourceZip: boolean, expectedVersion: string, log: string[]): void {
  if (isSourceZip) {
    log.push('Quellcode-Update erkannt; Abhängigkeiten und Build werden im Staging geprüft.');
    if (commandExists('pnpm')) {
      runUpdateCommand('pnpm', ['install', '--frozen-lockfile', '--prefer-offline'], stagingRoot, log);
      runUpdateCommand('pnpm', ['--dir', 'client', 'install', '--frozen-lockfile', '--prefer-offline'], stagingRoot, log);
      runUpdateCommand('pnpm', ['--dir', 'server', 'install', '--frozen-lockfile', '--prefer-offline'], stagingRoot, log);
      runUpdateCommand('pnpm', ['run', 'build'], stagingRoot, log);
    } else if (commandExists('npm')) {
      runUpdateCommand('npm', ['install', '--include=dev'], stagingRoot, log);
      runUpdateCommand('npm', ['install', '--include=dev'], path.join(stagingRoot, 'client'), log);
      runUpdateCommand('npm', ['install', '--include=dev'], path.join(stagingRoot, 'server'), log);
      runUpdateCommand('npm', ['run', 'build'], stagingRoot, log);
    } else {
      throw new Error('Für ein Quellcode-Update wird pnpm oder npm benötigt');
    }
  }
  validateStagedApplication(stagingRoot, expectedVersion);
  log.push(`Staging-Anwendung v${expectedVersion} einschließlich Server- und Frontend-Build verifiziert.`);
}

function dependenciesChanged(stagingRoot: string, appRoot: string): boolean {
  const relevant = [
    'package.json', 'pnpm-lock.yaml',
    'server/package.json', 'server/pnpm-lock.yaml',
  ];
  return relevant.some(relative => {
    const staged = path.join(stagingRoot, relative);
    const current = path.join(appRoot, relative);
    if (!fs.existsSync(staged)) return false;
    if (!fs.existsSync(current)) return true;
    return !fs.readFileSync(staged).equals(fs.readFileSync(current));
  });
}

function installRuntimeDependencies(appRoot: string, log: string[]): void {
  if (commandExists('pnpm')) {
    runUpdateCommand('pnpm', ['install', '--frozen-lockfile', '--prod', '--prefer-offline'], appRoot, log);
    runUpdateCommand('pnpm', ['--dir', 'server', 'install', '--frozen-lockfile', '--prod', '--prefer-offline'], appRoot, log);
    return;
  }
  if (commandExists('npm')) {
    runUpdateCommand('npm', ['install', '--omit=dev'], appRoot, log);
    runUpdateCommand('npm', ['install', '--omit=dev'], path.join(appRoot, 'server'), log);
    return;
  }
  throw new Error('Geänderte Laufzeitabhängigkeiten können ohne pnpm oder npm nicht installiert werden');
}

function scheduleApplicationRestart(appRoot: string, log: string[]): { mode: string; scheduled: boolean } {
  const customRestart = process.env.PODCORE_RESTART_COMMAND?.trim();
  if (customRestart) {
    log.push('Neustart über PODCORE_RESTART_COMMAND geplant.');
    setTimeout(() => {
      try {
        const child = spawn('/bin/sh', ['-c', customRestart], {
          detached: true,
          stdio: 'ignore',
          cwd: appRoot,
          env: { ...process.env },
        });
        child.unref();
      } finally {
        setTimeout(() => process.exit(0), 500);
      }
    }, 1500);
    return { mode: 'custom', scheduled: true };
  }

  if (process.env.INVOCATION_ID || process.env.JOURNAL_STREAM) {
    log.push('systemd-Umgebung erkannt; der Dienst wird durch die konfigurierte Restart-Richtlinie neu gestartet.');
    setTimeout(() => process.exit(0), 1500);
    return { mode: 'systemd', scheduled: true };
  }

  const serverScript = path.join(appRoot, 'server', 'dist', 'index.js');
  if (!fs.existsSync(serverScript)) {
    log.push('Automatischer Neustart nicht möglich: server/dist/index.js fehlt.');
    return { mode: 'manual', scheduled: false };
  }

  log.push('Direkter Node.js-Neustart geplant.');
  setTimeout(() => {
    // Der entkoppelte Starter wartet, bis dieser Prozess den Port freigegeben hat.
    // Ein sofortiger Node-Spawn würde sonst mit EADDRINUSE abbrechen.
    const child = spawn('/bin/sh', [
      '-c',
      'sleep 1; exec "$1" "$2"',
      'podcore-restart',
      process.execPath,
      serverScript,
    ], {
      detached: true,
      stdio: 'ignore',
      cwd: appRoot,
      env: { ...process.env },
    });
    child.unref();
    setTimeout(() => process.exit(0), 100);
  }, 1500);
  return { mode: 'node', scheduled: true };
}

const updateStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPDATE_DIR),
  filename: (_req, _file, cb) => cb(null, `update-${Date.now()}.zip`),
});
const uploadUpdate = multer({
  storage: updateStorage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.originalname.toLowerCase().endsWith('.zip')),
});

// GET /api/admin/update/status
router.get('/update/status', requirePermission('canManageSettings') as any, (req: AuthRequest, res: Response) => {
  const appRoot = getApplicationRoot();
  const currentVersion = RUNNING_SERVER_VERSION;
  let updateState = readUpdateStatus();
  if (updateState.state === 'restart-pending' && updateState.targetVersion === currentVersion) {
    updateState = writeUpdateStatus({
      ...updateState,
      state: 'completed',
      message: `Version ${currentVersion} läuft und wurde verifiziert.`,
    });
  }
  const pendingFiles = fs.readdirSync(UPDATE_DIR).filter(file => /^update-\d+\.zip$/.test(file));
  return res.json({
    success: true,
    data: {
      currentVersion,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pendingUpdates: pendingFiles.length,
      appRoot,
      updateState,
    },
  });
});

// POST /api/admin/update/upload — ZIP hochladen, normalisieren und prüfen
router.post('/update/upload', requirePermission('canManageSettings') as any, uploadUpdate.single('update'), (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'Keine ZIP-Datei hochgeladen' });
  try {
    const info = inspectUpdateArchive(req.file.path);
    const updateId = path.basename(req.file.path, '.zip').replace('update-', '');
    const nodeOk = parseInt(process.version.slice(1), 10) >= 18;
    const checks = [
      { name: 'PodCore-Anwendungswurzel', ok: true, required: true },
      { name: `Konsistente Zielversion ${info.version}`, ok: true, required: true },
      { name: info.isSourceZip ? 'Server-Quellcode' : 'Gebauter Server', ok: info.hasServerSource || info.hasServerDist, required: true },
      { name: info.isSourceZip ? 'Client-Quellcode' : 'Gebautes Frontend', ok: info.hasClientSource || info.hasFrontendBuild, required: true },
      { name: `Node.js >= 18 (aktuell: ${process.version})`, ok: nodeOk, required: true },
      ...(info.isSourceZip ? [{ name: 'Quellcode-ZIP: Build im Staging erforderlich', ok: true, required: false }] : []),
    ];
    const allRequired = checks.filter(check => check.required).every(check => check.ok);
    writeUpdateStatus({
      state: 'uploaded',
      updateId,
      targetVersion: info.version,
      message: `Update-ZIP für Version ${info.version} geprüft.`,
    });
    return res.json({
      success: true,
      data: {
        updateId,
        filename: req.file.filename,
        size: req.file.size,
        updateVersion: info.version,
        fileCount: info.fileCount,
        packageType: info.isSourceZip ? 'source' : 'build',
        checks,
        canApply: allRequired,
      },
    });
  } catch (error: any) {
    try { fs.unlinkSync(req.file.path); } catch {}
    writeUpdateStatus({ state: 'failed', message: `Upload-Prüfung fehlgeschlagen: ${error.message || error}` });
    return res.status(400).json({ success: false, error: `Ungültige PodCore-Update-ZIP: ${error.message || error}` });
  }
});

// POST /api/admin/update/apply — Update im Staging prüfen, rollbackfähig übernehmen und Neustart planen
router.post('/update/apply', requirePermission('canManageSettings') as any, (req: AuthRequest, res: Response) => {
  const updateId = String(req.body?.updateId || '');
  if (!/^\d+$/.test(updateId)) return res.status(400).json({ success: false, error: 'Ungültige updateId' });
  const zipPath = path.join(UPDATE_DIR, `update-${updateId}.zip`);
  if (!fs.existsSync(zipPath)) return res.status(404).json({ success: false, error: 'Update-Datei nicht gefunden' });

  const log: string[] = [`Update ${updateId} gestartet.`];
  let manifest: UpdateBackupManifest | null = null;
  let stagingBase = '';
  try {
    const appRoot = getApplicationRoot();
    const currentVersion = RUNNING_SERVER_VERSION;
    const info = inspectUpdateArchive(zipPath);
    stagingBase = path.join(UPDATE_DIR, `staging-${updateId}`);
    const stagingRoot = path.join(stagingBase, 'app');
    const backupDir = path.join(UPDATE_DIR, 'backups', `${Date.now()}-${currentVersion}-to-${info.version}`);

    writeUpdateStatus({
      state: 'staging',
      updateId,
      previousVersion: currentVersion,
      targetVersion: info.version,
      message: 'Update wird in einem isolierten Staging-Verzeichnis geprüft.',
    });
    log.push(`Anwendungswurzel: ${appRoot}`);
    log.push(`Versionswechsel: ${currentVersion} → ${info.version}`);

    const extracted = extractUpdateArchive(zipPath, stagingRoot, info);
    log.push(`${extracted} sichere Update-Dateien in das Staging extrahiert.`);
    prepareStagedApplication(stagingRoot, info.isSourceZip, info.version, log);
    const installDependencies = dependenciesChanged(stagingRoot, appRoot);

    writeUpdateStatus({
      state: 'applying',
      updateId,
      previousVersion: currentVersion,
      targetVersion: info.version,
      message: 'Geprüfte Dateien werden rollbackfähig übernommen.',
    });
    manifest = applyStagedApplication(stagingRoot, appRoot, backupDir, currentVersion, info.version);
    log.push(`${manifest.overwrittenFiles.length} Dateien gesichert und überschrieben; ${manifest.createdFiles.length} Dateien neu angelegt.`);

    if (installDependencies) {
      log.push('Paketdefinitionen haben sich geändert; Laufzeitabhängigkeiten werden aktualisiert.');
      installRuntimeDependencies(appRoot, log);
    }

    const installedRootVersion = readPackageVersion(path.join(appRoot, 'package.json'));
    const installedServerVersion = readPackageVersion(path.join(appRoot, 'server', 'package.json'));
    if (installedRootVersion !== info.version || installedServerVersion !== info.version) {
      throw new Error(`Versionsprüfung nach Übernahme fehlgeschlagen: Root ${installedRootVersion}, Server ${installedServerVersion}, erwartet ${info.version}`);
    }
    validateStagedApplication(appRoot, info.version);
    log.push(`Installierte Dateien und Version ${info.version} erfolgreich verifiziert.`);

    try { fs.unlinkSync(zipPath); } catch {}
    try { fs.rmSync(stagingBase, { recursive: true, force: true }); } catch {}

    const restart = scheduleApplicationRestart(appRoot, log);
    const status = writeUpdateStatus({
      state: restart.scheduled ? 'restart-pending' : 'applying',
      updateId,
      previousVersion: currentVersion,
      targetVersion: info.version,
      message: restart.scheduled
        ? `Update übernommen; Neustart auf Version ${info.version} wurde geplant.`
        : `Update übernommen; manueller Neustart auf Version ${info.version} ist erforderlich.`,
    });
    appendUpdateLog(log);

    return res.json({
      success: true,
      data: {
        log,
        previousVersion: currentVersion,
        targetVersion: info.version,
        installedVersion: installedServerVersion,
        verifiedBeforeRestart: true,
        restartScheduled: restart.scheduled,
        restartMode: restart.mode,
        updateState: status,
        message: restart.scheduled
          ? `Update auf Version ${info.version} übernommen. Der Neustart läuft; die neue Version wird anschließend verifiziert.`
          : `Update auf Version ${info.version} übernommen. Bitte den Dienst manuell neu starten.`,
      },
    });
  } catch (error: any) {
    let rollbackMessage = '';
    if (manifest) {
      try {
        restoreUpdateBackup(manifest);
        rollbackMessage = ' Änderungen wurden aus der Sicherung zurückgerollt.';
        log.push('Rollback erfolgreich abgeschlossen.');
      } catch (rollbackError: any) {
        rollbackMessage = ` Rollback fehlgeschlagen: ${rollbackError.message || rollbackError}.`;
        log.push(rollbackMessage.trim());
      }
    }
    if (stagingBase) {
      try { fs.rmSync(stagingBase, { recursive: true, force: true }); } catch {}
    }
    const message = `Update fehlgeschlagen: ${error.message || error}.${rollbackMessage}`;
    log.push(message);
    appendUpdateLog(log);
    writeUpdateStatus({ state: 'failed', updateId, message });
    return res.status(500).json({ success: false, error: message, data: { log } });
  }
});

// GET /api/admin/update/logs
router.get('/update/logs', requirePermission('canManageSettings') as any, (req: AuthRequest, res: Response) => {
  let logs: string[] = [];
  try { logs = fs.existsSync(UPDATE_LOG_FILE) ? fs.readFileSync(UPDATE_LOG_FILE, 'utf8').split('\n').filter(Boolean) : []; } catch {}
  return res.json({ success: true, data: logs });
});

// ============================================================
// DATABASE MIGRATION: SQLite → MySQL
// ============================================================

// GET /api/admin/db/status — DB-Typ und Statistiken
router.get('/db/status', requirePermission('canManageSettings') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const settingsRow = db.get("SELECT value FROM settings WHERE key = 'app'") as any;
  const appSettings = settingsRow ? JSON.parse(settingsRow.value) : {};
  const dbType = appSettings?.database?.type || 'sqlite';
  const tables = ['users', 'episodes', 'ideas', 'sponsors', 'assets', 'pdf_layouts', 'settings', 'roles'];
  const stats: Record<string, number> = {};
  for (const t of tables) {
    try { const row = db.get(`SELECT COUNT(*) as cnt FROM ${t}`) as any; stats[t] = row?.cnt || 0; } catch (_) { stats[t] = 0; }
  }
  return res.json({ success: true, data: { type: dbType, stats } });
});

// POST /api/admin/db/test-mysql — MySQL-Verbindung testen
router.post('/db/test-mysql', requirePermission('canManageSettings') as any, async (req: AuthRequest, res: Response) => {
  const { host, port, database, user, password } = req.body;
  if (!host || !database || !user) {
    return res.status(400).json({ success: false, error: 'Host, Datenbank und Benutzer sind erforderlich' });
  }
  try {
    let mysql2: any;
    try { mysql2 = require('mysql2/promise'); } catch (_) {
      return res.json({ success: false, error: 'mysql2-Paket nicht installiert. Bitte zuerst \"npm install mysql2\" im Server-Verzeichnis ausführen.' });
    }
    const conn = await (mysql2 as any).createConnection({
      host, port: parseInt(port) || 3306, database, user, password: password || '', connectTimeout: 8000,
    });
    await conn.query('SELECT 1');
    await conn.end();
    return res.json({ success: true, data: { message: 'Verbindung erfolgreich' } });
  } catch (err: any) {
    return res.json({ success: false, error: err.message || 'Verbindung fehlgeschlagen' });
  }
});

// POST /api/admin/db/migrate-to-mysql — Vollständige Migration SQLite → MySQL
router.post('/db/migrate-to-mysql', requirePermission('canManageSettings') as any, async (req: AuthRequest, res: Response) => {
  const { host, port, database, user, password } = req.body;
  if (!host || !database || !user) {
    return res.status(400).json({ success: false, error: 'Verbindungsdaten unvollständig' });
  }
  const log: string[] = [];
  const addLog = (msg: string) => { log.push(`[${new Date().toISOString()}] ${msg}`); };
  try {
    let mysql2: any;
    try { mysql2 = require('mysql2/promise'); } catch (_) {
      return res.status(500).json({ success: false, error: 'mysql2 nicht installiert.' });
    }
    const conn = await (mysql2 as any).createConnection({
      host, port: parseInt(port) || 3306, database, user, password: password || '',
      connectTimeout: 15000, multipleStatements: true,
    });
    addLog('MySQL-Verbindung hergestellt');
    const sqliteDb = getDb();
    const tables = sqliteDb.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'") as any[];
    addLog(`${tables.length} Tabellen gefunden: ${tables.map((t: any) => t.name).join(', ')}`);
    let totalRows = 0;
    for (const { name: tableName } of tables) {
      try {
        const cols = sqliteDb.all(`PRAGMA table_info(${tableName})`) as any[];
        if (cols.length === 0) continue;

        // Get primary key columns
        const pkCols = cols.filter((c: any) => c.pk > 0);
        const pkColNames = pkCols.map((c: any) => c.name);
        const isCompositePk = pkCols.length > 1;

        const colDefs = cols.map((c: any) => {
          const t = (c.type || '').toUpperCase();
          const isPk = c.pk > 0;
          const isTextLike = !t.includes('INT') && !t.includes('REAL') && !t.includes('FLOAT') && !t.includes('DOUBLE') && !t.includes('BLOB');

          // Determine MySQL type
          let type: string;
          if (t.includes('INT')) {
            type = 'BIGINT';
          } else if (t.includes('REAL') || t.includes('FLOAT') || t.includes('DOUBLE')) {
            type = 'DOUBLE';
          } else if (t.includes('BLOB')) {
            type = 'LONGBLOB';
          } else if (isPk && !isCompositePk) {
            // Single-column PK: use VARCHAR(255) so it can be indexed
            type = 'VARCHAR(255)';
          } else if (isPk && isCompositePk) {
            // Composite PK part: use VARCHAR(191) for utf8mb4 index compatibility
            type = 'VARCHAR(191)';
          } else {
            // Regular text column: LONGTEXT (no default allowed in MySQL)
            type = 'LONGTEXT';
          }

          const notNull = c.notnull ? ' NOT NULL' : '';

          // DEFAULT values:
          // - TEXT/LONGTEXT columns cannot have DEFAULT in MySQL → skip
          // - SQLite datetime('now') → skip
          // - Numeric defaults are fine
          let def = '';
          if (c.dflt_value !== null && !isTextLike && type !== 'LONGTEXT' && type !== 'VARCHAR(255)' && type !== 'VARCHAR(191)') {
            const dflt = String(c.dflt_value);
            if (!dflt.toLowerCase().includes("datetime('now')")) {
              def = ` DEFAULT ${c.dflt_value}`;
            }
          }

          // Only add PRIMARY KEY inline for single-column PKs
          const pk = (isPk && !isCompositePk) ? ' PRIMARY KEY' : '';
          return `\`${c.name}\` ${type}${notNull}${def}${pk}`;
        });

        // Add composite PRIMARY KEY constraint if needed
        if (isCompositePk) {
          const pkDef = `PRIMARY KEY (${pkColNames.map((n: string) => `\`${n}\``).join(', ')})`;
          colDefs.push(pkDef);
        }

        await conn.query(`DROP TABLE IF EXISTS \`${tableName}\``);
        await conn.query(`CREATE TABLE \`${tableName}\` (${colDefs.join(', ')}) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        const rows = sqliteDb.all(`SELECT * FROM ${tableName}`) as any[];
        if (rows.length > 0) {
          const colNames = cols.map((c: any) => `\`${c.name}\``).join(', ');
          const placeholders = cols.map(() => '?').join(', ');
          for (const row of rows) {
            const values = cols.map((c: any) => {
              const val = row[c.name];
              return val !== undefined ? val : null;
            });
            await conn.query(`INSERT INTO \`${tableName}\` (${colNames}) VALUES (${placeholders})`, values);
          }
          totalRows += rows.length;
        }
        addLog(`✓ ${tableName}: ${rows.length} Zeilen`);
      } catch (tableErr: any) { addLog(`✗ ${tableName}: ${tableErr.message}`); }
    }
    await conn.end();
    addLog(`Abgeschlossen: ${totalRows} Datensätze in ${tables.length} Tabellen`);
    const logPath = path.join(DATABASE_DATA_DIR, 'migration.log');
    fs.writeFileSync(logPath, log.join('\n'), 'utf8');
    // MySQL-Konfiguration in Settings speichern
    const settingsRow = sqliteDb.get("SELECT value FROM settings WHERE key = 'app'") as any;
    const appSettings = settingsRow ? JSON.parse(settingsRow.value) : {};
    appSettings.database = { type: 'mysql', host, port: parseInt(port) || 3306, database, user, migratedAt: new Date().toISOString() };
    sqliteDb.run("UPDATE settings SET value = ? WHERE key = 'app'", [JSON.stringify(appSettings)]);
    return res.json({ success: true, data: { message: `Migration erfolgreich: ${totalRows} Datensätze übertragen`, log } });
  } catch (err: any) {
    addLog(`Kritischer Fehler: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message, log });
  }
});

// GET /api/admin/db/migration-log
router.get('/db/migration-log', requirePermission('canManageSettings') as any, (req: AuthRequest, res: Response) => {
  const logPath = path.join(DATABASE_DATA_DIR, 'migration.log');
  let logs: string[] = [];
  try { logs = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean) : []; } catch {}
  return res.json({ success: true, data: logs });
});

// GET /api/admin/update/check-github — Neueste Version auf GitHub prüfen (v2.12.7)
router.get('/update/check-github', requirePermission('canManageSettings') as any, async (req: AuthRequest, res: Response) => {
  const https = require('https');
  const pkgPath = path.join(__dirname, '..', '..', 'package.json');
  let currentVersion = '?';
  try { currentVersion = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version || '?'; } catch {}

  const options = {
    hostname: 'api.github.com',
    path: '/repos/webcaster/podcore_V2/releases/latest',
    method: 'GET',
    headers: { 'User-Agent': 'PodCore-App/2.12.7', 'Accept': 'application/vnd.github.v3+json' },
  };

  try {
    const data = await new Promise<any>((resolve, reject) => {
      const request = https.request(options, (response: any) => {
        let body = '';
        response.on('data', (chunk: any) => body += chunk);
        response.on('end', () => { try { resolve(JSON.parse(body)); } catch { reject(new Error('Ungültige Antwort')); } });
      });
      request.on('error', reject);
      request.setTimeout(10000, () => { request.destroy(); reject(new Error('Timeout')); });
      request.end();
    });

    if (!data.tag_name) {
      return res.json({
        success: true,
        data: {
          currentVersion, latestVersion: null, hasUpdate: false,
          message: 'Kein öffentlicher Release gefunden. Bitte manuell prüfen.',
          releaseUrl: 'https://github.com/webcaster/podcore_V2/releases',
          downloadUrl: null, releaseNotes: null, publishedAt: null,
        },
      });
    }

    const latestVersion = data.tag_name.replace(/^v/, '');
    const hasUpdate = latestVersion !== currentVersion;
    const zipAsset = (data.assets || []).find((a: any) => a.name.endsWith('.zip'));

    return res.json({
      success: true,
      data: {
        currentVersion, latestVersion, hasUpdate,
        message: hasUpdate
          ? `Neue Version ${latestVersion} verfügbar (aktuell: ${currentVersion})`
          : `Version ${currentVersion} ist aktuell`,
        releaseUrl: data.html_url,
        downloadUrl: zipAsset?.browser_download_url || null,
        releaseNotes: data.body || null,
        publishedAt: data.published_at || null,
      },
    });
  } catch (err: any) {
    return res.json({
      success: true,
      data: {
        currentVersion, latestVersion: null, hasUpdate: false,
        message: `GitHub nicht erreichbar: ${err.message}`,
        releaseUrl: 'https://github.com/webcaster/podcore_V2',
        downloadUrl: null, releaseNotes: null, publishedAt: null,
      },
    });
  }
});

export default router;
