import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const requireText = (source, expected, label) => {
  if (!source.includes(expected)) throw new Error(`${label}: erwarteter Bestandteil fehlt (${expected})`);
};

const panel = read('client/src/components/media/AudioQualityControlPanel.tsx');
const mediaPage = read('client/src/pages/MediaLibraryPage.tsx');
const mediaRouter = read('server/routers/media.ts');
const database = read('server/database.ts');
const api = read('client/src/lib/api.ts');

requireText(panel, "episodeWorkflowApi.linkMedia(next.episodeId, asset.id, 'master')", 'Episodenverknüpfung');
requireText(panel, 'mediaApi.saveAudioQuality(asset.id, next)', 'Asset-Speicherweg');
requireText(panel, "const QUALITY_KEY = 'podcore_audio_quality_v1'", 'Qualitätsmetadaten-Schlüssel');
requireText(mediaPage, "can('canReviewAudioQuality')", 'Client-Rechteprüfung');
requireText(mediaRouter, "router.put('/:id/audio-quality', requirePermission('canReviewAudioQuality')", 'Server-Rechteprüfung');
requireText(mediaRouter, "const AUDIO_QUALITY_KEY = 'podcore_audio_quality_v1'", 'Server-Metadaten-Schlüssel');
requireText(api, 'saveAudioQuality:', 'Client-API');
requireText(database, 'canReviewAudioQuality: false', 'Standardrechtekatalog');
requireText(database, 'canReviewAudioQuality: true', 'Standardrollen für Audio-Abnahme');

console.log(JSON.stringify({ status: 'ok', checks: ['asset quality persistence', 'episode master link', 'client guard', 'server guard', 'default role propagation'] }, null, 2));
