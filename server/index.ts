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

import { getDb, DATA_DIR, ASSETS_DIR } from './database';
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

app.use(cors({
  origin: true, // Allow all origins — user controls network access via firewall
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
// Initialize Database
// ============================================================
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

  const filename = req.params.filename;
  const db = getDb();
  const asset = db.get('SELECT filepath, filename FROM assets WHERE filename = ?', [filename]) as any;

  let filePath = asset?.filepath || path.join(ASSETS_DIR, filename);
  if (!fs.existsSync(filePath)) filePath = path.join(ASSETS_DIR, filename);
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
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
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

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[ERROR]', err);

  try {
    const db = getDb();
    const { v4: uuidv4 } = require('uuid');
    db.run(
      `INSERT INTO error_logs (id, level, category, message, details, stack, url) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), 'error', 'backend', err.message || 'Unknown error', JSON.stringify({ name: err.name }), err.stack || null, req.path]
    );
  } catch (logErr) {
    console.error('[ERROR] Could not log error to database:', logErr);
  }

  res.status(err.status || 500).json({
    success: false,
    error: NODE_ENV === 'production' ? 'Interner Serverfehler' : err.message,
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
