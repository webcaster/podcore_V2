#!/usr/bin/env node
/**
 * PodCore Versions-Setter
 * Setzt die Versionsnummer in ALLEN relevanten Dateien gleichzeitig.
 *
 * Verwendung:
 *   node scripts/set-version.mjs 2.15.8
 *
 * Aktualisierte Dateien:
 *  - /package.json
 *  - /client/package.json
 *  - /server/package.json
 *  - /client/index.html  (Title-Tag)
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const newVersion = process.argv[2];

if (!newVersion) {
  console.error('\n❌ Fehler: Keine Version angegeben.');
  console.error('   Verwendung: node scripts/set-version.mjs <VERSION>');
  console.error('   Beispiel:   node scripts/set-version.mjs 2.15.8\n');
  process.exit(1);
}

// Validiere Versions-Format (z.B. 2.15.8 oder 2.15.8-beta.1)
if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(newVersion)) {
  console.error(`\n❌ Ungültiges Versions-Format: "${newVersion}"`);
  console.error('   Erwartet: MAJOR.MINOR.PATCH (z.B. 2.15.8)\n');
  process.exit(1);
}

console.log(`\n🔄 Setze Version auf v${newVersion}...\n`);

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

function updateJsonVersion(filePath) {
  const content = JSON.parse(readFileSync(filePath, 'utf-8'));
  const oldVersion = content.version;
  content.version = newVersion;
  writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
  console.log(`  ✅  ${filePath.replace(root + '/', '')}  (${oldVersion} → ${newVersion})`);
}

function updateHtmlTitle(filePath) {
  let content = readFileSync(filePath, 'utf-8');
  const oldContent = content;
  // Ersetzt <title>PodCore vX.Y.Z</title> oder <title>PodCore X.Y.Z</title>
  content = content.replace(
    /<title>PodCore\s+v?[\d.]+(-[\w.]+)?<\/title>/,
    `<title>PodCore v${newVersion}</title>`
  );
  if (content === oldContent) {
    console.log(`  ⚠️   client/index.html  (kein Versions-Muster gefunden, manuell prüfen!)`);
  } else {
    writeFileSync(filePath, content);
    console.log(`  ✅  client/index.html  (Titel aktualisiert)`);
  }
}

// ─── Dateien aktualisieren ───────────────────────────────────────────────────

updateJsonVersion(resolve(root, 'package.json'));
updateJsonVersion(resolve(root, 'client/package.json'));
updateJsonVersion(resolve(root, 'server/package.json'));
updateHtmlTitle(resolve(root, 'client/index.html'));

console.log(`\n✅ Fertig! Alle Dateien auf v${newVersion} gesetzt.`);
console.log(`\n📋 Nächste Schritte:`);
console.log(`   1. cd client && pnpm build`);
console.log(`   2. cd server && npx tsc`);
console.log(`   3. git add -A && git commit -m "v${newVersion}: ..."`);
console.log(`   4. git push\n`);
