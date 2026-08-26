import fs from 'node:fs';
import path from 'node:path';

const appRoot = path.resolve(import.meta.dirname, '..');
const pluginRoot = '/home/ubuntu/podcore-wordpress-licensing-plugin-v1.3.0/podcore-licensing';
const read = (file) => fs.readFileSync(file, 'utf8');
const checks = [];
const expect = (condition, message) => {
  checks.push({ condition, message });
  if (!condition) throw new Error(message);
};

const licenseRouter = read(path.join(appRoot, 'server/routers/license.ts'));
const authRouter = read(path.join(appRoot, 'server/routers/auth.ts'));
const tutorialRouter = read(path.join(appRoot, 'server/routers/tutorials.ts'));
const settingsPage = read(path.join(appRoot, 'client/src/pages/SettingsPage.tsx'));
const pluginStore = read(path.join(pluginRoot, 'includes/class-license-store.php'));
const pluginRest = read(path.join(pluginRoot, 'includes/class-rest-api.php'));
const pluginAdmin = read(path.join(pluginRoot, 'includes/class-admin.php'));

expect(licenseRouter.includes("router.post('/developer/activate'"), 'Die App-Aktivierung für Entwicklercodes fehlt.');
expect(licenseRouter.includes("router.post('/developer/validate'"), 'Die App-Validierung für Entwicklercodes fehlt.');
expect(licenseRouter.includes("router.post('/developer/deactivate'"), 'Die App-Deaktivierung für Entwicklercodes fehlt.');
expect(licenseRouter.includes("req.user?.role !== 'admin'"), 'Entwicklercodes sind nicht zusätzlich auf Administratoren begrenzt.');
expect(authRouter.includes('const newDeveloperMode = user.developer_mode === 1 ? 1 : 0;'), 'Der Profilendpunkt kann den Entwicklerstatus noch frei ändern.');
expect(tutorialRouter.includes('hasActiveDeveloperLicense()'), 'Tutorial-Entwickleraktionen prüfen keine gültige Entwicklerlizenz.');
expect(tutorialRouter.includes('ensureActiveDeveloperLicense()'), 'Tutorial-Entwickleraktionen prüfen den Widerrufsstatus nicht periodisch online.');
expect(licenseRouter.includes('DEVELOPER_REVALIDATE_AFTER_MS'), 'Entwicklerlizenzen haben keine begrenzte Widerrufsprüfung.');
expect(!settingsPage.includes('checked={profileForm.developerMode}'), 'Die alte Entwickler-Checkbox ist noch sichtbar.');
expect(settingsPage.includes('Entwickler-Lizenzcode'), 'Die versteckte Codeeingabe fehlt.');
expect(pluginStore.includes('TABLE_DEVELOPER_LICENSES'), 'Die Entwicklercode-Tabelle fehlt im WordPress-Plugin.');
expect(pluginStore.includes("return 'PC-DEV-'"), 'Der eindeutige Entwicklercode-Präfix fehlt.');
expect(pluginRest.includes("'/developer/activate'"), 'Der WordPress-Aktivierungsendpunkt fehlt.');
expect(pluginRest.includes('authenticate_developer_activation'), 'Der WordPress-Endpunkt schützt Aktivierungen nicht installationsbezogen.');
expect(pluginAdmin.includes('PodCore-Entwicklercodes'), 'Die WordPress-Verwaltungsseite für Entwicklercodes fehlt.');

console.log(`Entwicklerlizenz-Rauchtest erfolgreich: ${checks.length} Sicherheits- und Integrationsprüfungen bestanden.`);
