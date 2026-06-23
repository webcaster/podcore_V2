import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getDb, ASSETS_DIR, DATA_DIR } from '../database';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth as any);

function getStorageConfig() {
  const db = getDb();
  const row = db.get('SELECT value FROM settings WHERE key = ?', ['app']) as any;
  if (!row) return { type: 'local', localPath: ASSETS_DIR };
  const settings = JSON.parse(row.value);
  return settings?.storage || { type: 'local', localPath: ASSETS_DIR };
}

function resolveUploadDir(): string {
  const config = getStorageConfig();
  if (config.type === 'local' && config.localPath) {
    // If the configured path IS the data dir itself, use the assets subdirectory
    // to avoid dumping files in the root data directory
    const configured = path.resolve(config.localPath);
    const dataDir = path.resolve(ASSETS_DIR, '..');
    const dir = configured === dataDir ? ASSETS_DIR : path.join(configured, 'assets');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }
  // Ensure ASSETS_DIR exists
  if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });
  return ASSETS_DIR;
}

const mediaStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, resolveUploadDir()),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const uploadMedia = multer({
  storage: mediaStorage,
  limits: { fileSize: 1000 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.mp3', '.wav', '.aac', '.ogg', '.flac', '.m4a', '.mp4', '.webm', '.m4b'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error(`Nicht erlaubter Dateityp: ${ext}`));
  },
});

const brandingDir = path.join(DATA_DIR, 'branding');
if (!fs.existsSync(brandingDir)) fs.mkdirSync(brandingDir, { recursive: true });

const brandingStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, brandingDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const type = (req as any).params?.type || 'image';
    cb(null, `${type}${ext}`);
  },
});

const uploadBranding = multer({
  storage: brandingStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error(`Nur Bilddateien erlaubt: ${allowed.join(', ')}`));
  },
});

function parseAsset(row: any) {
  if (!row) return null;
  return {
    ...row,
    tags: JSON.parse(row.tags || '[]'),
    comments: JSON.parse(row.comments || '[]'),
    usedInEpisodes: JSON.parse(row.used_in_episodes || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    uploadedBy: row.uploaded_by,
    mimeType: row.mime_type,
  };
}

// ============================================================
// BRANDING
// ============================================================

router.get('/branding', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const row = db.get('SELECT value FROM settings WHERE key = ?', ['app']) as any;
  const settings = row ? JSON.parse(row.value) : {};
  const branding = settings?.branding || {};

  const allBrandingFiles = fs.existsSync(brandingDir) ? fs.readdirSync(brandingDir) : [];
  const logoAny = allBrandingFiles.find((f: string) => f.startsWith('logo.'));
  const coverAny = allBrandingFiles.find((f: string) => f.startsWith('cover.'));

  return res.json({
    success: true,
    data: {
      logo: logoAny ? `/api/media/branding/logo` : null,
      cover: coverAny ? `/api/media/branding/cover` : null,
      podcastName: branding.podcastName || settings?.general?.podcastName || 'Mein Podcast',
      podcastDescription: branding.podcastDescription || '',
    },
  });
});

router.get('/branding/logo', (req: AuthRequest, res: Response) => {
  if (!fs.existsSync(brandingDir)) return res.status(404).json({ success: false, error: 'Kein Logo vorhanden' });
  const files = fs.readdirSync(brandingDir);
  const logoFile = files.find((f: string) => f.startsWith('logo.'));
  if (!logoFile) return res.status(404).json({ success: false, error: 'Kein Logo vorhanden' });
  return res.sendFile(path.join(brandingDir, logoFile));
});

router.get('/branding/cover', (req: AuthRequest, res: Response) => {
  if (!fs.existsSync(brandingDir)) return res.status(404).json({ success: false, error: 'Kein Cover vorhanden' });
  const files = fs.readdirSync(brandingDir);
  const coverFile = files.find((f: string) => f.startsWith('cover.'));
  if (!coverFile) return res.status(404).json({ success: false, error: 'Kein Cover vorhanden' });
  return res.sendFile(path.join(brandingDir, coverFile));
});

router.post('/branding/:type', requirePermission('canManageSettings') as any, (req: AuthRequest, res: Response) => {
  const type = req.params.type;
  if (!['logo', 'cover'].includes(type)) {
    return res.status(400).json({ success: false, error: 'Typ muss "logo" oder "cover" sein' });
  }

  uploadBranding.single('file')(req as any, res as any, (err: any) => {
    if (err) return res.status(400).json({ success: false, error: err.message });
    if (!(req as any).file) return res.status(400).json({ success: false, error: 'Keine Datei hochgeladen' });

    const file = (req as any).file;
    const ext = path.extname(file.originalname).toLowerCase();
    const finalName = `${type}${ext}`;
    const finalPath = path.join(brandingDir, finalName);

    if (fs.existsSync(brandingDir)) {
      fs.readdirSync(brandingDir)
        .filter((f: string) => f.startsWith(`${type}.`) && f !== finalName)
        .forEach((f: string) => fs.unlinkSync(path.join(brandingDir, f)));
    }

    if (file.path !== finalPath) {
      fs.renameSync(file.path, finalPath);
    }

    return res.json({
      success: true,
      data: { type, url: `/api/media/branding/${type}`, filename: finalName, size: file.size },
    });
  });
});

router.delete('/branding/:type', requirePermission('canManageSettings') as any, (req: AuthRequest, res: Response) => {
  const type = req.params.type;
  if (!['logo', 'cover'].includes(type)) {
    return res.status(400).json({ success: false, error: 'Typ muss "logo" oder "cover" sein' });
  }

  if (fs.existsSync(brandingDir)) {
    fs.readdirSync(brandingDir)
      .filter((f: string) => f.startsWith(`${type}.`))
      .forEach((f: string) => fs.unlinkSync(path.join(brandingDir, f)));
  }

  return res.json({ success: true, message: `${type} gelöscht` });
});

// ============================================================
// MEDIA LIBRARY
// ============================================================

router.get('/', requirePermission('canViewMedia') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { type, search } = req.query;
  let query = 'SELECT * FROM assets WHERE 1=1';
  const params: any[] = [];

  if (type) { query += ' AND type = ?'; params.push(type); }
  if (search) { query += ' AND (name LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  query += ' ORDER BY created_at DESC';

  const assets = db.all(query, params).map(parseAsset);
  return res.json({ success: true, data: assets });
});

router.get('/stream/:filename', (req: AuthRequest, res: Response) => {
  const uploadDir = resolveUploadDir();
  let filePath = path.join(uploadDir, req.params.filename);

  // Fallback: also check ASSETS_DIR and filepath stored in DB
  if (!fs.existsSync(filePath)) {
    const db = getDb();
    const asset = db.get('SELECT filepath FROM assets WHERE filename = ?', [req.params.filename]) as any;
    if (asset?.filepath && fs.existsSync(asset.filepath)) {
      filePath = asset.filepath;
    } else {
      const fallback = path.join(ASSETS_DIR, req.params.filename);
      if (fs.existsSync(fallback)) {
        filePath = fallback;
      } else {
        return res.status(404).json({ success: false, error: 'Datei nicht gefunden' });
      }
    }
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'audio/mpeg',
    });
    file.pipe(res);
  } else {
    res.writeHead(200, { 'Content-Length': fileSize, 'Content-Type': 'audio/mpeg' });
    fs.createReadStream(filePath).pipe(res);
  }
});

router.get('/:id', requirePermission('canViewMedia') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const asset = db.get('SELECT * FROM assets WHERE id = ?', [req.params.id]);
  if (!asset) return res.status(404).json({ success: false, error: 'Asset nicht gefunden' });
  return res.json({ success: true, data: parseAsset(asset) });
});

router.post('/upload', requirePermission('canUploadMedia') as any, (req: AuthRequest, res: Response) => {
  uploadMedia.single('file')(req as any, res as any, (err: any) => {
    if (err) return res.status(400).json({ success: false, error: err.message });

    const db = getDb();
    const file = (req as any).file;
    if (!file) return res.status(400).json({ success: false, error: 'Keine Datei hochgeladen' });

    const id = uuidv4();
    const { name, type = 'audio', description, tags } = req.body;
    const assetName = name || path.basename(file.originalname, path.extname(file.originalname));

    db.run('INSERT INTO assets (id, name, type, filename, filepath, filesize, mime_type, description, tags, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, assetName, type, file.filename, file.path, file.size, file.mimetype, description || null, tags ? JSON.stringify(JSON.parse(tags)) : '[]', req.user!.id]);

    const asset = parseAsset(db.get('SELECT * FROM assets WHERE id = ?', [id]));
    return res.status(201).json({ success: true, data: asset });
  });
});

router.put('/:id', requirePermission('canUploadMedia') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { name, type, description, tags } = req.body;

  db.run(`UPDATE assets SET name = COALESCE(?, name), type = COALESCE(?, type), description = ?, tags = COALESCE(?, tags), updated_at = datetime('now') WHERE id = ?`,
    [name ?? null, type ?? null, description ?? null, tags ? JSON.stringify(tags) : null, req.params.id]);

  const asset = db.get('SELECT * FROM assets WHERE id = ?', [req.params.id]);
  if (!asset) return res.status(404).json({ success: false, error: 'Asset nicht gefunden' });
  return res.json({ success: true, data: parseAsset(asset) });
});

router.delete('/:id', requirePermission('canDeleteMedia') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const asset = db.get('SELECT * FROM assets WHERE id = ?', [req.params.id]) as any;
  if (!asset) return res.status(404).json({ success: false, error: 'Asset nicht gefunden' });

  if (asset.filepath && fs.existsSync(asset.filepath)) {
    try { fs.unlinkSync(asset.filepath); } catch (e) { /* ignore */ }
  }

  db.run('DELETE FROM assets WHERE id = ?', [req.params.id]);
  return res.json({ success: true, message: 'Asset gelöscht' });
});

router.post('/:id/comments', requirePermission('canCommentMedia') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const asset = db.get('SELECT * FROM assets WHERE id = ?', [req.params.id]) as any;
  if (!asset) return res.status(404).json({ success: false, error: 'Asset nicht gefunden' });

  const { text, content } = req.body;
  const commentText = (text || content)?.trim();
  if (!commentText) return res.status(400).json({ success: false, error: 'Kommentartext erforderlich' });

  const comments = JSON.parse(asset.comments || '[]');
  const comment = {
    id: uuidv4(),
    text: commentText,
    userId: req.user!.id,
    username: req.user!.username,
    displayName: req.user!.displayName,
    createdAt: new Date().toISOString(),
  };
  comments.push(comment);

  db.run(`UPDATE assets SET comments = ?, updated_at = datetime('now') WHERE id = ?`, [JSON.stringify(comments), req.params.id]);
  return res.status(201).json({ success: true, data: comment });
});

router.delete('/:id/comments/:commentId', requirePermission('canCommentMedia') as any, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const asset = db.get('SELECT * FROM assets WHERE id = ?', [req.params.id]) as any;
  if (!asset) return res.status(404).json({ success: false, error: 'Asset nicht gefunden' });

  const comments = JSON.parse(asset.comments || '[]').filter((c: any) => c.id !== req.params.commentId);
  db.run(`UPDATE assets SET comments = ?, updated_at = datetime('now') WHERE id = ?`, [JSON.stringify(comments), req.params.id]);
  return res.json({ success: true, message: 'Kommentar gelöscht' });
});

export default router;
