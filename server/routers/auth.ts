import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

function formatUser(user: any) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    email: user.email,
    role: user.role,
    permissions: JSON.parse(user.permissions || '{}'),
    avatarColor: user.avatar_color,
    theme: user.theme ? JSON.parse(user.theme) : null,
    dashboardLayout: user.dashboard_layout ? JSON.parse(user.dashboard_layout) : null,
  };
}

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Benutzername und Passwort erforderlich' });
  }

  const db = getDb();
  const user = db.get('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]) as any;

  if (!user) {
    return res.status(401).json({ success: false, error: 'Ungültige Anmeldedaten' });
  }

  const passwordValid = bcrypt.compareSync(password, user.password_hash);
  if (!passwordValid) {
    return res.status(401).json({ success: false, error: 'Ungültige Anmeldedaten' });
  }

  const sessionToken = uuidv4() + '-' + uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  db.run('INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
    [uuidv4(), user.id, sessionToken, expiresAt]);

  db.run("UPDATE users SET last_login = datetime('now') WHERE id = ?", [user.id]);

  res.cookie('podcore_session', sessionToken, {
    httpOnly: true,
    secure: false,
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
  const { displayName, email, avatarColor, theme, dashboardLayout, currentPassword, newPassword } = req.body;

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
  const newTheme = theme !== undefined ? JSON.stringify(theme) : user.theme;
  const newDashboardLayout = dashboardLayout !== undefined ? JSON.stringify(dashboardLayout) : user.dashboard_layout;

  db.run(
    "UPDATE users SET display_name = ?, email = ?, avatar_color = ?, theme = ?, dashboard_layout = ?, updated_at = datetime('now') WHERE id = ?",
    [newDisplayName, newEmail, newAvatarColor, newTheme, newDashboardLayout, req.user!.id]
  );

  const updated = db.get('SELECT * FROM users WHERE id = ?', [req.user!.id]) as any;

  return res.json({
    success: true,
    data: formatUser(updated),
  });
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
