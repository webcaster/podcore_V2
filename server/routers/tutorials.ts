import express, { Response, Router } from 'express';
import { getDb } from '../database';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';

const router: Router = express.Router();

// ── TYPES ──────────────────────────────────────────────────────────────────
interface AnnotationPoint {
  id: string;
  x: number;
  y: number;
  label: string;
  description: string;
  type?: 'point' | 'circle' | 'symbol';
  symbol?: string;
  color?: string;
  size?: number;
}

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target?: string;
  route?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  image?: string;
  annotations?: AnnotationPoint[];
  highlightColor?: string;
  allowSkip?: boolean;
  action?: string;
  interaction?: 'guide' | 'click' | 'confirm';
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

function extractImportedTutorials(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.tutorials)) return payload.tutorials;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return payload && typeof payload === 'object' ? [payload] : [];
}

function normalizeImportedRoles(value: any): string[] {
  const raw = Array.isArray(value) ? value : (value ? [value] : []);
  const roles = raw
    .map(role => String(role).trim().slice(0, 100))
    .filter(Boolean)
    .slice(0, 30);
  return roles.length > 0 ? roles : ['*'];
}

async function cacheImportedImage(value: unknown): Promise<string | undefined> {
  if (typeof value !== 'string' || !value) return undefined;
  if (value.startsWith('data:image/')) return value.slice(0, 2_000_000);
  let parsed: URL;
  try { parsed = new URL(value); } catch { return undefined; }
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) return undefined;
  try {
    const response = await fetch(parsed, { signal: AbortSignal.timeout(7000) });
    if (!response.ok) return undefined;
    const length = Number(response.headers.get('content-length') || 0);
    if (length > 2_000_000) return undefined;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 2_000_000) return undefined;
    const contentType = response.headers.get('content-type') || 'image/png';
    if (!contentType.toLowerCase().startsWith('image/')) return undefined;
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.warn('[tutorial-import] Bild konnte nicht lokal gespeichert werden:', error);
    return undefined;
  }
}

function normalizeImportedAnnotations(value: any): AnnotationPoint[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 100).flatMap((raw, index) => {
    if (!raw || typeof raw !== 'object') return [];
    const x = Number(raw.x);
    const y = Number(raw.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return [];
    const type = ['point', 'circle', 'symbol'].includes(raw.type) ? raw.type : 'point';
    const color = typeof raw.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(raw.color) ? raw.color : undefined;
    const size = Number(raw.size);
    const symbol = typeof raw.symbol === 'string' ? Array.from(raw.symbol).slice(0, 2).join('') : undefined;
    return [{
      id: String(raw.id || `annotation-${index + 1}`).slice(0, 120),
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
      label: String(raw.label || (type === 'circle' ? '' : index + 1)).slice(0, 32),
      description: String(raw.description || '').slice(0, 2_000),
      type,
      symbol: type === 'symbol' ? symbol : undefined,
      color,
      size: type === 'circle' && Number.isFinite(size) ? Math.max(4, Math.min(30, size)) : undefined,
    }];
  });
}

async function cacheImportedSteps(value: any): Promise<TutorialStep[]> {
  if (!Array.isArray(value)) return [];
  const result: TutorialStep[] = [];
  for (const [index, raw] of value.slice(0, 200).entries()) {
    if (!raw || typeof raw !== 'object') continue;
    const image = await cacheImportedImage(raw.image || raw.imageUrl || raw.screenshotUrl || raw.screenshot || raw.imageData);
    result.push({
      id: String(raw.id || `imported-step-${index + 1}`).slice(0, 120),
      title: String(raw.title || raw.name || `Schritt ${index + 1}`).slice(0, 300),
      description: String(raw.description || raw.content || raw.text || '').slice(0, 20_000),
      target: raw.target ? String(raw.target).slice(0, 500) : undefined,
      route: typeof raw.route === 'string' && raw.route.startsWith('/') ? raw.route.slice(0, 500) : undefined,
      position: ['top', 'bottom', 'left', 'right'].includes(raw.position) ? raw.position : undefined,
      image,
      annotations: normalizeImportedAnnotations(raw.annotations),
      highlightColor: raw.highlightColor ? String(raw.highlightColor).slice(0, 30) : undefined,
      allowSkip: raw.allowSkip !== false,
      action: raw.action ? String(raw.action).slice(0, 500) : undefined,
      interaction: ['guide', 'click', 'confirm'].includes(raw.interaction) ? raw.interaction : undefined,
    });
  }
  return result;
}

// ── GET TUTORIALS FOR CURRENT USER ────────────────────────────────────────
router.get('/tutorials', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const user = req.user!;
    const all = db.all('SELECT * FROM tutorials WHERE enabled = 1 ORDER BY created_at ASC', []) as any[];
    const filtered = all.filter(t => {
      try {
        const roles = JSON.parse(t.roles || `["${t.role}"]`);
        return Array.isArray(roles) ? (roles.includes('*') || roles.includes(user.role)) : roles === user.role;
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

// ── ENDNUTZER-IMPORT (BERECHTIGUNG CANIMPORTTUTORIALS) ─────────────────────
// Importierte Website-Tutorials werden als lokale Kopie gespeichert. Externe
// Screenshots werden beim Import in Data-URLs umgewandelt und funktionieren
// danach ohne Internetzugriff weiter.
async function persistImportedTutorials(payload: any, userId: string) {
  const db = getDb();
  const items = extractImportedTutorials(payload).slice(0, 50);
  if (items.length === 0) throw new Error('Keine gültigen Tutorials gefunden');

  const imported: any[] = [];
  const skipped: Array<{ title: string; reason: string }> = [];
  for (const item of items) {
    const title = String(item?.title || item?.name || '').trim().slice(0, 300);
    const steps = await cacheImportedSteps(item?.steps);
    if (!title || steps.length === 0) {
      skipped.push({ title: title || 'Ohne Titel', reason: 'Titel oder steps-Array fehlt' });
      continue;
    }
    const roles = normalizeImportedRoles(item?.roles || item?.role);
    const id = uuidv4();
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO tutorials (id, role, roles, title, description, enabled, steps, created_at, updated_at, created_by)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
      [id, roles[0], JSON.stringify(roles), title, String(item?.description || '').slice(0, 20_000), JSON.stringify(steps), now, now, userId]
    );
    const created = db.get('SELECT * FROM tutorials WHERE id = ?', [id]) as any;
    imported.push(parseTutorial(created));
  }
  return { imported, count: imported.length, skipped, offlineReady: true };
}

router.post('/tutorials/import', requireAuth, requirePermission('canImportTutorials') as any, async (req: AuthRequest, res: Response) => {
  try {
    const result = await persistImportedTutorials(req.body, req.user!.id);
    res.status(result.count > 0 ? 201 : 422).json({ success: result.count > 0, data: result });
  } catch (error: any) {
    const status = error?.message === 'Keine gültigen Tutorials gefunden' ? 400 : 500;
    if (status === 500) console.error('Error importing tutorials:', error);
    res.status(status).json({ success: false, error: error?.message || 'Fehler beim Importieren der Tutorials' });
  }
});

router.post('/tutorials/import-url', requireAuth, requirePermission('canImportTutorials') as any, async (req: AuthRequest, res: Response) => {
  try {
    const rawUrl = String(req.body?.url || '').trim();
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) {
      return res.status(400).json({ success: false, error: 'Nur HTTPS-Webseiten oder lokale Testadressen sind erlaubt' });
    }
    const response = await fetch(parsed, {
      headers: { Accept: 'application/json', 'User-Agent': 'PodCore-Tutorial-Importer/1.0' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return res.status(502).json({ success: false, error: `Webseite antwortete mit HTTP ${response.status}` });
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > 50_000_000) return res.status(413).json({ success: false, error: 'Tutorial-Datei ist zu groß' });
    const payload = await response.json();
    const result = await persistImportedTutorials(payload, req.user!.id);
    res.status(result.count > 0 ? 201 : 422).json({ success: result.count > 0, sourceUrl: parsed.toString(), ...result });
  } catch (error: any) {
    const status = error?.name === 'TypeError' || error?.name === 'SyntaxError' ? 400 : 502;
    console.error('Error importing tutorial URL:', error);
    res.status(status).json({ success: false, error: 'Tutorial-Webseite konnte nicht als gültiges JSON geladen werden' });
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
    const { completed, skipped, currentStep } = req.body || {};
    const now = new Date().toISOString();

    const tutorial = db.get('SELECT id FROM tutorials WHERE id = ?', [req.params.id]) as any;
    if (!tutorial) return res.status(404).json({ error: 'Tutorial nicht gefunden' });

    const existing = db.get(
      'SELECT id FROM user_tutorial_progress WHERE tutorial_id = ? AND user_id = ?',
      [req.params.id, user.id]
    ) as any;

    const previous = existing
      ? db.get('SELECT completed, skipped, current_step FROM user_tutorial_progress WHERE id = ?', [existing.id]) as any
      : null;
    const nextCompleted = typeof completed === 'boolean' ? completed : previous?.completed === 1;
    const nextSkipped = nextCompleted ? false : (typeof skipped === 'boolean' ? skipped : previous?.skipped === 1);
    const nextStep = Number.isFinite(Number(currentStep)) ? Math.max(0, Math.floor(Number(currentStep))) : (previous?.current_step || 0);

    if (existing) {
      db.run(
        `UPDATE user_tutorial_progress
         SET completed = ?, completed_at = ?, skipped = ?, current_step = ?, updated_at = ?
         WHERE tutorial_id = ? AND user_id = ?`,
        [nextCompleted ? 1 : 0, nextCompleted ? now : null, nextSkipped ? 1 : 0, nextStep, now,
         req.params.id, user.id]
      );
    } else {
      db.run(
        `INSERT INTO user_tutorial_progress
         (id, user_id, tutorial_id, completed, completed_at, skipped, current_step, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), user.id, req.params.id, nextCompleted ? 1 : 0, nextCompleted ? now : null,
         nextSkipped ? 1 : 0, nextStep, now, now]
      );
    }
    res.json({ success: true, data: { completed: nextCompleted, completedAt: nextCompleted ? now : null, skipped: nextSkipped, currentStep: nextStep } });
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
