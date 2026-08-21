import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router: import("express").Router = Router();

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;
const loginAttempts = new Map<string, { count: number; firstAttemptAt: number }>();

function getClientKey(req: Request): string {
  return String((req as any).ip || req.headers['x-forwarded-for'] || 'unknown');
}

function isLoginRateLimited(key: string): boolean {
  const current = loginAttempts.get(key);
  if (!current) return false;
  if (Date.now() - current.firstAttemptAt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(key);
    return false;
  }
  return current.count >= LOGIN_MAX_ATTEMPTS;
}

function registerFailedLogin(key: string): void {
  const now = Date.now();
  const current = loginAttempts.get(key);
  if (!current || now - current.firstAttemptAt > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAttemptAt: now });
  } else {
    current.count += 1;
  }
}

function clearFailedLogins(key: string): void {
  loginAttempts.delete(key);
}

function resolveUserPermissions(user: any): Record<string, boolean> {
  if (user.role === 'admin') return {};
  try {
    const userPerms = JSON.parse(user.permissions || '{}');
    if (userPerms && Object.keys(userPerms).length > 0) return userPerms;
  } catch { /* ignore */ }
  // Fallback: Berechtigungen aus der roles-Tabelle laden
  try {
    const db = getDb();
    const roleRow = db.get('SELECT permissions FROM roles WHERE name = ?', [user.role]) as any;
    if (roleRow?.permissions) {
      const rolePerms = JSON.parse(roleRow.permissions);
      if (rolePerms && Object.keys(rolePerms).length > 0) return rolePerms;
    }
  } catch { /* ignore */ }
  return {};
}

const DASHBOARD_WIDGET_IDS = ['stats', 'approvals', 'online_users', 'podcast_episodes', 'podigee', 'editorial', 'quickactions', 'tutorial_cloud'];

function parseStoredJson(value: unknown, fallback: any = null): any {
  if (value === null || value === undefined || value === '') return fallback;
  try { return typeof value === 'string' ? JSON.parse(value) : value; } catch (_) { return fallback; }
}

function normalizeDashboardLayout(value: unknown): any {
  const source = parseStoredJson(value, null);
  const uniqueKnownWidgets = (items: unknown) => Array.isArray(items)
    ? Array.from(new Set(items.filter(item => typeof item === 'string' && DASHBOARD_WIDGET_IDS.includes(item))))
    : [];
  // Version 1 war nur ein Array mit sichtbaren Widgets. Dieses Format bleibt
  // lesbar und wird beim nächsten Speichern automatisch in Version 2 überführt.
  if (Array.isArray(source)) {
    return { version: 2, widgetOrder: uniqueKnownWidgets(source), hiddenWidgets: [], density: 'comfortable', showWelcome: true };
  }
  if (!source || typeof source !== 'object') return null;
  const widgetOrder = uniqueKnownWidgets(source.widgetOrder);
  const hiddenWidgets = uniqueKnownWidgets(source.hiddenWidgets).filter(widget => !widgetOrder.includes(widget) || true);
  return {
    version: 2,
    widgetOrder,
    hiddenWidgets,
    density: source.density === 'compact' ? 'compact' : 'comfortable',
    showWelcome: source.showWelcome !== false,
  };
}

function isThemeHex(value: unknown): value is string {
  return typeof value === 'string' && /^#(?:[a-f\d]{3}|[a-f\d]{6})$/i.test(value.trim());
}

function normalizeUserTheme(value: unknown): any {
  const source = value && typeof value === 'object' ? value as Record<string, any> : {};
  const fontScale = Number(source.fontScale);
  return {
    accentColor: isThemeHex(source.accentColor) ? source.accentColor : '#9d4edd',
    sidebarColor: isThemeHex(source.sidebarColor) ? source.sidebarColor : '#14121d',
    fontScale: Number.isFinite(fontScale) ? Math.min(1.25, Math.max(0.85, fontScale)) : 1,
    mode: source.mode === 'light' ? 'light' : 'dark',
  };
}

function formatUser(user: any) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    email: user.email,
    role: user.role,
    permissions: resolveUserPermissions(user),
    developerMode: user.developer_mode === 1,
    avatarColor: user.avatar_color,
    language: user.language === 'en' ? 'en' : 'de',
    theme: user.theme ? normalizeUserTheme(parseStoredJson(user.theme, null)) : null,
    dashboardLayout: normalizeDashboardLayout(user.dashboard_layout),
  };
}

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  const clientKey = getClientKey(req);

  if (isLoginRateLimited(clientKey)) {
    res.setHeader('Retry-After', String(Math.ceil(LOGIN_WINDOW_MS / 1000)));
    return res.status(429).json({ success: false, error: 'Zu viele Anmeldeversuche. Bitte später erneut versuchen.' });
  }

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Benutzername und Passwort erforderlich' });
  }

  const db = getDb();
  const user = db.get('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]) as any;

  if (!user) {
    registerFailedLogin(clientKey);
    return res.status(401).json({ success: false, error: 'Ungültige Anmeldedaten' });
  }

  const passwordValid = bcrypt.compareSync(password, user.password_hash);
  if (!passwordValid) {
    registerFailedLogin(clientKey);
    return res.status(401).json({ success: false, error: 'Ungültige Anmeldedaten' });
  }

  clearFailedLogins(clientKey);
  db.run("DELETE FROM sessions WHERE expires_at <= datetime('now')");
  const sessionToken = uuidv4() + '-' + uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  db.run('INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
    [uuidv4(), user.id, sessionToken, expiresAt]);

  db.run("UPDATE users SET last_login = datetime('now') WHERE id = ?", [user.id]);

  res.cookie('podcore_session', sessionToken, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.json({
    success: true,
    data: {
      token: sessionToken,
      user: formatUser(user),
    },
  });
});

// POST /api/auth/logout
router.post('/logout', requireAuth as any, (req: AuthRequest, res: Response) => {
  const token = req.cookies?.podcore_session || req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    const db = getDb();
    db.run('DELETE FROM sessions WHERE token = ?', [token]);
  }

  res.clearCookie('podcore_session');
  return res.json({ success: true, message: 'Erfolgreich abgemeldet' });
});

// GET /api/auth/me
router.get('/me', requireAuth as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = db.get('SELECT * FROM users WHERE id = ?', [req.user!.id]) as any;

  if (!user) {
    return res.status(404).json({ success: false, error: 'Benutzer nicht gefunden' });
  }

  return res.json({
    success: true,
    data: {
      ...formatUser(user),
      lastLogin: user.last_login,
    },
  });
});

// PUT /api/auth/me — Update own profile (displayName, email, avatarColor, theme)
router.put('/me', requireAuth as any, (req: AuthRequest, res: Response) => {
  const { displayName, email, avatarColor, language, theme, dashboardLayout, developerMode, currentPassword, newPassword } = req.body;

  const db = getDb();
  const user = db.get('SELECT * FROM users WHERE id = ?', [req.user!.id]) as any;

  if (!user) {
    return res.status(404).json({ success: false, error: 'Benutzer nicht gefunden' });
  }

  // Handle password change if requested
  if (newPassword) {
    if (!currentPassword) {
      return res.status(400).json({ success: false, error: 'Aktuelles Passwort erforderlich' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Neues Passwort muss mindestens 6 Zeichen haben' });
    }
    const passwordValid = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ success: false, error: 'Aktuelles Passwort falsch' });
    }
    const newHash = bcrypt.hashSync(newPassword, 10);
    db.run("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?", [newHash, req.user!.id]);
  }

  const newDisplayName = displayName !== undefined ? displayName : user.display_name;
  const newEmail = email !== undefined ? email : user.email;
  const newAvatarColor = avatarColor !== undefined ? avatarColor : user.avatar_color;
  const newLanguage = language === 'en' ? 'en' : (language === 'de' ? 'de' : (user.language === 'en' ? 'en' : 'de'));
  const newTheme = theme !== undefined ? JSON.stringify(normalizeUserTheme(theme)) : user.theme;
  const normalizedDashboardLayout = dashboardLayout !== undefined ? normalizeDashboardLayout(dashboardLayout) : undefined;
  const newDashboardLayout = normalizedDashboardLayout !== undefined ? JSON.stringify(normalizedDashboardLayout) : user.dashboard_layout;
  // Only administrators may switch developer mode for their own account.
  const newDeveloperMode = user.role === 'admin' && typeof developerMode === 'boolean'
    ? (developerMode ? 1 : 0)
    : (user.developer_mode === 1 ? 1 : 0);

  db.run(
    "UPDATE users SET display_name = ?, email = ?, avatar_color = ?, language = ?, theme = ?, dashboard_layout = ?, developer_mode = ?, updated_at = datetime('now') WHERE id = ?",
    [newDisplayName, newEmail, newAvatarColor, newLanguage, newTheme, newDashboardLayout, newDeveloperMode, req.user!.id]
  );

  const updated = db.get('SELECT * FROM users WHERE id = ?', [req.user!.id]) as any;

  return res.json({
    success: true,
    data: formatUser(updated),
  });
});

// POST /api/auth/heartbeat — Aktuelle Session als "online" markieren
router.post('/heartbeat', requireAuth as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const token = req.cookies?.podcore_session || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ success: false });
  db.run(`UPDATE sessions SET last_seen = datetime('now') WHERE token = ?`, [token]);
  return res.json({ success: true });
});

// GET /api/auth/online-users — Alle Nutzer mit aktiver Session in den letzten 5 Minuten
router.get('/online-users', requireAuth as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const rows = db.all(`
    SELECT DISTINCT u.id, u.username, u.display_name as displayName, u.avatar_color as avatarColor, u.role
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE u.is_active = 1
      AND s.expires_at > datetime('now')
      AND (
        s.last_seen >= datetime('now', '-5 minutes')
        OR s.created_at >= datetime('now', '-5 minutes')
      )
  `) as any[];
  return res.json({ success: true, data: rows || [] });
});

// GET /api/auth/setup-status — Check if the system has been used before (hide default credentials hint)
router.get('/setup-status', (req: Request, res: Response) => {
  const db = getDb();
  // Check if the admin user has ever logged in (last_login is set)
  const admin = db.get("SELECT last_login FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1") as any;
  const isFirstSetup = !admin || !admin.last_login;
  return res.json({ success: true, data: { isFirstSetup } });
});

// GET /api/auth/branding — Public branding info (no auth needed for logo display)
router.get('/branding', (req: Request, res: Response) => {
  const db = getDb();
  const row = db.get("SELECT value FROM settings WHERE key = 'app'") as any;
  const settings = row ? JSON.parse(row.value) : {};
  const branding = settings?.branding || {};
  return res.json({
    success: true,
    data: {
      podcastName: branding.podcastName || settings?.general?.podcastName || 'PodCore',
      podcastDescription: branding.podcastDescription || '',
      logoUrl: branding.logoUrl || null,
      coverUrl: branding.coverUrl || null,
      primaryColor: branding.primaryColor || '#7c3aed',
      accentColor: branding.accentColor || '#06b6d4',
    },
  });
});

export default router;
