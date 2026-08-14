import express, { Response, Router } from 'express';
import crypto from 'crypto';
import { getDb } from '../database';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';

const router: Router = express.Router();
const DEFAULT_CLOUD_URL = 'https://podcore.de/wp-json/app-tutorials/v1';
const MAX_TUTORIALS_PER_SYNC = 100;

interface TutorialCloudSettings {
  enabled: boolean;
  baseUrl: string;
  autoSync: boolean;
  lastSyncAt: string | null;
  lastSyncCount: number;
  lastError: string | null;
}

function readAppSettings(): Record<string, any> {
  const db = getDb();
  const row = db.get('SELECT value FROM settings WHERE key = ?', ['app']) as any;
  try {
    return row?.value ? JSON.parse(row.value) : {};
  } catch {
    return {};
  }
}

function readCloudSettings(): TutorialCloudSettings {
  const current = readAppSettings().tutorialCloud || {};
  return {
    enabled: current.enabled === true,
    baseUrl: normalizeBaseUrl(current.baseUrl || DEFAULT_CLOUD_URL),
    autoSync: current.autoSync === true,
    lastSyncAt: typeof current.lastSyncAt === 'string' ? current.lastSyncAt : null,
    lastSyncCount: Number.isFinite(Number(current.lastSyncCount)) ? Number(current.lastSyncCount) : 0,
    lastError: typeof current.lastError === 'string' ? current.lastError : null,
  };
}

function writeCloudSettings(nextCloud: TutorialCloudSettings): void {
  const db = getDb();
  const current = readAppSettings();
  const next = { ...current, tutorialCloud: nextCloud };
  db.run(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    ['app', JSON.stringify(next)]
  );
}

function normalizeBaseUrl(value: string): string {
  const candidate = String(value || '').trim();
  if (!candidate) return DEFAULT_CLOUD_URL;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
      return DEFAULT_CLOUD_URL;
    }
    return candidate.replace(/\/+$/, '');
  } catch {
    return DEFAULT_CLOUD_URL;
  }
}

function stableTutorialId(slug: string): string {
  return `cloud-${crypto.createHash('sha256').update(`podcore.de:${slug}`).digest('hex').slice(0, 32)}`;
}

function extractItems(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.tutorials)) return payload.tutorials;
  return [];
}

function sanitizeSteps(steps: any): any[] {
  if (!Array.isArray(steps)) return [];
  return steps.slice(0, 200).map((step: any, index: number) => ({
    id: String(step?.id || `cloud-step-${index + 1}`),
    title: String(step?.title || step?.name || `Schritt ${index + 1}`).slice(0, 300),
    description: String(step?.description || step?.content || '').slice(0, 20000),
    target: step?.target ? String(step.target).slice(0, 500) : undefined,
    position: ['top', 'bottom', 'left', 'right'].includes(step?.position) ? step.position : undefined,
    image: step?.image ? String(step.image).slice(0, 2000000) : undefined,
    annotations: Array.isArray(step?.annotations) ? step.annotations.slice(0, 100) : [],
    highlightColor: step?.highlightColor ? String(step.highlightColor).slice(0, 30) : undefined,
    allowSkip: step?.allowSkip !== false,
    action: step?.action ? String(step.action).slice(0, 500) : undefined,
  }));
}

async function fetchCatalog(baseUrl: string): Promise<any[]> {
  const url = `${normalizeBaseUrl(baseUrl)}/tutorials?per_page=${MAX_TUTORIALS_PER_SYNC}`;
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'PodCore-Tutorial-Cloud/1.0' },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`WordPress antwortete mit HTTP ${response.status}`);
  const payload = await response.json();
  return extractItems(payload).filter((item: any) => item && (item.slug || item.id));
}

function upsertCloudTutorial(item: any, actorId: string): void {
  const db = getDb();
  const slug = String(item.slug || item.id || '').trim().toLowerCase();
  const title = String(item.title || item.name || slug || 'Cloud-Tutorial').trim().slice(0, 300);
  const description = String(item.description || '').slice(0, 20000);
  const steps = sanitizeSteps(item.steps);
  const roles = Array.isArray(item.roles) && item.roles.length > 0 ? item.roles.map((role: any) => String(role)) : ['*'];
  const id = stableTutorialId(slug);
  const now = new Date().toISOString();
  const sourceUrl = String(item.source || item.downloadUrl || '').slice(0, 2000);
  const cloudUpdatedAt = String(item.updatedAt || now).slice(0, 100);
  const existing = db.get('SELECT id FROM tutorials WHERE id = ?', [id]) as any;

  if (existing) {
    db.run(
      `UPDATE tutorials SET role = ?, roles = ?, title = ?, description = ?, enabled = 1,
       steps = ?, updated_at = ?, source = ?, source_url = ?, cloud_updated_at = ? WHERE id = ?`,
      [roles[0], JSON.stringify(roles), title, description, JSON.stringify(steps), now, 'wordpress', sourceUrl, cloudUpdatedAt, id]
    );
    return;
  }

  db.run(
    `INSERT INTO tutorials (id, role, roles, title, description, enabled, steps, created_at, updated_at, created_by,
       source, source_url, cloud_updated_at)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)`,
    [id, roles[0], JSON.stringify(roles), title, description, JSON.stringify(steps), now, now, actorId, 'wordpress', sourceUrl, cloudUpdatedAt]
  );
}

function ensureCloudColumns(): void {
  try {
    const db = getDb();
    const columns = (db.all('PRAGMA table_info(tutorials)', []) as any[]).map((column: any) => column.name);
    if (!columns.includes('source')) db.run("ALTER TABLE tutorials ADD COLUMN source TEXT DEFAULT 'local'");
    if (!columns.includes('source_url')) db.run('ALTER TABLE tutorials ADD COLUMN source_url TEXT');
    if (!columns.includes('cloud_updated_at')) db.run('ALTER TABLE tutorials ADD COLUMN cloud_updated_at TEXT');
  } catch (error) {
    console.warn('[tutorial-cloud] Migration warning:', error);
  }
}

ensureCloudColumns();

router.get('/status', requireAuth, (req: AuthRequest, res: Response) => {
  const settings = readCloudSettings();
  res.json({
    success: true,
    data: {
      enabled: settings.enabled,
      baseUrl: settings.baseUrl,
      autoSync: settings.autoSync,
      lastSyncAt: settings.lastSyncAt,
      lastSyncCount: settings.lastSyncCount,
      lastError: settings.lastError,
    },
  });
});

router.put('/config', requireAuth, requirePermission('canManageTutorials') as any, (req: AuthRequest, res: Response) => {
  const previous = readCloudSettings();
  const baseUrl = normalizeBaseUrl(String(req.body?.baseUrl || previous.baseUrl));
  const next: TutorialCloudSettings = {
    ...previous,
    enabled: req.body?.enabled === true,
    autoSync: req.body?.autoSync === true,
    baseUrl,
    lastError: null,
  };
  writeCloudSettings(next);
  res.json({ success: true, data: { ...next } });
});

router.get('/catalog', requireAuth, async (_req: AuthRequest, res: Response) => {
  const settings = readCloudSettings();
  if (!settings.enabled) return res.status(409).json({ success: false, error: 'Tutorial-Cloud ist nicht aktiviert' });
  try {
    const items = await fetchCatalog(settings.baseUrl);
    res.json({ success: true, data: { items, source: settings.baseUrl, fetchedAt: new Date().toISOString() } });
  } catch (error: any) {
    res.status(502).json({ success: false, error: error?.message || 'Tutorial-Cloud nicht erreichbar' });
  }
});

router.post('/sync', requireAuth, requirePermission('canManageTutorials') as any, async (req: AuthRequest, res: Response) => {
  const settings = readCloudSettings();
  if (!settings.enabled) return res.status(409).json({ success: false, error: 'Tutorial-Cloud ist nicht aktiviert' });
  try {
    const items = await fetchCatalog(settings.baseUrl);
    for (const item of items) upsertCloudTutorial(item, req.user!.id);
    const next = { ...settings, lastSyncAt: new Date().toISOString(), lastSyncCount: items.length, lastError: null };
    writeCloudSettings(next);
    res.json({ success: true, data: { imported: items.length, syncedAt: next.lastSyncAt } });
  } catch (error: any) {
    const next = { ...settings, lastError: error?.message || 'Synchronisierung fehlgeschlagen' };
    writeCloudSettings(next);
    res.status(502).json({ success: false, error: next.lastError });
  }
});

export default router;
