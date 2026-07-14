const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const source = path.join(projectRoot, 'server', 'public');
const target = path.join(projectRoot, 'server', 'dist', 'public');

if (!fs.existsSync(source)) {
  console.error('[ERROR] Frontend-Build nicht gefunden:', source);
  console.error('Führen Sie zuerst "pnpm --dir client run build" aus.');
  process.exit(1);
}

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.cpSync(source, target, { recursive: true });

console.log('[INFO] Frontend-Build nach server/dist/public synchronisiert.');
