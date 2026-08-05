#!/usr/bin/env node
/**
 * PodCore Version-Check
 * Prüft vor dem Build, dass alle Versionsnummern übereinstimmen.
 * Wird automatisch vor `pnpm build` ausgeführt.
 *
 * Geprüfte Dateien:
 *  - /package.json          (Root – Single Source of Truth)
 *  - /client/package.json
 *  - /server/package.json
 *  - /client/index.html     (Title-Tag)
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ─── Lese alle Versionen ─────────────────────────────────────────────────────

const rootPkg   = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));
const clientPkg = JSON.parse(readFileSync(resolve(root, 'client/package.json'), 'utf-8'));
const serverPkg = JSON.parse(readFileSync(resolve(root, 'server/package.json'), 'utf-8'));
const indexHtml = readFileSync(resolve(root, 'client/index.html'), 'utf-8');

const rootVersion   = rootPkg.version;
const clientVersion = clientPkg.version;
const serverVersion = serverPkg.version;

// Extrahiere Version aus <title>PodCore vX.Y.Z</title>
const titleMatch = indexHtml.match(/<title>PodCore\s+v?([\d.]+)<\/title>/);
const htmlVersion = titleMatch ? titleMatch[1] : null;

// ─── Vergleich ───────────────────────────────────────────────────────────────

const versions = {
  'package.json (Root)':   rootVersion,
  'client/package.json':   clientVersion,
  'server/package.json':   serverVersion,
  'client/index.html':     htmlVersion || '(nicht gefunden)',
};

console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║         PodCore Versions-Check                   ║');
console.log('╚══════════════════════════════════════════════════╝\n');

let hasError = false;

for (const [file, version] of Object.entries(versions)) {
  const ok = version === rootVersion;
  const icon = ok ? '✅' : '❌';
  console.log(`  ${icon}  ${file.padEnd(30)} → v${version}`);
  if (!ok) hasError = true;
}

console.log('');

if (hasError) {
  console.error('╔══════════════════════════════════════════════════╗');
  console.error('║  FEHLER: Versionsnummern stimmen nicht überein!  ║');
  console.error(`║  Erwartete Version: v${rootVersion.padEnd(28)}║`);
  console.error('║                                                  ║');
  console.error('║  Lösung: Führe folgendes aus:                    ║');
  console.error('║    node scripts/set-version.mjs <VERSION>        ║');
  console.error('║  Beispiel:                                       ║');
  console.error('║    node scripts/set-version.mjs 2.15.8           ║');
  console.error('╚══════════════════════════════════════════════════╝\n');
  process.exit(1);
} else {
  console.log(`╔══════════════════════════════════════════════════╗`);
  console.log(`║  ✅ Alle Versionen sind synchron: v${rootVersion.padEnd(14)}║`);
  console.log(`╚══════════════════════════════════════════════════╝\n`);
}
