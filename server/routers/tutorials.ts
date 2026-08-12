import express, { Response, Router } from 'express';
import { getDb } from '../database';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router: Router = express.Router();

// ── TYPES ──────────────────────────────────────────────────────────────────
interface AnnotationPoint {
  id: string;
  x: number;
  y: number;
  label: string;
  description: string;
}

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  image?: string;
  annotations?: AnnotationPoint[];
  highlightColor?: string;
  allowSkip?: boolean;
  action?: string;
}

// ── HELPERS ────────────────────────────────────────────────────────────────
const requireDeveloper = (req: AuthRequest, res: Response, next: Function) => {
  const user = req.user;
  if (!user || user.role !== 'admin' || user.developerMode !== true) {
    return res.status(403).json({ error: 'Entwickler-Modus erforderlich' });
  }
  next();
};

const parseTutorial = (t: any) => ({
  id: t.id,
  roles: (() => {
    try {
      const parsed = JSON.parse(t.roles || '[]');
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
    return t.role ? [t.role] : [];
  })(),
  // keep legacy role field for backward compat
  role: t.role || '',
  title: t.title,
  description: t.description || '',
  enabled: t.enabled === 1,
  steps: (() => { try { return JSON.parse(t.steps || '[]'); } catch { return []; } })(),
  createdAt: t.created_at,
  updatedAt: t.updated_at,
  createdBy: t.created_by,
});

// ── MIGRATION: add roles column if missing ─────────────────────────────────
function ensureRolesColumn() {
  try {
    const db = getDb();
    const cols = (db.all('PRAGMA table_info(tutorials)', []) as any[]).map((c: any) => c.name);
    if (!cols.includes('roles')) {
      db.run('ALTER TABLE tutorials ADD COLUMN roles TEXT');
      db.run(`UPDATE tutorials SET roles = json_array(role) WHERE roles IS NULL OR roles = ''`);
    }
  } catch (e) {
    console.warn('[tutorials] Migration warning:', e);
  }
}
ensureRolesColumn();

// ── GET TUTORIALS FOR CURRENT USER ────────────────────────────────────────
router.get('/tutorials', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const user = req.user!;
    const all = db.all('SELECT * FROM tutorials WHERE enabled = 1 ORDER BY created_at ASC', []) as any[];
    const filtered = all.filter(t => {
      try {
        const roles = JSON.parse(t.roles || `["${t.role}"]`);
        return Array.isArray(roles) ? roles.includes(user.role) : roles === user.role;
      } catch { return t.role === user.role; }
    });
    res.json(filtered.map(parseTutorial));
  } catch (error) {
    console.error('Error fetching tutorials:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Tutorials' });
  }
});

// ── GET TUTORIAL BY ID ─────────────────────────────────────────────────────
router.get('/tutorials/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const t = db.get('SELECT * FROM tutorials WHERE id = ?', [req.params.id]) as any;
    if (!t) return res.status(404).json({ error: 'Tutorial nicht gefunden' });
    res.json(parseTutorial(t));
  } catch (error) {
    console.error('Error fetching tutorial:', error);
    res.status(500).json({ error: 'Fehler beim Laden des Tutorials' });
  }
});

// ── CREATE TUTORIAL (DEVELOPER MODE ONLY) ─────────────────────────────────
router.post('/tutorials', requireAuth, requireDeveloper as any, async (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const user = req.user!;
    const { roles, role, title, description, steps, enabled = true } = req.body;

    const rolesArray: string[] = Array.isArray(roles) && roles.length > 0
      ? roles
      : (role ? [role] : []);

    if (rolesArray.length === 0 || !title || !steps || !Array.isArray(steps)) {
      return res.status(400).json({ error: 'Pflichtfelder fehlen (roles, title, steps)' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO tutorials (id, role, roles, title, description, enabled, steps, created_at, updated_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, rolesArray[0], JSON.stringify(rolesArray), title, description || '',
       enabled ? 1 : 0, JSON.stringify(steps), now, now, user.id]
    );

    const created = db.get('SELECT * FROM tutorials WHERE id = ?', [id]) as any;
    res.status(201).json(parseTutorial(created));
  } catch (error) {
    console.error('Error creating tutorial:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen des Tutorials' });
  }
});

// ── UPDATE TUTORIAL (DEVELOPER MODE ONLY) ─────────────────────────────────
router.put('/tutorials/:id', requireAuth, requireDeveloper as any, async (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const existing = db.get('SELECT * FROM tutorials WHERE id = ?', [id]) as any;
    if (!existing) return res.status(404).json({ error: 'Tutorial nicht gefunden' });

    const { roles, role, title, description, steps, enabled } = req.body;
    const rolesArray: string[] = Array.isArray(roles) && roles.length > 0
      ? roles
      : (role ? [role] : (() => {
          try { return JSON.parse(existing.roles || `["${existing.role}"]`); } catch { return [existing.role]; }
        })());

    const now = new Date().toISOString();
    db.run(
      `UPDATE tutorials SET role = ?, roles = ?, title = ?, description = ?, steps = ?, enabled = ?, updated_at = ? WHERE id = ?`,
      [
        rolesArray[0],
        JSON.stringify(rolesArray),
        title !== undefined ? title : existing.title,
        description !== undefined ? description : existing.description,
        steps ? JSON.stringify(steps) : existing.steps,
        enabled !== undefined ? (enabled ? 1 : 0) : existing.enabled,
        now, id,
      ]
    );

    const updated = db.get('SELECT * FROM tutorials WHERE id = ?', [id]) as any;
    res.json(parseTutorial(updated));
  } catch (error) {
    console.error('Error updating tutorial:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Tutorials' });
  }
});

// ── DELETE TUTORIAL (DEVELOPER MODE ONLY) ─────────────────────────────────
router.delete('/tutorials/:id', requireAuth, requireDeveloper as any, async (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const existing = db.get('SELECT id FROM tutorials WHERE id = ?', [req.params.id]) as any;
    if (!existing) return res.status(404).json({ error: 'Tutorial nicht gefunden' });
    db.run('DELETE FROM user_tutorial_progress WHERE tutorial_id = ?', [req.params.id]);
    db.run('DELETE FROM tutorials WHERE id = ?', [req.params.id]);
    res.json({ message: 'Tutorial gelöscht' });
  } catch (error) {
    console.error('Error deleting tutorial:', error);
    res.status(500).json({ error: 'Fehler beim Löschen des Tutorials' });
  }
});

// ── GET USER PROGRESS ──────────────────────────────────────────────────────
router.get('/tutorials/:id/progress', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const user = req.user!;
    const progress = db.get(
      'SELECT * FROM user_tutorial_progress WHERE tutorial_id = ? AND user_id = ?',
      [req.params.id, user.id]
    ) as any;
    if (!progress) return res.json({ completed: false, skipped: false, currentStep: 0 });
    res.json({
      id: progress.id,
      completed: progress.completed === 1,
      completedAt: progress.completed_at,
      skipped: progress.skipped === 1,
      currentStep: progress.current_step,
      createdAt: progress.created_at,
      updatedAt: progress.updated_at,
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ error: 'Fehler beim Laden des Fortschritts' });
  }
});

// ── UPDATE USER PROGRESS ───────────────────────────────────────────────────
router.post('/tutorials/:id/progress', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const user = req.user!;
    const { completed, skipped, currentStep } = req.body;
    const now = new Date().toISOString();

    const existing = db.get(
      'SELECT id FROM user_tutorial_progress WHERE tutorial_id = ? AND user_id = ?',
      [req.params.id, user.id]
    ) as any;

    if (existing) {
      db.run(
        `UPDATE user_tutorial_progress
         SET completed = ?, completed_at = ?, skipped = ?, current_step = ?, updated_at = ?
         WHERE tutorial_id = ? AND user_id = ?`,
        [completed ? 1 : 0, completed ? now : null, skipped ? 1 : 0, currentStep ?? 0, now,
         req.params.id, user.id]
      );
    } else {
      db.run(
        `INSERT INTO user_tutorial_progress
         (id, user_id, tutorial_id, completed, completed_at, skipped, current_step, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), user.id, req.params.id, completed ? 1 : 0, completed ? now : null,
         skipped ? 1 : 0, currentStep ?? 0, now, now]
      );
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ error: 'Fehler beim Speichern des Fortschritts' });
  }
});

// ── GET ALL TUTORIALS FOR ADMIN ────────────────────────────────────────────
router.get('/admin/tutorials', requireAuth, requireDeveloper as any, async (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const tutorials = db.all('SELECT * FROM tutorials ORDER BY created_at DESC', []) as any[];
    res.json(tutorials.map(parseTutorial));
  } catch (error) {
    console.error('Error fetching admin tutorials:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Tutorials' });
  }
});

// ── GET USER PROGRESS FOR A SPECIFIC TUTORIAL (ADMIN) ─────────────────────
router.get('/admin/tutorials/:id/progress', requireAuth, requireDeveloper as any, async (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const progress = db.all(
      `SELECT utp.*, u.username, u.display_name, u.role
       FROM user_tutorial_progress utp
       JOIN users u ON utp.user_id = u.id
       WHERE utp.tutorial_id = ?
       ORDER BY utp.updated_at DESC`,
      [req.params.id]
    ) as any[];
    res.json(progress.map(p => ({
      userId: p.user_id,
      username: p.username,
      displayName: p.display_name,
      role: p.role,
      completed: p.completed === 1,
      completedAt: p.completed_at,
      skipped: p.skipped === 1,
      currentStep: p.current_step,
      updatedAt: p.updated_at,
    })));
  } catch (error) {
    console.error('Error fetching tutorial progress:', error);
    res.status(500).json({ error: 'Fehler beim Laden des Fortschritts' });
  }
});

// ── RESET USER TUTORIAL PROGRESS (ADMIN) ──────────────────────────────────
router.post('/admin/tutorials/:id/reset/:userId', requireAuth, requireDeveloper as any, async (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    db.run(
      'DELETE FROM user_tutorial_progress WHERE tutorial_id = ? AND user_id = ?',
      [req.params.id, req.params.userId]
    );
    res.json({ message: 'Tutorial-Fortschritt zurückgesetzt' });
  } catch (error) {
    console.error('Error resetting tutorial progress:', error);
    res.status(500).json({ error: 'Fehler beim Zurücksetzen des Fortschritts' });
  }
});

// ── INITIALIZE TUTORIAL FOR USER (ADMIN) ──────────────────────────────────
router.post('/admin/tutorials/:id/initialize/:userId', requireAuth, requireDeveloper as any, async (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { id, userId } = req.params;
    const { theme } = req.body;

    db.run('DELETE FROM user_tutorial_progress WHERE tutorial_id = ? AND user_id = ?', [id, userId]);

    const progressId = uuidv4();
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO user_tutorial_progress (id, user_id, tutorial_id, completed, skipped, current_step, created_at, updated_at)
       VALUES (?, ?, ?, 0, 0, 0, ?, ?)`,
      [progressId, userId, id, now, now]
    );

    if (theme === 'light' || theme === 'dark') {
      try {
        const userRow = db.get('SELECT theme FROM users WHERE id = ?', [userId]) as any;
        let currentTheme: any = {};
        try { currentTheme = JSON.parse(userRow?.theme || '{}'); } catch {}
        db.run(`UPDATE users SET theme = ?, updated_at = datetime('now') WHERE id = ?`,
          [JSON.stringify({ ...currentTheme, mode: theme }), userId]);
      } catch {}
    }

    res.status(201).json({ message: 'Tutorial für Benutzer initialisiert', progressId });
  } catch (error) {
    console.error('Error initializing tutorial:', error);
    res.status(500).json({ error: 'Fehler beim Initialisieren des Tutorials' });
  }
});

export default router;
