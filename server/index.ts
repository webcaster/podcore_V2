import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import os from 'os';

import { getDb, DATA_DIR } from './database';
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

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
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
app.use('/api/sponsors', sponsorsRouter);
app.use('/api/media', mediaRouter);
app.use('/api/admin', adminRouter);
app.use('/api/podigee', podigeeRouter);
app.use('/api/backup', backupRouter);
app.use('/api/storage', storageRouter);

// Serve branding assets publicly (no auth needed for display)
const brandingDir = path.join(DATA_DIR, 'branding');
app.use('/branding', express.static(brandingDir));

// Health check
app.get('/api/health', (req, res) => {
  const ips = getLocalNetworkIPs();
  res.json({
    status: 'ok',
    version: '2.0.4',
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
  app.use(express.static(publicDir));

  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads') && !req.path.startsWith('/branding')) {
      res.sendFile(path.join(publicDir, 'index.html'));
    } else {
      res.status(404).json({ success: false, error: 'Route nicht gefunden' });
    }
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      message: 'PodCore API Server v2.0.4',
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

app.listen(PORT, HOST, () => {
  const ips = getLocalNetworkIPs();

  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║           PodCore v2.0.4 Server              ║');
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
