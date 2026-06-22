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
    permissions: JSON.parse(session.permissions || '{}'),
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
      permissions: JSON.parse(session.permissions || '{}'),
    };
  }

  next();
}
