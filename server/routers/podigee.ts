import { Router, Response } from 'express';
import { getDb } from '../database';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth as any);

// ============================================================
// Podigee API Integration
// ============================================================

async function fetchPodigee(path: string, apiToken: string) {
  const url = `https://app.podigee.com/api/v1${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Token token="${apiToken}"`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Podigee API Fehler ${res.status}: ${text}`);
  }

  return res.json();
}

function getPodigeeConfig() {
  const db = getDb();
  const row = db.get('SELECT value FROM settings WHERE key = ?', ['app']) as any;
  if (!row) return null;
  const settings = JSON.parse(row.value);
  return settings?.podigee || null;
}

// GET /api/podigee/status — Check connection status
router.get('/status', (req: AuthRequest, res: Response) => {
  const config = getPodigeeConfig();
  if (!config?.apiToken || !config?.podcastSubdomain) {
    return res.json({ success: true, data: { connected: false, message: 'Podigee nicht konfiguriert' } });
  }
  return res.json({ success: true, data: { connected: true, subdomain: config.podcastSubdomain } });
});

// GET /api/podigee/podcast — Get podcast info
router.get('/podcast', requirePermission('canViewEpisodes') as any, async (req: AuthRequest, res: Response) => {
  const config = getPodigeeConfig();
  if (!config?.apiToken || !config?.podcastSubdomain) {
    return res.status(400).json({ success: false, error: 'Podigee nicht konfiguriert. Bitte API-Token und Subdomain in den Einstellungen hinterlegen.' });
  }

  try {
    // Get podcast list and find matching subdomain
    const podcasts = await fetchPodigee('/podcasts', config.apiToken);
    const podcast = Array.isArray(podcasts)
      ? podcasts.find((p: any) => p.subdomain === config.podcastSubdomain || p.id === config.podcastId)
      : podcasts;

    if (!podcast) {
      return res.status(404).json({ success: false, error: `Podcast "${config.podcastSubdomain}" nicht gefunden` });
    }

    return res.json({ success: true, data: podcast });
  } catch (err: any) {
    return res.status(502).json({ success: false, error: err.message });
  }
});

// GET /api/podigee/episodes — Get episodes from Podigee
router.get('/episodes', requirePermission('canViewEpisodes') as any, async (req: AuthRequest, res: Response) => {
  const config = getPodigeeConfig();
  if (!config?.apiToken || !config?.podcastId) {
    return res.status(400).json({ success: false, error: 'Podigee nicht konfiguriert' });
  }

  try {
    const episodes = await fetchPodigee(`/podcasts/${config.podcastId}/episodes`, config.apiToken);
    return res.json({ success: true, data: episodes });
  } catch (err: any) {
    return res.status(502).json({ success: false, error: err.message });
  }
});

// GET /api/podigee/stats/overview — Overall podcast statistics
router.get('/stats/overview', requirePermission('canViewEpisodes') as any, async (req: AuthRequest, res: Response) => {
  const config = getPodigeeConfig();
  if (!config?.apiToken || !config?.podcastId) {
    return res.status(400).json({ success: false, error: 'Podigee nicht konfiguriert' });
  }

  const { from, to } = req.query;

  try {
    const params = new URLSearchParams();
    if (from) params.set('from', from as string);
    if (to) params.set('to', to as string);

    const stats = await fetchPodigee(
      `/podcasts/${config.podcastId}/analytics/downloads?${params}`,
      config.apiToken
    );

    return res.json({ success: true, data: stats });
  } catch (err: any) {
    return res.status(502).json({ success: false, error: err.message });
  }
});

// GET /api/podigee/stats/episode/:episodeId — Per-episode statistics
router.get('/stats/episode/:episodeId', requirePermission('canViewEpisodes') as any, async (req: AuthRequest, res: Response) => {
  const config = getPodigeeConfig();
  if (!config?.apiToken) {
    return res.status(400).json({ success: false, error: 'Podigee nicht konfiguriert' });
  }

  const { from, to } = req.query;

  try {
    const params = new URLSearchParams();
    if (from) params.set('from', from as string);
    if (to) params.set('to', to as string);

    const stats = await fetchPodigee(
      `/episodes/${req.params.episodeId}/analytics/downloads?${params}`,
      config.apiToken
    );

    return res.json({ success: true, data: stats });
  } catch (err: any) {
    return res.status(502).json({ success: false, error: err.message });
  }
});

// GET /api/podigee/stats/top — Top episodes by downloads
router.get('/stats/top', requirePermission('canViewEpisodes') as any, async (req: AuthRequest, res: Response) => {
  const config = getPodigeeConfig();
  if (!config?.apiToken || !config?.podcastId) {
    return res.status(400).json({ success: false, error: 'Podigee nicht konfiguriert' });
  }

  const { from, to, limit = '10' } = req.query;

  try {
    const params = new URLSearchParams();
    if (from) params.set('from', from as string);
    if (to) params.set('to', to as string);
    params.set('limit', limit as string);

    const stats = await fetchPodigee(
      `/podcasts/${config.podcastId}/analytics/top_episodes?${params}`,
      config.apiToken
    );

    return res.json({ success: true, data: stats });
  } catch (err: any) {
    return res.status(502).json({ success: false, error: err.message });
  }
});

// GET /api/podigee/stats/clients — Listening clients/apps breakdown
router.get('/stats/clients', requirePermission('canViewEpisodes') as any, async (req: AuthRequest, res: Response) => {
  const config = getPodigeeConfig();
  if (!config?.apiToken || !config?.podcastId) {
    return res.status(400).json({ success: false, error: 'Podigee nicht konfiguriert' });
  }

  const { from, to } = req.query;

  try {
    const params = new URLSearchParams();
    if (from) params.set('from', from as string);
    if (to) params.set('to', to as string);

    const stats = await fetchPodigee(
      `/podcasts/${config.podcastId}/analytics/clients?${params}`,
      config.apiToken
    );

    return res.json({ success: true, data: stats });
  } catch (err: any) {
    return res.status(502).json({ success: false, error: err.message });
  }
});

// GET /api/podigee/stats/geo — Geographic distribution
router.get('/stats/geo', requirePermission('canViewEpisodes') as any, async (req: AuthRequest, res: Response) => {
  const config = getPodigeeConfig();
  if (!config?.apiToken || !config?.podcastId) {
    return res.status(400).json({ success: false, error: 'Podigee nicht konfiguriert' });
  }

  const { from, to } = req.query;

  try {
    const params = new URLSearchParams();
    if (from) params.set('from', from as string);
    if (to) params.set('to', to as string);

    const stats = await fetchPodigee(
      `/podcasts/${config.podcastId}/analytics/geo?${params}`,
      config.apiToken
    );

    return res.json({ success: true, data: stats });
  } catch (err: any) {
    return res.status(502).json({ success: false, error: err.message });
  }
});

// POST /api/podigee/test — Test connection with given credentials
router.post('/test', requirePermission('canManageSettings') as any, async (req: AuthRequest, res: Response) => {
  const { apiToken, podcastSubdomain } = req.body;

  if (!apiToken) {
    return res.status(400).json({ success: false, error: 'API-Token erforderlich' });
  }

  try {
    const podcasts = await fetchPodigee('/podcasts', apiToken);
    const list = Array.isArray(podcasts) ? podcasts : [podcasts];

    let podcastId: string | null = null;
    let podcastName: string | null = null;

    if (podcastSubdomain) {
      const found = list.find((p: any) => p.subdomain === podcastSubdomain);
      if (found) {
        podcastId = String(found.id);
        podcastName = found.title;
      }
    } else if (list.length > 0) {
      podcastId = String(list[0].id);
      podcastName = list[0].title;
    }

    return res.json({
      success: true,
      data: {
        connected: true,
        podcasts: list.map((p: any) => ({ id: p.id, title: p.title, subdomain: p.subdomain })),
        podcastId,
        podcastName,
      },
    });
  } catch (err: any) {
    return res.status(502).json({ success: false, error: err.message });
  }
});

export default router;
