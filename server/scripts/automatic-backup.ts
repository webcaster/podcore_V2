import { runAutomaticBackup } from '../routers/backup';

void (async () => {
  try {
    const result = await runAutomaticBackup({ force: true, source: 'system' });
    if (result.created) {
      console.log(`[PodCore] Systembackup erstellt: ${result.filename}`);
      process.exit(0);
    }
    console.log(`[PodCore] Systembackup übersprungen: ${result.reason}`);
    process.exit(0);
  } catch (error: any) {
    console.error(`[PodCore] Systembackup fehlgeschlagen: ${error?.message || String(error)}`);
    process.exit(1);
  }
})();
