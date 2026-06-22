import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

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
    secure: false, // Allow HTTP for local/self-hosted
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.json({
    success: true,
    data: {
      token: sessionToken,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        email: user.email,
        role: user.role,
        permissions: JSON.parse(user.permissions || '{}'),
        avatarColor: user.avatar_color,
      },
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
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      email: user.email,
      role: user.role,
      permissions: JSON.parse(user.permissions || '{}'),
      avatarColor: user.avatar_color,
      lastLogin: user.last_login,
    },
  });
});

// PUT /api/auth/me — Update own profile (displayName, email, avatarColor)
router.put('/me', requireAuth as any, (req: AuthRequest, res: Response) => {
  const { displayName, email, avatarColor } = req.body;

  const db = getDb();
  const user = db.get('SELECT * FROM users WHERE id = ?', [req.user!.id]) as any;

  if (!user) {
    return res.status(404).json({ success: false, error: 'Benutzer nicht gefunden' });
  }

  const newDisplayName = displayName !== undefined ? displayName : user.display_name;
  const newEmail = email !== undefined ? email : user.email;
  const newAvatarColor = avatarColor !== undefined ? avatarColor : user.avatar_color;

  db.run(
    "UPDATE users SET display_name = ?, email = ?, avatar_color = ?, updated_at = datetime('now') WHERE id = ?",
    [newDisplayName, newEmail, newAvatarColor, req.user!.id]
  );

  const updated = db.get('SELECT * FROM users WHERE id = ?', [req.user!.id]) as any;

  return res.json({
    success: true,
    data: {
      id: updated.id,
      username: updated.username,
      displayName: updated.display_name,
      email: updated.email,
      role: updated.role,
      permissions: JSON.parse(updated.permissions || '{}'),
      avatarColor: updated.avatar_color,
    },
  });
});

// POST /api/auth/change-password
router.post('/change-password', requireAuth as any, (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, error: 'Aktuelles und neues Passwort erforderlich' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, error: 'Neues Passwort muss mindestens 6 Zeichen haben' });
  }

  const db = getDb();
  const user = db.get('SELECT * FROM users WHERE id = ?', [req.user!.id]) as any;

  const passwordValid = bcrypt.compareSync(currentPassword, user.password_hash);
  if (!passwordValid) {
    return res.status(401).json({ success: false, error: 'Aktuelles Passwort falsch' });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.run("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?", [newHash, req.user!.id]);

  return res.json({ success: true, message: 'Passwort erfolgreich geändert' });
});

export default router;
