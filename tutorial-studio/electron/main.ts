import { app, BrowserWindow, dialog, ipcMain, shell, desktopCapturer } from 'electron';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const isDev = !app.isPackaged;

function createWindow() {
  const window = new BrowserWindow({
    width: 1480,
    height: 960,
    minWidth: 1060,
    minHeight: 700,
    backgroundColor: '#0c1420',
    title: 'Tutorial Studio',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    void window.loadURL('http://127.0.0.1:5173');
  } else {
    void window.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  app.setName('Tutorial Studio');
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('files:open-image', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Screenshot auswählen',
    properties: ['openFile'],
    filters: [{ name: 'Bilder', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const filePath = result.filePaths[0];
  const content = await readFile(filePath);
  const ext = path.extname(filePath).toLowerCase().replace('.', '') || 'png';
  const mime = ext === 'jpg' ? 'jpeg' : ext;
  return { filePath, dataUrl: `data:image/${mime};base64,${content.toString('base64')}` };
});

ipcMain.handle('files:open-json', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Tutorial-Projekt importieren',
    properties: ['openFile'],
    filters: [{ name: 'Tutorial-Projekt', extensions: ['json'] }],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  return readFile(result.filePaths[0], 'utf8');
});

ipcMain.handle('files:save-json', async (_event, payload: { defaultPath: string; content: string }) => {
  const result = await dialog.showSaveDialog({
    title: 'Tutorial-Projekt speichern',
    defaultPath: payload.defaultPath,
    filters: [{ name: 'Tutorial-Projekt', extensions: ['json'] }],
  });
  if (result.canceled || !result.filePath) return null;
  await writeFile(result.filePath, payload.content, 'utf8');
  return result.filePath;
});

ipcMain.handle('screens:list', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 1920, height: 1080 },
    fetchWindowIcons: true,
  });
  return sources.map((source) => ({
    id: source.id,
    name: source.name,
    thumbnail: source.thumbnail.toDataURL(),
    displayId: source.display_id,
  }));
});

ipcMain.handle('system:open-external', async (_event, url: string) => {
  if (!/^https?:\/\//i.test(url)) throw new Error('Nur HTTP(S)-Links sind erlaubt.');
  await shell.openExternal(url);
});
