import { Router, Request, Response } from 'express';
import { exec, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { requirePermission } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';

const router: import("express").Router = Router();

const GITHUB_REPO = 'webcaster/podcore_V2';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const GITHUB_COMMITS_URL = `https://api.github.com/repos/${GITHUB_REPO}/commits?per_page=5`;
const APP_DIR = path.resolve(__dirname, '../../');

// SSE-Clients für Live-Update-Status
const updateClients: Response[] = [];

function broadcastUpdate(data: object) {
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  updateClients.forEach(client => {
    try { client.write(msg); } catch {}
  });
}

// Aktuelle Version aus package.json lesen
function getCurrentVersion(): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(APP_DIR, 'package.json'), 'utf8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

// GitHub API anfragen
function fetchGitHub(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: url.replace('https://api.github.com', ''),
      method: 'GET',
      headers: {
        'User-Agent': 'PodCore-App/1.0',
        'Accept': 'application/vnd.github.v3+json',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

// Versionsvergleich: true wenn remote > local
function isNewerVersion(remote: string, local: string): boolean {
  const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number);
  const r = parse(remote);
  const l = parse(local);
  for (let i = 0; i < Math.max(r.length, l.length); i++) {
    const rv = r[i] || 0;
    const lv = l[i] || 0;
    if (rv > lv) return true;
    if (rv < lv) return false;
  }
  return false;
}

// ── GET /api/update/check ─────────────────────────────────────────────────────
// Prüft ob eine neue Version auf GitHub verfügbar ist
router.get('/check', requirePermission('canManageSystem') as any, async (req: AuthRequest, res: Response) => {
  const currentVersion = getCurrentVersion();

  try {
    // Versuche zuerst Releases, dann Commits
    let latestVersion = currentVersion;
    let releaseNotes = '';
    let releaseUrl = '';
    let hasUpdate = false;
    let latestCommit = '';
    let commitMessage = '';

    try {
      const release = await fetchGitHub(GITHUB_API_URL);
      if (release && release.tag_name) {
        latestVersion = release.tag_name.replace(/^v/, '');
        releaseNotes = release.body || '';
        releaseUrl = release.html_url || '';
        hasUpdate = isNewerVersion(latestVersion, currentVersion);
      }
    } catch {}

    // Commits für Changelog
    try {
      const commits = await fetchGitHub(GITHUB_COMMITS_URL);
      if (Array.isArray(commits) && commits.length > 0) {
        latestCommit = commits[0]?.sha?.substring(0, 7) || '';
        commitMessage = commits[0]?.commit?.message?.split('\n')[0] || '';
      }
    } catch {}

    // Lokalen Git-Status prüfen
    let localCommit = '';
    try {
      await new Promise<void>((resolve) => {
        exec('git rev-parse --short HEAD', { cwd: APP_DIR }, (err, stdout) => {
          if (!err) localCommit = stdout.trim();
          resolve();
        });
      });
    } catch {}

    const behindByCommits = latestCommit && localCommit && latestCommit !== localCommit;

    return res.json({
      success: true,
      data: {
        currentVersion,
        latestVersion,
        hasUpdate: hasUpdate || (behindByCommits ? true : false),
        releaseNotes,
        releaseUrl,
        latestCommit,
        localCommit,
        commitMessage,
        upToDate: !hasUpdate && !behindByCommits,
      },
    });
  } catch (err: any) {
    return res.json({
      success: true,
      data: {
        currentVersion,
        latestVersion: currentVersion,
        hasUpdate: false,
        upToDate: true,
        error: 'GitHub nicht erreichbar',
      },
    });
  }
});

// ── GET /api/update/stream ────────────────────────────────────────────────────
// SSE-Stream für Live-Update-Status
router.get('/stream', requirePermission('canManageSystem') as any, (req: AuthRequest, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  updateClients.push(res);
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Update-Stream verbunden' })}\n\n`);

  req.on('close', () => {
    const idx = updateClients.indexOf(res);
    if (idx !== -1) updateClients.splice(idx, 1);
  });
});

// ── POST /api/update/install ──────────────────────────────────────────────────
// Löst das Update aus: git pull → npm install → build → restart
router.post('/install', requirePermission('canManageSystem') as any, (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Update gestartet' });

  const log = (type: string, message: string) => {
    console.log(`[UPDATE] ${message}`);
    broadcastUpdate({ type, message, timestamp: new Date().toISOString() });
  };

  const runStep = (cmd: string, cwd: string, label: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      log('step', `▶ ${label}`);
      const proc = exec(cmd, { cwd, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (stdout) stdout.split('\n').filter(Boolean).forEach(l => log('log', l));
        if (stderr) stderr.split('\n').filter(Boolean).forEach(l => log('log', l));
        if (err) {
          log('error', `✗ ${label} fehlgeschlagen: ${err.message}`);
          reject(err);
        } else {
          log('success', `✓ ${label} abgeschlossen`);
          resolve();
        }
      });
    });
  };

  (async () => {
    try {
      log('start', '🔄 Update wird gestartet...');

      // 1. Git Pull
      log('step', '📥 Lade neueste Version von GitHub...');
      await runStep('git fetch --all && git reset --hard origin/main', APP_DIR, 'Git Pull');

      // 2. Root-Dependencies (better-sqlite3 etc.)
      log('step', '📦 Installiere Root-Abhängigkeiten...');
      await runStep('npm install', APP_DIR, 'npm install (Root)');

      // 3. Server-Dependencies
      log('step', '📦 Installiere Server-Abhängigkeiten...');
      await runStep('npm install', path.join(APP_DIR, 'server'), 'npm install (Server)');

      // 4. Client-Dependencies
      log('step', '📦 Installiere Client-Abhängigkeiten...');
      await runStep('npm install', path.join(APP_DIR, 'client'), 'npm install (Client)');

      // 5. Client-Build (mit lokaler Vite-Installation)
      log('step', '🎨 Baue Frontend...');
      const viteBin = path.join(APP_DIR, 'client', 'node_modules', '.bin', 'vite');
      const viteFallback = 'npx vite@5';
      const vitecmd = fs.existsSync(viteBin) ? `"${viteBin}" build` : `${viteFallback} build`;
      await runStep(vitecmd, path.join(APP_DIR, 'client'), 'Vite Build (Frontend)');

      // 6. Public-Sync
      log('step', '📁 Synchronisiere Public-Dateien...');
      await runStep('rm -rf dist/public && cp -r public dist/public', path.join(APP_DIR, 'server'), 'Public Sync');

      // 7. TypeScript Build
      log('step', '🔨 Kompiliere Server...');
      const tscBin = path.join(APP_DIR, 'server', 'node_modules', '.bin', 'tsc');
      const tsccmd = fs.existsSync(tscBin) ? `"${tscBin}"` : 'npx tsc';
      await runStep(tsccmd, path.join(APP_DIR, 'server'), 'TypeScript Build');

      // 8. Neue Version lesen
      const newVersion = getCurrentVersion();
      log('success', `✅ Update auf v${newVersion} erfolgreich!`);
      log('restart', '🔁 Server wird neu gestartet...');

      // 9. Server neu starten (nach kurzer Verzögerung)
      setTimeout(() => {
        broadcastUpdate({ type: 'done', message: 'Update abgeschlossen – Server startet neu', version: newVersion });
        setTimeout(() => {
          process.exit(0); // Prozess-Manager (PM2/nodemon) startet automatisch neu
        }, 1500);
      }, 500);

    } catch (err: any) {
      log('error', `❌ Update fehlgeschlagen: ${err.message}`);
      broadcastUpdate({ type: 'failed', message: `Update fehlgeschlagen: ${err.message}` });
    }
  })();
});

// ── GET /api/update/changelog ─────────────────────────────────────────────────
// Letzten Commits als Changelog
router.get('/changelog', requirePermission('canManageSystem') as any, async (req: AuthRequest, res: Response) => {
  try {
    const commits = await fetchGitHub(`${GITHUB_COMMITS_URL}&per_page=20`);
    if (!Array.isArray(commits)) {
      return res.json({ success: true, data: [] });
    }
    return res.json({
      success: true,
      data: commits.map((c: any) => ({
        sha: c.sha?.substring(0, 7),
        message: c.commit?.message?.split('\n')[0] || '',
        author: c.commit?.author?.name || '',
        date: c.commit?.author?.date || '',
        url: c.html_url || '',
      })),
    });
  } catch {
    return res.json({ success: true, data: [] });
  }
});

export default router;
