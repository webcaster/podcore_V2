import { rename, rm } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'dist-electron');

for (const file of ['main', 'preload']) {
  const js = path.join(output, `${file}.js`);
  const cjs = path.join(output, `${file}.cjs`);
  await rm(cjs, { force: true });
  await rename(js, cjs);
}

console.log('Electron-Hauptprozess kompiliert.');
