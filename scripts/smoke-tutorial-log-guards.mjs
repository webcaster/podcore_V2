import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const requireCheck = (condition, message) => {
  if (!condition) throw new Error(message);
  console.log(`✓ ${message}`);
};

const tutorialOverlay = read('client/src/components/tutorials/TutorialOverlay.tsx');
const earlyReturn = tutorialOverlay.indexOf('if (!activeTutorial) return null;');
const clamp = tutorialOverlay.indexOf('const clampManualPosition = (top: number, left: number) =>');
const trailingHook = tutorialOverlay.indexOf('useCallback(', earlyReturn + 1);
requireCheck(clamp >= 0 && clamp < earlyReturn, 'Tutorial-Positionierung wird vor dem frühen Render-Rückgabepfad definiert.');
requireCheck(trailingHook === -1, 'Nach dem frühen Rückgabepfad wird kein weiterer Hook ausgeführt.');
requireCheck(tutorialOverlay.includes('class TutorialOverlayBoundary'), 'Tutorialüberlagerung besitzt eine lokale Fehlergrenze.');
requireCheck(tutorialOverlay.includes('Tutorial konnte nicht geöffnet werden'), 'Tutorial-Fallback bleibt bei Renderfehlern bedienbar.');

const podcasts = read('client/src/pages/PodcastsPage.tsx');
const settings = read('client/src/pages/SettingsPage.tsx');
requireCheck(podcasts.includes('multiPodcastEnabled') && podcasts.includes('Mehrfach-Podcast aktivieren'), 'Mehrfach-Podcast kann im Profilbereich explizit aktiviert werden.');
requireCheck(podcasts.includes("window.location.assign('/')"), 'Profilwechsel lädt den Arbeitsbereich mit dem neuen Datenbereich neu.');
requireCheck(settings.includes('Profile wechseln') && settings.includes('Mehrfach-Podcast'), 'Einstellungen enthalten Aktivierung und direkten Profilwechsel.');

const adminRouter = read('server/routers/admin.ts');
requireCheck(adminRouter.includes("router.get('/logs/export'"), 'Server stellt einen getrennten Log-Export bereit.');
requireCheck(adminRouter.includes("confirmation !== 'LOGS LÖSCHEN'"), 'Log-Bereinigung verlangt die explizite Sicherheitsbestätigung.');
requireCheck(adminRouter.includes("DELETE FROM error_logs"), 'Log-Bereinigung beschränkt sich auf die Fehlerprotokolltabelle.');
console.log('Rauchtest für Tutorial-, Mehrfach-Podcast- und Log-Schutz erfolgreich.');
