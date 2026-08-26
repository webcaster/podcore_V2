import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const collect = (text, regex) => new Set([...text.matchAll(regex)].map((match) => match[1]));

const database = read('server/database.ts');
const adminPage = read('client/src/pages/AdminPage.tsx');
const sourceFiles = [...walk(path.join(root, 'client/src')), ...walk(path.join(root, 'server'))].filter((file) => /\.(tsx?|mjs)$/.test(file));
const source = sourceFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');

const defaults = collect(database, /\b(can[A-Z][A-Za-z0-9]+):\s*(?:true|false)/g);
const adminCatalog = collect(adminPage, /key:\s*'(can[A-Z][A-Za-z0-9]+)'/g);
const clientUsage = collect(source, /can\('(can[A-Z][A-Za-z0-9]+)'\)/g);
const serverUsage = collect(source, /requirePermission\('(can[A-Z][A-Za-z0-9]+)'\)/g);
const used = new Set([...clientUsage, ...serverUsage]);
const missingDefaults = [...used].filter((key) => !defaults.has(key));
const missingAdminControls = [...used].filter((key) => !adminCatalog.has(key));

if (missingDefaults.length || missingAdminControls.length) {
  console.error(JSON.stringify({ missingDefaults, missingAdminControls }, null, 2));
  process.exit(1);
}

for (const role of ['redakteur', 'moderator', 'produktion']) {
  const start = database.indexOf(`case '${role}':`);
  if (start < 0) throw new Error(`Standardrolle ${role} fehlt`);
}

console.log(JSON.stringify({ status: 'ok', defaultPermissionCount: defaults.size, clientUsageCount: clientUsage.size, serverUsageCount: serverUsage.size, audioQualityPermission: defaults.has('canReviewAudioQuality') && adminCatalog.has('canReviewAudioQuality') }, null, 2));
