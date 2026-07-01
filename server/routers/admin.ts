import { Router, Response, Request } from 'express';
import multer from 'multer';
import AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDb, getDefaultPermissions } from '../database';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';

const router = Router();

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

router.get('/system', requirePermission('canManageSettings') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const stats = {
    episodes: (db.get('SELECT COUNT(*) as count FROM episodes', []) as any)?.count || 0,
    ideas: (db.get('SELECT COUNT(*) as count FROM ideas', []) as any)?.count || 0,
    assets: (db.get('SELECT COUNT(*) as count FROM assets', []) as any)?.count || 0,
    sponsors: (db.get('SELECT COUNT(*) as count FROM sponsors', []) as any)?.count || 0,
    users: (db.get('SELECT COUNT(*) as count FROM users', []) as any)?.count || 0,
    errorLogs: (db.get('SELECT COUNT(*) as count FROM error_logs', []) as any)?.count || 0,
    version: '2.0.0',
    nodeVersion: process.version,
    uptime: process.uptime(),
    platform: process.platform,
  };
  return res.json({ success: true, data: stats });
});

// ============================================================
// IN-APP UPDATE SYSTEM
// ============================================================

const DATA_DIR = process.env.DATA_DIR || path.join(process.env.HOME || '/tmp', '.podcore');
const UPDATE_DIR = path.join(DATA_DIR, 'updates');
if (!fs.existsSync(UPDATE_DIR)) fs.mkdirSync(UPDATE_DIR, { recursive: true });

const updateStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPDATE_DIR),
  filename: (_req, _file, cb) => cb(null, `update-${Date.now()}.zip`),
});
const uploadUpdate = multer({ storage: updateStorage, limits: { fileSize: 500 * 1024 * 1024 } });

// GET /api/admin/update/status
router.get('/update/status', requirePermission('canManageSettings') as any, (req: AuthRequest, res: Response) => {
  const pkgPath = path.join(__dirname, '..', '..', 'package.json');
  let currentVersion = '?';
  try { currentVersion = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version || '?'; } catch {}
  const nodeVersion = process.version;
  const platform = process.platform;
  const arch = process.arch;
  // Prüfe ob pending update vorhanden
  const pendingFiles = fs.existsSync(UPDATE_DIR) ? fs.readdirSync(UPDATE_DIR).filter(f => f.endsWith('.zip')) : [];
  return res.json({
    success: true,
    data: { currentVersion, nodeVersion, platform, arch, pendingUpdates: pendingFiles.length },
  });
});

// POST /api/admin/update/upload — ZIP hochladen und prüfen
router.post('/update/upload', requirePermission('canManageSettings') as any, uploadUpdate.single('update'), (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'Keine Datei hochgeladen' });
  try {
    const zip = new AdmZip(req.file.path);
    const entries = zip.getEntries().map(e => e.entryName);
    // Prüfe ob es eine gültige PodCore-Update-ZIP ist
    const hasServer = entries.some(e => e.includes('server/dist/index.js') || e.includes('dist/index.js'));
    const hasPublic = entries.some(e => e.includes('server/public/') || e.includes('dist/public/'));
    const hasPkg = entries.some(e => e.endsWith('package.json'));
    // Versuche Version aus package.json zu lesen
    let updateVersion = '?';
    try {
      const pkgEntry = zip.getEntries().find(e => e.entryName.match(/^[^/]*\/package\.json$/) || e.entryName === 'package.json');
      if (pkgEntry) {
        const pkgData = JSON.parse(pkgEntry.getData().toString('utf8'));
        updateVersion = pkgData.version || '?';
      }
    } catch {}
    // Prüfe Node.js Kompatibilität
    const nodeOk = parseInt(process.version.slice(1)) >= 18;
    const checks = [
      { name: 'Server-Dateien', ok: hasServer, required: true },
      { name: 'Frontend-Assets', ok: hasPublic, required: true },
      { name: 'package.json', ok: hasPkg, required: false },
      { name: `Node.js >= 18 (aktuell: ${process.version})`, ok: nodeOk, required: true },
    ];
    const allRequired = checks.filter(c => c.required).every(c => c.ok);
    const updateId = path.basename(req.file.path, '.zip').replace('update-', '');
    return res.json({
      success: true,
      data: {
        updateId,
        filename: req.file.filename,
        size: req.file.size,
        updateVersion,
        fileCount: entries.length,
        checks,
        canApply: allRequired,
      },
    });
  } catch (err: any) {
    try { fs.unlinkSync(req.file.path); } catch {}
    return res.status(400).json({ success: false, error: `Ungültige ZIP-Datei: ${err.message}` });
  }
});

// POST /api/admin/update/apply — Update anwenden
router.post('/update/apply', requirePermission('canManageSettings') as any, (req: AuthRequest, res: Response) => {
  const { updateId } = req.body;
  if (!updateId) return res.status(400).json({ success: false, error: 'updateId fehlt' });
  const zipPath = path.join(UPDATE_DIR, `update-${updateId}.zip`);
  if (!fs.existsSync(zipPath)) return res.status(404).json({ success: false, error: 'Update-Datei nicht gefunden' });
  try {
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();
    // Bestimme das Zielverzeichnis (wo der Server läuft)
    // __dirname = .../server/dist/routers → serverDir = .../server (2 levels up)
    // Bei ZIP-Struktur podcore-release/server/... → nach Strip: server/...
    // serverDir muss das übergeordnete Verzeichnis von server/ sein
    const serverBinDir = path.join(__dirname, '..'); // .../server/dist → .../server
    const serverRootDir = path.join(__dirname, '..', '..'); // .../server → .../podcore-release
    const log: string[] = [`Update gestartet: ${new Date().toISOString()}`];
    // Extrahiere nur server/dist und server/public (keine node_modules, keine DB)
    let extracted = 0;
    entries.forEach(entry => {
      const name = entry.entryName;
      // Überspringe node_modules, .db Dateien, Uploads, Verzeichniseinträge
      if (entry.isDirectory) return;
      if (name.includes('node_modules/') || name.endsWith('.db') || name.includes('/uploads/') || name.includes('/branding/')) return;
      // Normalisiere Pfad: entferne führendes Verzeichnis (z.B. 'podcore-release/')
      const stripped = name.replace(/^[^/]+\//, '');
      // Extrahiere server/dist/, server/public/, server/package.json
      let targetRelPath: string | null = null;
      if (stripped.startsWith('server/dist/') || stripped.startsWith('server/public/')) {
        // stripped = 'server/dist/...' → targetRelPath relativ zu serverRootDir
        targetRelPath = stripped;
      } else if (stripped === 'server/package.json') {
        targetRelPath = stripped;
      } else if (stripped.startsWith('dist/') || stripped.startsWith('public/')) {
        // Fallback: ZIP ohne 'server/' Prefix
        targetRelPath = 'server/' + stripped;
      } else if (stripped === 'package.json') {
        targetRelPath = 'server/package.json';
      }
      if (targetRelPath) {
        const targetPath = path.join(serverRootDir, targetRelPath);
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.writeFileSync(targetPath, entry.getData());
        extracted++;
      }
    });
    log.push(`${extracted} Dateien extrahiert`);
    // Aufräumen
    try { fs.unlinkSync(zipPath); } catch {}
    log.push('Update erfolgreich abgeschlossen');
    // Log-Datei schreiben
    const logFile = path.join(DATA_DIR, 'update.log');
    try { fs.appendFileSync(logFile, log.join('\n') + '\n'); } catch {}
    // Server-Neustart: Neuen Prozess spawnen, dann aktuellen beenden
    // Funktioniert ohne PM2/systemd durch self-restart
    const serverScript = path.join(serverBinDir, 'index.js');
    const isWindows = process.platform === 'win32';
    const needsRestart = fs.existsSync(serverScript);
    if (needsRestart) {
      log.push('Server wird neu gestartet...');
      setTimeout(() => {
        try {
          // Spawn neuen Server-Prozess (detached, unabhängig vom aktuellen)
          const child = spawn(process.execPath, [serverScript], {
            detached: true,
            stdio: 'ignore',
            env: { ...process.env },
            cwd: serverBinDir,
          });
          child.unref();
        } catch {}
        // Aktuellen Prozess beenden
        setTimeout(() => process.exit(0), 500);
      }, 2000);
    } else {
      log.push('Manueller Neustart erforderlich: Server stoppen und neu starten.');
    }
    return res.json({ success: true, data: { log, message: needsRestart ? 'Update erfolgreich. Server startet automatisch neu.' : 'Update erfolgreich. Bitte Server manuell neu starten.', needsRestart } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: `Update fehlgeschlagen: ${err.message}` });
  }
});

// GET /api/admin/update/logs
router.get('/update/logs', requirePermission('canManageSettings') as any, (req: AuthRequest, res: Response) => {
  const logFile = path.join(DATA_DIR, 'update.log');
  let logs: string[] = [];
  try { logs = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean) : []; } catch {}
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
    const logPath = path.join(DATA_DIR, 'migration.log');
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
  const logPath = path.join(DATA_DIR, 'migration.log');
  let logs: string[] = [];
  try { logs = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean) : []; } catch {}
  return res.json({ success: true, data: logs });
});

export default router;
