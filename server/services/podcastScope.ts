import type { Request } from 'express';

const PODCAST_HEADER = 'x-podcore-podcast-id';

type PodcastSettings = { id?: string; active?: boolean };

function readSettings(db: any): any {
  try {
    const row = db.get('SELECT value FROM settings WHERE key = ?', ['app']) as any;
    return row?.value ? JSON.parse(row.value) : {};
  } catch { return {}; }
}

/**
 * Liefert den wirksamen Datenbereich. Ohne konfiguriertes Podcastprofil bleibt
 * der Einzelpodcastbetrieb rückwärtskompatibel und damit bewusst unbeschränkt.
 */
export function getPodcastScopeId(req: Request, db: any): string | null {
  const settings = readSettings(db);
  const podcasts = Array.isArray(settings?.podcasts) ? settings.podcasts as PodcastSettings[] : [];
  const requested = String(req.header(PODCAST_HEADER) || '').trim();
  const configured = String(settings?.activePodcastId || podcasts.find((podcast) => podcast?.active)?.id || '').trim();
  if (requested && podcasts.some((podcast) => podcast?.id === requested)) return requested;
  if (configured && podcasts.some((podcast) => podcast?.id === configured)) return configured;
  return null;
}

export function podcastScopeClause(column: string, podcastId: string | null): { sql: string; params: any[] } {
  return podcastId ? { sql: ` AND ${column} = ?`, params: [podcastId] } : { sql: '', params: [] };
}

/** Erstzuordnung historischer Einzelpodcast-Daten. Idempotent: bereits zugeordnete Daten bleiben unverändert. */
export function assignLegacyPodcastData(db: any, podcastId: string) {
  if (!podcastId) return;
  const tables = ['episodes', 'assets', 'media_folders', 'sponsors', 'ad_slots', 'ad_placements', 'episode_ad_bookings', 'sponsor_contracts', 'sponsor_offers'];
  for (const table of tables) {
    try { db.run(`UPDATE ${table} SET podcast_id = ? WHERE podcast_id IS NULL OR podcast_id = ''`, [podcastId]); } catch (_) {}
  }
}
