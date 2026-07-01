import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    displayName: string;
    role: string;
    permissions: Record<string, boolean>;
  };
}

const SESSION_QUERY = `
  SELECT s.*, u.id as user_id, u.username, u.display_name, u.role, u.permissions, u.is_active
  FROM sessions s
  JOIN users u ON s.user_id = u.id
  WHERE s.token = ? AND s.expires_at > datetime('now')
`;

/**
 * Berechtigungen auflösen:
 * 1. Wenn user.permissions nicht leer → diese verwenden
 * 2. Sonst: Berechtigungen aus der roles-Tabelle laden (nach role-Name)
 * Admin bekommt immer leeres Objekt – wird in requirePermission gesondert behandelt
 */
function resolvePermissions(userPermissionsJson: string, role: string): Record<string, boolean> {
  if (role === 'admin') return {};
  try {
    const userPerms = JSON.parse(userPermissionsJson || '{}');
    if (userPerms && Object.keys(userPerms).length > 0) return userPerms;
  } catch { /* ignore */ }
  try {
    const db = getDb();
    const roleRow = db.get('SELECT permissions FROM roles WHERE name = ?', [role]) as any;
    if (roleRow?.permissions) {
      const rolePerms = JSON.parse(roleRow.permissions);
      if (rolePerms && Object.keys(rolePerms).length > 0) return rolePerms;
    }
  } catch { /* ignore */ }
  return {};
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.cookies?.podcore_session || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ success: false, error: 'Nicht authentifiziert' });
    return;
  }

  const db = getDb();
  const session = db.get(SESSION_QUERY, [token]) as any;

  if (!session || !session.is_active) {
    res.status(401).json({ success: false, error: 'Session abgelaufen oder ungültig' });
    return;
  }

  req.user = {
    id: session.user_id,
    username: session.username,
    displayName: session.display_name,
    role: session.role,
    permissions: resolvePermissions(session.permissions, session.role),
  };

  next();
}

export function requirePermission(permission: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Nicht authentifiziert' });
      return;
    }

    if (req.user.role === 'admin' || req.user.permissions[permission]) {
      next();
      return;
    }

    res.status(403).json({ success: false, error: 'Keine Berechtigung für diese Aktion' });
  };
}

// Helper: verify a token and return the user object or null
export function verifyToken(token: string): { id: string; username: string; role: string } | null {
  try {
    const db = getDb();
    const session = db.get(SESSION_QUERY, [token]) as any;
    if (!session || !session.is_active) return null;
    return { id: session.user_id, username: session.username, role: session.role };
  } catch {
    return null;
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.cookies?.podcore_session || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    next();
    return;
  }

  const db = getDb();
  const session = db.get(SESSION_QUERY, [token]) as any;

  if (session && session.is_active) {
    req.user = {
      id: session.user_id,
      username: session.username,
      displayName: session.display_name,
      role: session.role,
      permissions: resolvePermissions(session.permissions, session.role),
    };
  }

  next();
}
