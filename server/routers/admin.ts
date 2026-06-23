import { Router, Request, Response } from 'express';
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

router.delete('/users/:id', requirePermission('canManageUsers') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  if (req.params.id === req.user!.id) {
    return res.status(400).json({ success: false, error: 'Sie können sich nicht selbst löschen' });
  }

  db.run('DELETE FROM sessions WHERE user_id = ?', [req.params.id]);
  db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
  return res.json({ success: true, message: 'Benutzer gelöscht' });
});

router.get('/roles/:role/permissions', requirePermission('canManageUsers') as any, (req: AuthRequest, res: Response) => {
  const permissions = getDefaultPermissions(req.params.role);
  return res.json({ success: true, data: permissions });
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

export default router;
