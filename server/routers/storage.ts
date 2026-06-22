import { Router, Response } from 'express';
import { getDb } from '../database';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';
import { testStorageConnection, getLocalNetworkIPs } from '../storage';

const router = Router();
router.use(requireAuth as any);

// GET /api/storage/config — Get current storage configuration
router.get('/config', requirePermission('canManageSettings') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const row = db.get("SELECT value FROM settings WHERE key = 'app'") as any;
  const settings = row ? JSON.parse(row.value) : {};
  const storage = settings?.storage || { type: 'local' };

  // Mask sensitive credentials before sending to frontend
  const masked = { ...storage };
  if (masked.s3SecretKey) masked.s3SecretKey = '••••••••';
  if (masked.webdavPassword) masked.webdavPassword = '••••••••';
  if (masked.dropboxAccessToken) masked.dropboxAccessToken = masked.dropboxAccessToken.substring(0, 8) + '••••••••';
  if (masked.googleDriveClientSecret) masked.googleDriveClientSecret = '••••••••';
  if (masked.googleDriveRefreshToken) masked.googleDriveRefreshToken = '••••••••';
  if (masked.oneDriveClientSecret) masked.oneDriveClientSecret = '••••••••';
  if (masked.oneDriveRefreshToken) masked.oneDriveRefreshToken = '••••••••';

  return res.json({ success: true, data: masked });
});

// PUT /api/storage/config — Save storage configuration
router.put('/config', requirePermission('canManageSettings') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const current = db.get("SELECT value FROM settings WHERE key = 'app'") as any;
  const currentSettings = current ? JSON.parse(current.value) : {};
  const currentStorage = currentSettings?.storage || {};

  // Merge: keep existing secrets if masked value sent
  const newStorage = { ...currentStorage, ...req.body };
  if (req.body.s3SecretKey === '••••••••') newStorage.s3SecretKey = currentStorage.s3SecretKey;
  if (req.body.webdavPassword === '••••••••') newStorage.webdavPassword = currentStorage.webdavPassword;
  if (req.body.dropboxAccessToken?.endsWith('••••••••')) newStorage.dropboxAccessToken = currentStorage.dropboxAccessToken;
  if (req.body.googleDriveClientSecret === '••••••••') newStorage.googleDriveClientSecret = currentStorage.googleDriveClientSecret;
  if (req.body.googleDriveRefreshToken === '••••••••') newStorage.googleDriveRefreshToken = currentStorage.googleDriveRefreshToken;
  if (req.body.oneDriveClientSecret === '••••••••') newStorage.oneDriveClientSecret = currentStorage.oneDriveClientSecret;
  if (req.body.oneDriveRefreshToken === '••••••••') newStorage.oneDriveRefreshToken = currentStorage.oneDriveRefreshToken;

  const newSettings = { ...currentSettings, storage: newStorage };
  db.run(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    ['app', JSON.stringify(newSettings)]
  );

  return res.json({ success: true, data: { type: newStorage.type } });
});

// POST /api/storage/test — Test a storage connection
router.post('/test', requirePermission('canManageSettings') as any, async (req: AuthRequest, res: Response) => {
  const config = req.body;
  if (!config?.type) {
    return res.status(400).json({ success: false, error: 'Speicher-Typ erforderlich' });
  }

  // If masked secrets, load from DB
  const db = getDb();
  const row = db.get("SELECT value FROM settings WHERE key = 'app'") as any;
  const currentStorage = row ? JSON.parse(row.value)?.storage || {} : {};

  if (config.s3SecretKey === '••••••••') config.s3SecretKey = currentStorage.s3SecretKey;
  if (config.webdavPassword === '••••••••') config.webdavPassword = currentStorage.webdavPassword;
  if (config.dropboxAccessToken?.endsWith('••••••••')) config.dropboxAccessToken = currentStorage.dropboxAccessToken;
  if (config.googleDriveClientSecret === '••••••••') config.googleDriveClientSecret = currentStorage.googleDriveClientSecret;
  if (config.googleDriveRefreshToken === '••••••••') config.googleDriveRefreshToken = currentStorage.googleDriveRefreshToken;
  if (config.oneDriveClientSecret === '••••••••') config.oneDriveClientSecret = currentStorage.oneDriveClientSecret;
  if (config.oneDriveRefreshToken === '••••••••') config.oneDriveRefreshToken = currentStorage.oneDriveRefreshToken;

  const result = await testStorageConnection(config);
  return res.json({ success: result.success, data: result });
});

// GET /api/storage/network — Get local network info (IPs, QR code)
router.get('/network', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const row = db.get("SELECT value FROM settings WHERE key = 'app'") as any;
  const settings = row ? JSON.parse(row.value) : {};
  const port = settings?.port || 3001;

  const ips = getLocalNetworkIPs();
  const urls = ips.map(ip => `http://${ip}:${port}`);

  return res.json({
    success: true,
    data: {
      ips,
      urls,
      port,
      primaryUrl: urls[0] || `http://localhost:${port}`,
    },
  });
});

// GET /api/storage/network/qr — Get QR code for LAN URL
router.get('/network/qr', async (req: AuthRequest, res: Response) => {
  const db = getDb();
  const row = db.get("SELECT value FROM settings WHERE key = 'app'") as any;
  const settings = row ? JSON.parse(row.value) : {};
  const port = settings?.port || 3001;

  const ips = getLocalNetworkIPs();
  const url = ips.length > 0 ? `http://${ips[0]}:${port}` : `http://localhost:${port}`;

  try {
    const QRCode = require('qrcode');
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 256,
      margin: 2,
      color: { dark: '#ffffff', light: '#1a1a2e' },
    });
    return res.json({ success: true, data: { url, qrCode: qrDataUrl } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
