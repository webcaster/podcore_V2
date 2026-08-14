import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import os from 'os';
import http from 'http';

import { getDb, DATA_DIR, DB_PATH, ASSETS_DIR, LOGS_DIR } from './database';
import { verifyToken } from './middleware/auth';
import { getLocalNetworkIPs } from './storage';
import authRouter from './routers/auth';
import episodesRouter from './routers/episodes';
import editorialRouter from './routers/editorial';
import sponsorsRouter from './routers/sponsors';
import mediaRouter from './routers/media';
import adminRouter from './routers/admin';
import podigeeRouter from './routers/podigee';
import backupRouter from './routers/backup';
import storageRouter from './routers/storage';
import { seasonsRouter } from './routers/seasons';
import statsRouter from './routers/stats';
import chatRouter from './routers/chat';
import pdfLayoutsRouter from './routers/pdfLayouts';
import approvalsRouter from './routers/approvals';
import sponsorsV2Router from './routers/sponsors-v2';
import updateRouter from './routers/update';
import episodeWorkflowRouter from './routers/episodeWorkflow';
import tutorialsRouter from './routers/tutorials';
import tutorialCloudRouter from './routers/tutorialCloud';
import licenseRouter from './routers/license';
import { initializeRealtime } from './services/realtime';

const app: import("express").Express = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Version dynamisch aus package.json lesen (wird bei jedem Build automatisch aktualisiert)
const pkgPath = path.join(__dirname, '..', 'package.json');
const APP_VERSION: string = (() => {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return pkg.version || '2.14.0';
  } catch (_) {
    return '2.14.0';
  }
})();
// Always bind to 0.0.0.0 so the app is reachable in LAN
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'production';

// ============================================================
// Security & Middleware
// ============================================================

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

const configuredCorsOrigins = (process.env.CORS_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
app.use(cors({
  origin: true, // Erlaube alle Origins in dieser selbstgehosteten Umgebung
  credentials: true,
}));

app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

if (NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// ============================================================
// Single-Instance Guard & Initialize Database
// ============================================================

const INSTANCE_LOCK_PATH = path.join(DATA_DIR, 'podcore-server.lock');
const SQLITE_WASM_LOCK_PATH = `${DB_PATH}.lock`;

function findLinuxProcessesUsingFile(targetPath: string): number[] {
  // node-sqlite3-wasm nutzt ein leeres Verzeichnis <datenbank>.lock als
  // Sperrmarker. Unter Linux lässt sich vor einer automatischen Bereinigung
  // sicher feststellen, ob ein anderer Prozess die echte DB-Datei noch offen
  // hat. Auf anderen Plattformen wird bewusst nichts automatisch entfernt.
  if (process.platform !== 'linux' || !fs.existsSync('/proc')) return [];
  const target = path.resolve(targetPath);
  const holders = new Set<number>();
  for (const entry of fs.readdirSync('/proc')) {
    if (!/^\d+$/.test(entry)) continue;
    const pid = Number(entry);
    if (pid === process.pid) continue;
    const fdDirectory = `/proc/${pid}/fd`;
    try {
      for (const fd of fs.readdirSync(fdDirectory)) {
        try {
          const link = fs.readlinkSync(path.join(fdDirectory, fd)).replace(/ \(deleted\)$/, '');
          if (path.resolve(link) === target) {
            holders.add(pid);
            break;
          }
        } catch (_) {}
      }
    } catch (_) {}
  }
  return [...holders];
}

function clearStaleSqliteWasmLock(): void {
  if (!fs.existsSync(SQLITE_WASM_LOCK_PATH)) return;
  const holders = findLinuxProcessesUsingFile(DB_PATH);
  if (holders.length > 0) {
    console.error(`[FATAL] Die Datenbank ${DB_PATH} wird noch von Prozess(en) ${holders.join(', ')} verwendet.`);
    console.error('[FATAL] Beende diese Instanz(en), bevor du PodCore neu startest.');
    process.exit(1);
  }
  if (process.platform !== 'linux') {
    console.error(`[FATAL] Verwaistes SQLite-Sperrverzeichnis erkannt: ${SQLITE_WASM_LOCK_PATH}`);
    console.error('[FATAL] Beende PodCore vollständig und entferne nur dieses leere .lock-Verzeichnis, nicht die Datenbankdatei.');
    process.exit(1);
  }
  try {
    const entries = fs.readdirSync(SQLITE_WASM_LOCK_PATH);
    if (entries.length > 0) {
      console.error(`[FATAL] SQLite-Sperrverzeichnis enthält Dateien und wird nicht automatisch entfernt: ${SQLITE_WASM_LOCK_PATH}`);
      process.exit(1);
    }
    fs.rmdirSync(SQLITE_WASM_LOCK_PATH);
    console.warn(`[DB] Verwaistes SQLite-WASM-Sperrverzeichnis bereinigt: ${SQLITE_WASM_LOCK_PATH}`);
  } catch (error: any) {
    console.error(`[FATAL] SQLite-Sperrverzeichnis konnte nicht sicher bereinigt werden: ${error?.message || error}`);
    process.exit(1);
  }
}

function isProcessRunning(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0 || pid === process.pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (_) {
    return false;
  }
}

function acquireInstanceLock(): void {
  try {
    if (fs.existsSync(INSTANCE_LOCK_PATH)) {
      let existing: { pid?: number } = {};
      try { existing = JSON.parse(fs.readFileSync(INSTANCE_LOCK_PATH, 'utf8')); } catch (_) {}
      if (isProcessRunning(Number(existing.pid))) {
        console.error(`[FATAL] PodCore läuft bereits mit Prozess ${existing.pid} und verwendet ${DATA_DIR}.`);
        console.error('[FATAL] Beende die vorhandene Instanz, bevor du PodCore erneut startest.');
        process.exit(1);
      }
      // Ein abgestürzter Prozess kann eine verwaiste Sperrdatei hinterlassen.
      fs.unlinkSync(INSTANCE_LOCK_PATH);
    }

    fs.writeFileSync(INSTANCE_LOCK_PATH, JSON.stringify({
      pid: process.pid,
      startedAt: new Date().toISOString(),
      version: APP_VERSION,
    }), { encoding: 'utf8', flag: 'wx' });

    const release = () => {
      try {
        const current = JSON.parse(fs.readFileSync(INSTANCE_LOCK_PATH, 'utf8'));
        if (current.pid === process.pid) fs.unlinkSync(INSTANCE_LOCK_PATH);
      } catch (_) {}
    };
    process.once('exit', release);
    for (const signal of ['SIGINT', 'SIGTERM']) {
      process.once(signal, () => {
        release();
        process.exit(0);
      });
    }
  } catch (error: any) {
    console.error('[FATAL] PodCore-Instanzsperre konnte nicht eingerichtet werden:', error?.message || error);
    process.exit(1);
  }
}

acquireInstanceLock();
clearStaleSqliteWasmLock();
getDb();

// ============================================================
// API Routes
// ============================================================

app.use('/api/auth', authRouter);
app.use('/api/episodes', episodesRouter);
app.use('/api/editorial', editorialRouter);
app.use('/api/sponsors/v2', sponsorsV2Router); // MUSS vor /api/sponsors stehen!
app.use('/api/sponsors', sponsorsRouter);
app.use('/api/approvals', approvalsRouter);

// Stream endpoint BEFORE mediaRouter — accepts cookie OR query token for <audio> elements
app.get('/api/media/stream/:filename', (req: any, res: any) => {
  const token = (req.query.token as string) || req.cookies?.podcore_session || (req.headers.authorization?.replace('Bearer ', '') || '');
  const user = token ? verifyToken(token) : null;
  if (!user) return res.status(401).json({ success: false, error: 'Nicht authentifiziert' });

  const rawFilename = String(req.params.filename || '');
  const filename = path.basename(rawFilename);
  if (!filename || filename !== rawFilename) return res.status(400).json({ success: false, error: 'Ungültiger Dateiname' });

  const db = getDb();
  const asset = db.get('SELECT filepath, filename FROM assets WHERE filename = ?', [filename]) as any;
  const assetsRoot = path.resolve(ASSETS_DIR);
  let filePath = path.resolve(asset?.filepath || path.join(ASSETS_DIR, filename));
  const relativeAssetPath = path.relative(assetsRoot, filePath);
  if (relativeAssetPath.startsWith('..') || path.isAbsolute(relativeAssetPath)) {
    filePath = path.join(assetsRoot, filename);
  }
  if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: 'Datei nicht gefunden' });

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.aac': 'audio/aac',
    '.ogg': 'audio/ogg', '.flac': 'audio/flac', '.m4a': 'audio/mp4',
    '.mp4': 'video/mp4', '.webm': 'video/webm', '.m4b': 'audio/mp4',
  };
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = Number.parseInt(parts[0], 10);
    const requestedEnd = parts[1] ? Number.parseInt(parts[1], 10) : fileSize - 1;
    const end = Math.min(Number.isFinite(requestedEnd) ? requestedEnd : fileSize - 1, fileSize - 1);
    if (!Number.isFinite(start) || start < 0 || start >= fileSize || end < start) {
      return res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
    }
    const chunksize = end - start + 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Length': fileSize, 'Content-Type': contentType, 'Accept-Ranges': 'bytes' });
    fs.createReadStream(filePath).pipe(res);
  }
});

app.use('/api/media', mediaRouter);
app.use('/api/admin', adminRouter);
app.use('/api/podigee', podigeeRouter);
app.use('/api/backup', backupRouter);
app.use('/api/storage', storageRouter);
app.use('/api/seasons', seasonsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/pdf-layouts', pdfLayoutsRouter);
app.use('/api/update', updateRouter);
app.use('/api/episode-workflow', episodeWorkflowRouter);
app.use('/api', tutorialsRouter);
app.use('/api/tutorial-cloud', tutorialCloudRouter);
app.use('/api/license', licenseRouter);

// Serve branding assets publicly (no auth needed for display)
const brandingDir = path.join(DATA_DIR, 'branding');
app.use('/branding-assets', express.static(brandingDir));

// Health check
app.get('/api/health', (req, res) => {
  const ips = getLocalNetworkIPs();
  res.json({
    status: 'ok',
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
    dataDir: DATA_DIR,
    networkIPs: ips,
    port: PORT,
  });
});

// ============================================================
// Serve React Frontend (Production)
// ============================================================

const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  // Hashed assets (JS/CSS with content hash in filename) → cache forever
  app.use('/assets', express.static(path.join(publicDir, 'assets'), {
    maxAge: '1y',
    immutable: true,
  }));

  // index.html and other root files → never cache (always fetch fresh)
  app.use(express.static(publicDir, {
    maxAge: 0,
    etag: false,
    lastModified: false,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    },
  }));

  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads') && !req.path.startsWith('/branding-assets')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(publicDir, 'index.html'));
    } else {
      res.status(404).json({ success: false, error: 'Route nicht gefunden' });
    }
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      message: 'PodCore API Server v2.14.0',
      note: 'Frontend build not found. Run: npm run build:client',
      api: '/api',
    });
  });
}

// ============================================================
// Error Handler
// ============================================================

function isDatabaseBusyError(error: any): boolean {
  const message = String(error?.message || error || '');
  return /database is locked|database is busy|sqlite_busy/i.test(message);
}

function writeEmergencyErrorLog(error: any, req: express.Request): void {
  try {
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      category: 'backend',
      message: error?.message || 'Unknown error',
      url: req.path,
      method: req.method,
    });
    fs.appendFileSync(path.join(LOGS_DIR, 'backend-fallback.log'), `${entry}\n`, 'utf8');
  } catch (fallbackError) {
    console.error('[ERROR] Fallback-Log konnte nicht geschrieben werden:', fallbackError);
  }
}

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[ERROR]', err);
  const databaseBusy = isDatabaseBusyError(err);

  // Eine weitere INSERT-Anweisung auf einer bereits gesperrten DB würde die
  // Sperre nur verstärken und denselben Fehler erneut auslösen. In diesem Fall
  // wird ausschließlich in das lokale Fallback-Log geschrieben.
  if (databaseBusy) {
    writeEmergencyErrorLog(err, req);
  } else {
    try {
      const db = getDb();
      const { v4: uuidv4 } = require('uuid');
      db.run(
        `INSERT INTO error_logs (id, level, category, message, details, stack, url) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), 'error', 'backend', err.message || 'Unknown error', JSON.stringify({ name: err.name }), err.stack || null, req.path]
      );
    } catch (logErr) {
      console.error('[ERROR] Could not log error to database:', logErr);
      writeEmergencyErrorLog(logErr, req);
    }
  }

  res.status(databaseBusy ? 503 : (err.status || 500)).json({
    success: false,
    error: databaseBusy
      ? 'Die lokale Datenbank ist momentan durch einen anderen Vorgang belegt. Bitte kurz warten und erneut anmelden.'
      : (NODE_ENV === 'production' ? 'Interner Serverfehler' : err.message),
  });
});

// ============================================================
// Start Server
// ============================================================

const server = http.createServer(app);
initializeRealtime(server);

server.listen(PORT, HOST, () => {
  const ips = getLocalNetworkIPs();

  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log(`║           PodCore v${APP_VERSION} Server${' '.repeat(Math.max(0, 19 - APP_VERSION.length))}║`);
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  Lokal:   http://localhost:${PORT}               ║`);
  if (ips.length > 0) {
    ips.forEach(ip => {
      const url = `http://${ip}:${PORT}`;
      console.log(`║  Netzwerk: ${url.padEnd(34)}║`);
    });
  }
  console.log(`║  Modus:   ${NODE_ENV.padEnd(35)}║`);
  console.log(`║  Daten:   ${DATA_DIR.substring(0, 35).padEnd(35)}║`);
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  console.log('  Standard-Login: admin / admin123');
  console.log('');
});

export default app;
