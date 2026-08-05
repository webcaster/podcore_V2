import express, { Request, Response, Router } from 'express';
import { getDb } from '../database';
import { v4 as uuidv4 } from 'uuid';

const router: Router = express.Router();

// ── TYPES ──────────────────────────────────────────────────────────────────
interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for highlighting
  position?: 'top' | 'bottom' | 'left' | 'right';
  image?: string; // Base64 or URL
  highlightColor?: string;
  allowSkip?: boolean;
  action?: string; // Optional action to perform
}

interface Tutorial {
  id: string;
  role: string;
  title: string;
  description: string;
  enabled: boolean;
  steps: TutorialStep[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ── MIDDLEWARE ─────────────────────────────────────────────────────────────
const requireAdmin = (req: Request, res: Response, next: Function) => {
  const user = (req as any).user;
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// ── GET ALL TUTORIALS ──────────────────────────────────────────────────────
router.get('/tutorials', async (req: Request, res: Response) => {
  try {
    const db = (req as any).db as any;
    const user = (req as any).user;

    // Get tutorials for user's role
    const tutorials = db.prepare(`
      SELECT * FROM tutorials 
      WHERE role = ? AND enabled = 1
      ORDER BY created_at ASC
    `).all(user?.role || 'editor') as any[];

    const formattedTutorials = tutorials.map(t => ({
      id: t.id,
      role: t.role,
      title: t.title,
      description: t.description,
      enabled: t.enabled === 1,
      steps: JSON.parse(t.steps),
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      createdBy: t.created_by,
    }));

    res.json(formattedTutorials);
  } catch (error) {
    console.error('Error fetching tutorials:', error);
    res.status(500).json({ error: 'Failed to fetch tutorials' });
  }
});

// ── GET TUTORIAL BY ID ─────────────────────────────────────────────────────
router.get('/tutorials/:id', async (req: Request, res: Response) => {
  try {
    const db = (req as any).db as any;
    const { id } = req.params;

    const tutorial = db.prepare(`
      SELECT * FROM tutorials WHERE id = ?
    `).get(id) as any;

    if (!tutorial) {
      return res.status(404).json({ error: 'Tutorial not found' });
    }

    res.json({
      id: tutorial.id,
      role: tutorial.role,
      title: tutorial.title,
      description: tutorial.description,
      enabled: tutorial.enabled === 1,
      steps: JSON.parse(tutorial.steps),
      createdAt: tutorial.created_at,
      updatedAt: tutorial.updated_at,
      createdBy: tutorial.created_by,
    });
  } catch (error) {
    console.error('Error fetching tutorial:', error);
    res.status(500).json({ error: 'Failed to fetch tutorial' });
  }
});

// ── CREATE TUTORIAL (ADMIN ONLY) ───────────────────────────────────────────
router.post('/tutorials', requireAdmin, async (req: Request, res: Response) => {
  try {
    const db = (req as any).db as any;
    const user = (req as any).user;
    const { role, title, description, steps, enabled = true } = req.body;

    if (!role || !title || !steps || !Array.isArray(steps)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO tutorials (id, role, title, description, enabled, steps, created_at, updated_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      role,
      title,
      description || '',
      enabled ? 1 : 0,
      JSON.stringify(steps),
      now,
      now,
      user.id
    );

    res.status(201).json({
      id,
      role,
      title,
      description,
      enabled,
      steps,
      createdAt: now,
      updatedAt: now,
      createdBy: user.id,
    });
  } catch (error) {
    console.error('Error creating tutorial:', error);
    res.status(500).json({ error: 'Failed to create tutorial' });
  }
});

// ── UPDATE TUTORIAL (ADMIN ONLY) ───────────────────────────────────────────
router.put('/tutorials/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const db = (req as any).db as any;
    const { id } = req.params;
    const { role, title, description, steps, enabled } = req.body;

    const tutorial = db.prepare('SELECT * FROM tutorials WHERE id = ?').get(id) as any;
    if (!tutorial) {
      return res.status(404).json({ error: 'Tutorial not found' });
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE tutorials 
      SET role = ?, title = ?, description = ?, steps = ?, enabled = ?, updated_at = ?
      WHERE id = ?
    `).run(
      role || tutorial.role,
      title || tutorial.title,
      description !== undefined ? description : tutorial.description,
      steps ? JSON.stringify(steps) : tutorial.steps,
      enabled !== undefined ? (enabled ? 1 : 0) : tutorial.enabled,
      now,
      id
    );

    res.json({
      id,
      role: role || tutorial.role,
      title: title || tutorial.title,
      description: description !== undefined ? description : tutorial.description,
      enabled: enabled !== undefined ? enabled : tutorial.enabled === 1,
      steps: steps || JSON.parse(tutorial.steps),
      createdAt: tutorial.created_at,
      updatedAt: now,
      createdBy: tutorial.created_by,
    });
  } catch (error) {
    console.error('Error updating tutorial:', error);
    res.status(500).json({ error: 'Failed to update tutorial' });
  }
});

// ── DELETE TUTORIAL (ADMIN ONLY) ───────────────────────────────────────────
router.delete('/tutorials/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const db = (req as any).db as any;
    const { id } = req.params;

    const tutorial = db.prepare('SELECT * FROM tutorials WHERE id = ?').get(id) as any;
    if (!tutorial) {
      return res.status(404).json({ error: 'Tutorial not found' });
    }

    // Delete tutorial and all progress records
    db.prepare('DELETE FROM user_tutorial_progress WHERE tutorial_id = ?').run(id);
    db.prepare('DELETE FROM tutorials WHERE id = ?').run(id);

    res.json({ message: 'Tutorial deleted successfully' });
  } catch (error) {
    console.error('Error deleting tutorial:', error);
    res.status(500).json({ error: 'Failed to delete tutorial' });
  }
});

// ── GET USER TUTORIAL PROGRESS ─────────────────────────────────────────────
router.get('/tutorials/:id/progress', async (req: Request, res: Response) => {
  try {
    const db = (req as any).db as any;
    const user = (req as any).user;
    const { id } = req.params;

    const progress = db.prepare(`
      SELECT * FROM user_tutorial_progress 
      WHERE tutorial_id = ? AND user_id = ?
    `).get(id, user.id) as any;

    if (!progress) {
      return res.json({
        completed: false,
        skipped: false,
        currentStep: 0,
      });
    }

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
    console.error('Error fetching tutorial progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// ── UPDATE TUTORIAL PROGRESS ───────────────────────────────────────────────
router.post('/tutorials/:id/progress', async (req: Request, res: Response) => {
  try {
    const db = (req as any).db as any;
    const user = (req as any).user;
    const { id } = req.params;
    const { completed, skipped, currentStep } = req.body;

    let progress = db.prepare(`
      SELECT * FROM user_tutorial_progress 
      WHERE tutorial_id = ? AND user_id = ?
    `).get(id, user.id) as any;

    const now = new Date().toISOString();

    if (!progress) {
      const progressId = uuidv4();
      db.prepare(`
        INSERT INTO user_tutorial_progress 
        (id, user_id, tutorial_id, completed, completed_at, skipped, current_step, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        progressId,
        user.id,
        id,
        completed ? 1 : 0,
        completed ? now : null,
        skipped ? 1 : 0,
        currentStep || 0,
        now,
        now
      );

      return res.status(201).json({
        id: progressId,
        completed: completed || false,
        completedAt: completed ? now : null,
        skipped: skipped || false,
        currentStep: currentStep || 0,
      });
    }

    db.prepare(`
      UPDATE user_tutorial_progress 
      SET completed = ?, completed_at = ?, skipped = ?, current_step = ?, updated_at = ?
      WHERE tutorial_id = ? AND user_id = ?
    `).run(
      completed ? 1 : 0,
      completed ? now : progress.completed_at,
      skipped ? 1 : 0,
      currentStep || progress.current_step,
      now,
      id,
      user.id
    );

    res.json({
      id: progress.id,
      completed: completed || progress.completed === 1,
      completedAt: completed ? now : progress.completed_at,
      skipped: skipped || progress.skipped === 1,
      currentStep: currentStep || progress.current_step,
    });
  } catch (error) {
    console.error('Error updating tutorial progress:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// ── GET ALL TUTORIALS FOR ADMIN ────────────────────────────────────────────
router.get('/admin/tutorials', requireAdmin, async (req: Request, res: Response) => {
  try {
    const db = (req as any).db as any;

    const tutorials = db.prepare(`
      SELECT * FROM tutorials 
      ORDER BY role ASC, created_at DESC
    `).all() as any[];

    const formattedTutorials = tutorials.map(t => ({
      id: t.id,
      role: t.role,
      title: t.title,
      description: t.description,
      enabled: t.enabled === 1,
      steps: JSON.parse(t.steps),
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      createdBy: t.created_by,
    }));

    res.json(formattedTutorials);
  } catch (error) {
    console.error('Error fetching admin tutorials:', error);
    res.status(500).json({ error: 'Failed to fetch tutorials' });
  }
});

// ── RESET USER TUTORIAL PROGRESS (ADMIN ONLY) ──────────────────────────────
router.post('/admin/tutorials/:id/reset/:userId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const db = (req as any).db as any;
    const { id, userId } = req.params;

    db.prepare(`
      DELETE FROM user_tutorial_progress 
      WHERE tutorial_id = ? AND user_id = ?
    `).run(id, userId);

    res.json({ message: 'Tutorial progress reset successfully' });
  } catch (error) {
    console.error('Error resetting tutorial progress:', error);
    res.status(500).json({ error: 'Failed to reset progress' });
  }
});

// ── INITIALIZE TUTORIAL FOR USER (ADMIN ONLY) ──────────────────────────────
router.post('/admin/tutorials/:id/initialize/:userId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const db = (req as any).db as any;
    const { id, userId } = req.params;

    // Delete existing progress
    db.prepare(`
      DELETE FROM user_tutorial_progress 
      WHERE tutorial_id = ? AND user_id = ?
    `).run(id, userId);

    // Create new progress entry
    const progressId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO user_tutorial_progress 
      (id, user_id, tutorial_id, completed, skipped, current_step, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      progressId,
      userId,
      id,
      0,
      0,
      0,
      now,
      now
    );

    res.status(201).json({
      message: 'Tutorial initialized for user',
      progressId,
    });
  } catch (error) {
    console.error('Error initializing tutorial:', error);
    res.status(500).json({ error: 'Failed to initialize tutorial' });
  }
});

export default router;
