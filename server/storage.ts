import fs from 'fs';
import path from 'path';
import { getDb, DATA_DIR } from './database';

// ============================================================
// Storage Configuration Types
// ============================================================

export interface StorageConfig {
  type: 'local' | 's3' | 'webdav' | 'dropbox' | 'googledrive' | 'onedrive';
  localPath?: string;
  // S3 / S3-compatible (MinIO, Backblaze B2, etc.)
  s3Bucket?: string;
  s3Region?: string;
  s3AccessKey?: string;
  s3SecretKey?: string;
  s3Endpoint?: string; // custom endpoint for S3-compatible
  s3Prefix?: string;
  // WebDAV (Nextcloud, ownCloud, generic)
  webdavUrl?: string;
  webdavUsername?: string;
  webdavPassword?: string;
  webdavBasePath?: string;
  // Dropbox
  dropboxAccessToken?: string;
  dropboxRefreshToken?: string;
  dropboxAppKey?: string;
  dropboxAppSecret?: string;
  dropboxBasePath?: string;
  // Google Drive
  googleDriveClientId?: string;
  googleDriveClientSecret?: string;
  googleDriveRefreshToken?: string;
  googleDriveFolderId?: string;
  // OneDrive
  oneDriveClientId?: string;
  oneDriveClientSecret?: string;
  oneDriveRefreshToken?: string;
  oneDriveFolderPath?: string;
}

// ============================================================
// Get current storage config from DB
// ============================================================

export function getStorageConfig(): StorageConfig {
  const db = getDb();
  const row = db.get("SELECT value FROM settings WHERE key = 'app'") as any;
  if (!row) return { type: 'local', localPath: path.join(DATA_DIR, 'assets') };
  const settings = JSON.parse(row.value);
  return settings?.storage || { type: 'local', localPath: path.join(DATA_DIR, 'assets') };
}

// ============================================================
// Test storage connection
// ============================================================

export async function testStorageConnection(config: StorageConfig): Promise<{ success: boolean; message: string }> {
  try {
    switch (config.type) {
      case 'local':
        const localPath = config.localPath || path.join(DATA_DIR, 'assets');
        if (!fs.existsSync(localPath)) {
          fs.mkdirSync(localPath, { recursive: true });
        }
        fs.accessSync(localPath, fs.constants.W_OK);
        return { success: true, message: `Lokaler Pfad erreichbar: ${localPath}` };

      case 's3':
        if (!config.s3Bucket || !config.s3AccessKey || !config.s3SecretKey) {
          return { success: false, message: 'S3: Bucket, Access Key und Secret Key sind erforderlich' };
        }
        const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3');
        const s3 = new S3Client({
          region: config.s3Region || 'us-east-1',
          credentials: { accessKeyId: config.s3AccessKey, secretAccessKey: config.s3SecretKey },
          ...(config.s3Endpoint ? { endpoint: config.s3Endpoint, forcePathStyle: true } : {}),
        });
        await s3.send(new HeadBucketCommand({ Bucket: config.s3Bucket }));
        return { success: true, message: `S3-Bucket "${config.s3Bucket}" erreichbar` };

      case 'webdav':
        if (!config.webdavUrl) {
          return { success: false, message: 'WebDAV: URL ist erforderlich' };
        }
        const webdavHeaders: any = { 'Content-Type': 'application/xml' };
        if (config.webdavUsername && config.webdavPassword) {
          webdavHeaders['Authorization'] = 'Basic ' + Buffer.from(`${config.webdavUsername}:${config.webdavPassword}`).toString('base64');
        }
        const webdavRes = await fetch(config.webdavUrl, { method: 'PROPFIND', headers: { ...webdavHeaders, Depth: '0' } });
        if (webdavRes.ok || webdavRes.status === 207) {
          return { success: true, message: `WebDAV-Server erreichbar: ${config.webdavUrl}` };
        }
        return { success: false, message: `WebDAV-Fehler: HTTP ${webdavRes.status}` };

      case 'dropbox':
        if (!config.dropboxAccessToken) {
          return { success: false, message: 'Dropbox: Access Token ist erforderlich' };
        }
        const dbxRes = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
          method: 'POST',
          headers: { Authorization: `Bearer ${config.dropboxAccessToken}`, 'Content-Type': 'application/json' },
          body: 'null',
        });
        if (dbxRes.ok) {
          const account = await dbxRes.json() as any;
          return { success: true, message: `Dropbox verbunden: ${account.name?.display_name || account.email}` };
        }
        const dbxErr = await dbxRes.json() as any;
        return { success: false, message: `Dropbox-Fehler: ${dbxErr?.error_summary || dbxRes.status}` };

      case 'googledrive':
        if (!config.googleDriveRefreshToken || !config.googleDriveClientId || !config.googleDriveClientSecret) {
          return { success: false, message: 'Google Drive: Client ID, Client Secret und Refresh Token sind erforderlich' };
        }
        // Get access token using refresh token
        const gdTokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: config.googleDriveClientId,
            client_secret: config.googleDriveClientSecret,
            refresh_token: config.googleDriveRefreshToken,
            grant_type: 'refresh_token',
          }),
        });
        if (!gdTokenRes.ok) {
          return { success: false, message: 'Google Drive: Token-Erneuerung fehlgeschlagen' };
        }
        const gdToken = await gdTokenRes.json() as any;
        const gdRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
          headers: { Authorization: `Bearer ${gdToken.access_token}` },
        });
        if (gdRes.ok) {
          const gdInfo = await gdRes.json() as any;
          return { success: true, message: `Google Drive verbunden: ${gdInfo.user?.displayName || gdInfo.user?.emailAddress}` };
        }
        return { success: false, message: `Google Drive-Fehler: HTTP ${gdRes.status}` };

      case 'onedrive':
        if (!config.oneDriveRefreshToken || !config.oneDriveClientId) {
          return { success: false, message: 'OneDrive: Client ID und Refresh Token sind erforderlich' };
        }
        const odTokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: config.oneDriveClientId,
            client_secret: config.oneDriveClientSecret || '',
            refresh_token: config.oneDriveRefreshToken,
            grant_type: 'refresh_token',
            scope: 'Files.ReadWrite.All offline_access',
          }),
        });
        if (!odTokenRes.ok) {
          return { success: false, message: 'OneDrive: Token-Erneuerung fehlgeschlagen' };
        }
        const odToken = await odTokenRes.json() as any;
        const odRes = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: { Authorization: `Bearer ${odToken.access_token}` },
        });
        if (odRes.ok) {
          const odInfo = await odRes.json() as any;
          return { success: true, message: `OneDrive verbunden: ${odInfo.displayName || odInfo.userPrincipalName}` };
        }
        return { success: false, message: `OneDrive-Fehler: HTTP ${odRes.status}` };

      default:
        return { success: false, message: 'Unbekannter Speicher-Typ' };
    }
  } catch (err: any) {
    return { success: false, message: `Verbindungsfehler: ${err.message}` };
  }
}

// ============================================================
// Upload file to configured storage
// ============================================================

export async function uploadToStorage(
  config: StorageConfig,
  localFilePath: string,
  remotePath: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    switch (config.type) {
      case 'local':
        // Already stored locally — just return the path
        return { success: true, url: localFilePath };

      case 's3': {
        const { S3Client } = require('@aws-sdk/client-s3');
        const { Upload } = require('@aws-sdk/lib-storage');
        const s3 = new S3Client({
          region: config.s3Region || 'us-east-1',
          credentials: { accessKeyId: config.s3AccessKey!, secretAccessKey: config.s3SecretKey! },
          ...(config.s3Endpoint ? { endpoint: config.s3Endpoint, forcePathStyle: true } : {}),
        });
        const key = (config.s3Prefix ? `${config.s3Prefix}/` : '') + remotePath;
        const upload = new Upload({
          client: s3,
          params: {
            Bucket: config.s3Bucket!,
            Key: key,
            Body: fs.createReadStream(localFilePath),
          },
        });
        await upload.done();
        const url = config.s3Endpoint
          ? `${config.s3Endpoint}/${config.s3Bucket}/${key}`
          : `https://${config.s3Bucket}.s3.${config.s3Region || 'us-east-1'}.amazonaws.com/${key}`;
        return { success: true, url };
      }

      case 'dropbox': {
        const fileBuffer = fs.readFileSync(localFilePath);
        const dropboxPath = (config.dropboxBasePath || '/PodCore') + '/' + remotePath;
        const res = await fetch('https://content.dropboxapi.com/2/files/upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.dropboxAccessToken}`,
            'Content-Type': 'application/octet-stream',
            'Dropbox-API-Arg': JSON.stringify({
              path: dropboxPath,
              mode: 'overwrite',
              autorename: false,
              mute: false,
            }),
          },
          body: fileBuffer,
        });
        if (!res.ok) {
          const err = await res.text();
          return { success: false, error: `Dropbox Upload-Fehler: ${err}` };
        }
        const result = await res.json() as any;
        return { success: true, url: result.path_display };
      }

      case 'webdav': {
        const fileBuffer = fs.readFileSync(localFilePath);
        const webdavPath = (config.webdavBasePath || '') + '/' + remotePath;
        const webdavUrl = config.webdavUrl!.replace(/\/$/, '') + webdavPath;
        const headers: any = {};
        if (config.webdavUsername && config.webdavPassword) {
          headers['Authorization'] = 'Basic ' + Buffer.from(`${config.webdavUsername}:${config.webdavPassword}`).toString('base64');
        }
        const res = await fetch(webdavUrl, { method: 'PUT', headers, body: fileBuffer });
        if (res.ok || res.status === 201 || res.status === 204) {
          return { success: true, url: webdavUrl };
        }
        return { success: false, error: `WebDAV Upload-Fehler: HTTP ${res.status}` };
      }

      default:
        // For Google Drive and OneDrive, local storage is used as primary
        // and sync is done via backup/sync job
        return { success: true, url: localFilePath };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ============================================================
// Get local network IP addresses
// ============================================================

export function getLocalNetworkIPs(): string[] {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}
