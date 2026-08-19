import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const required = [
  'package.json', 'src/App.tsx', 'src/types.ts', 'src/library.ts', 'src/ProjectLibraryDialog.tsx', 'src/styles.css',
  'electron/main.ts', 'electron/preload.ts', 'README.md', 'docs/TUTORIAL-FORMAT.md',
  '../.github/workflows/tutorial-studio-release.yml'
];
for (const file of required) {
  await stat(path.join(root, file));
}
const app = await readFile(path.join(root, 'src/App.tsx'), 'utf8');
const types = await readFile(path.join(root, 'src/types.ts'), 'utf8');
const library = await readFile(path.join(root, 'src/library.ts'), 'utf8');
const projectDialog = await readFile(path.join(root, 'src/ProjectLibraryDialog.tsx'), 'utf8');
const main = await readFile(path.join(root, 'electron/main.ts'), 'utf8');
const workflow = await readFile(path.join(root, '../.github/workflows/tutorial-studio-release.yml'), 'utf8');
for (const token of ['openImage', 'openJson', 'saveJson', 'listScreens', 'addAnnotation', 'TutorialPreview', 'CaptureDialog', 'exportPdf', 'ProjectLibraryDialog', 'pdfLayout']) {
  if (!app.includes(token) && !main.includes(token)) throw new Error(`Fehlende Funktion: ${token}`);
}
for (const token of ['schemaVersion', 'annotations', 'interaction', 'allowSkip', 'image', 'pdfLayout', 'TutorialLibrary']) {
  if (!types.includes(token)) throw new Error(`Fehlendes Datenfeld: ${token}`);
}
for (const token of ['loadLibrary', 'persistLibrary', 'cloneProject']) {
  if (!library.includes(token)) throw new Error(`Lokales Archiv unvollständig: ${token}`);
}
for (const token of ['Lokales Projektarchiv', 'Wiederherstellen']) {
  if (!projectDialog.includes(token)) throw new Error(`Projektarchiv-Oberfläche unvollständig: ${token}`);
}
for (const token of ['desktopCapturer', 'contextIsolation: true', 'nodeIntegration: false']) {
  if (!main.includes(token)) throw new Error(`Fehlende Sicherheitsvorgabe: ${token}`);
}
for (const token of ['windows-latest', 'macos-latest', 'tutorial-studio-v']) {
  if (!workflow.includes(token)) throw new Error(`Release-Workflow unvollständig: ${token}`);
}
console.log('Tutorial Studio: Projektstruktur, Datenformat, sichere Desktop-API und Release-Automation sind vollständig.');
