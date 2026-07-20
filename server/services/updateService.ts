import AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as path from 'path';

export interface UpdateArchiveInfo {
  version: string;
  prefix: string;
  fileCount: number;
  isSourceZip: boolean;
  hasServerDist: boolean;
  hasFrontendBuild: boolean;
  hasServerSource: boolean;
  hasClientSource: boolean;
}

export interface UpdateBackupManifest {
  appRoot: string;
  backupDir: string;
  createdFiles: string[];
  overwrittenFiles: string[];
  previousVersion: string;
  targetVersion: string;
  createdAt: string;
}

function normalizeArchiveName(rawName: string): string {
  if (!rawName || rawName.includes('\0')) throw new Error('ZIP enthält einen ungültigen Dateinamen');
  const normalized = rawName.replace(/\\/g, '/').replace(/^\.\//, '');
  if (normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized)) {
    throw new Error(`Absolute Pfade sind im Update nicht erlaubt: ${rawName}`);
  }
  const segments = normalized.split('/').filter(Boolean);
  if (segments.some(segment => segment === '..')) {
    throw new Error(`Pfad außerhalb des Update-Verzeichnisses erkannt: ${rawName}`);
  }
  return segments.join('/');
}

function isSymlinkEntry(entry: any): boolean {
  const unixMode = ((entry?.header?.attr || 0) >>> 16) & 0o170000;
  return unixMode === 0o120000;
}

function getArchiveFiles(zip: AdmZip): Array<{ entry: any; name: string }> {
  return zip.getEntries()
    .filter((entry: any) => !entry.isDirectory)
    .map((entry: any) => {
      if (isSymlinkEntry(entry)) throw new Error(`Symbolische Links sind im Update nicht erlaubt: ${entry.entryName}`);
      return { entry, name: normalizeArchiveName(entry.entryName) };
    });
}

function findArchivePrefix(fileNames: string[]): string {
  const candidates = new Set<string>(['']);
  for (const name of fileNames) {
    if (name.endsWith('/package.json')) {
      const directory = name.slice(0, -'package.json'.length);
      candidates.add(directory);
    }
  }

  const valid = [...candidates].filter(prefix => {
    const hasRootPackage = fileNames.includes(`${prefix}package.json`);
    const hasServer = fileNames.some(name => name.startsWith(`${prefix}server/`));
    const hasClient = fileNames.some(name => name.startsWith(`${prefix}client/`))
      || fileNames.some(name => name.startsWith(`${prefix}server/public/`));
    return hasRootPackage && hasServer && hasClient;
  });

  if (valid.length !== 1) {
    throw new Error('Die ZIP-Datei muss genau eine PodCore-Anwendungswurzel mit package.json, server/ und client/ enthalten');
  }
  return valid[0];
}

function parsePackageVersion(buffer: Buffer, label: string): string {
  try {
    const pkg = JSON.parse(buffer.toString('utf8'));
    if (typeof pkg.version !== 'string' || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(pkg.version)) {
      throw new Error('Versionsnummer fehlt oder ist ungültig');
    }
    return pkg.version;
  } catch (error: any) {
    throw new Error(`${label} ist ungültig: ${error.message || error}`);
  }
}

export function inspectUpdateArchive(zipPath: string): UpdateArchiveInfo {
  const zip = new AdmZip(zipPath);
  const files = getArchiveFiles(zip);
  const fileNames = files.map(file => file.name);
  const prefix = findArchivePrefix(fileNames);
  const relativeNames = fileNames.map(name => name.slice(prefix.length));

  const rootPackage = files.find(file => file.name === `${prefix}package.json`);
  if (!rootPackage) throw new Error('Root-package.json fehlt');
  const version = parsePackageVersion(rootPackage.entry.getData(), 'Root-package.json');

  const serverPackage = files.find(file => file.name === `${prefix}server/package.json`);
  if (!serverPackage) throw new Error('server/package.json fehlt');
  const serverVersion = parsePackageVersion(serverPackage.entry.getData(), 'server/package.json');
  if (serverVersion !== version) {
    throw new Error(`Uneinheitliche Versionsnummern: Root ${version}, Server ${serverVersion}`);
  }

  const hasServerDist = relativeNames.includes('server/dist/index.js');
  const hasFrontendBuild = relativeNames.includes('server/public/index.html')
    || relativeNames.includes('client/dist/index.html');
  const hasServerSource = relativeNames.includes('server/index.ts')
    || relativeNames.some(name => name.startsWith('server/routers/') && name.endsWith('.ts'));
  const hasClientSource = relativeNames.includes('client/index.html')
    && relativeNames.some(name => name.startsWith('client/src/'));
  const isSourceZip = !(hasServerDist && hasFrontendBuild);

  if (!hasServerDist && !hasServerSource) {
    throw new Error('Weder gebauter Server noch Server-Quellcode gefunden');
  }
  if (!hasFrontendBuild && !hasClientSource) {
    throw new Error('Weder gebautes Frontend noch Client-Quellcode gefunden');
  }

  return {
    version,
    prefix,
    fileCount: files.length,
    isSourceZip,
    hasServerDist,
    hasFrontendBuild,
    hasServerSource,
    hasClientSource,
  };
}

function isProtectedRelativePath(relativePath: string): boolean {
  const segments = relativePath.split('/').filter(Boolean);
  const first = segments[0] || '';
  const base = segments[segments.length - 1] || '';
  const protectedRoots = new Set(['data', 'uploads', 'backups', 'branding', 'updates', 'node_modules', '.git', '.work']);
  if (protectedRoots.has(first)) return true;
  if (segments.some(segment => segment === 'node_modules' || segment === '.git')) return true;
  if (base === '.env' || (base.startsWith('.env.') && base !== '.env.example')) return true;
  if (/\.(db|sqlite|sqlite3|log)$/i.test(base)) return true;
  return false;
}

function assertWithinRoot(root: string, candidate: string): void {
  const resolvedRoot = path.resolve(root) + path.sep;
  const resolvedCandidate = path.resolve(candidate);
  if (!resolvedCandidate.startsWith(resolvedRoot)) {
    throw new Error(`Unsicherer Zielpfad erkannt: ${candidate}`);
  }
}

export function extractUpdateArchive(zipPath: string, destination: string, info: UpdateArchiveInfo): number {
  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(destination, { recursive: true });

  const zip = new AdmZip(zipPath);
  const files = getArchiveFiles(zip);
  let extracted = 0;

  for (const file of files) {
    if (!file.name.startsWith(info.prefix)) continue;
    const relative = file.name.slice(info.prefix.length);
    if (!relative || isProtectedRelativePath(relative)) continue;
    const target = path.join(destination, ...relative.split('/'));
    assertWithinRoot(destination, target);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.entry.getData(), { mode: 0o644 });
    extracted++;
  }

  return extracted;
}

export function readPackageVersion(packagePath: string): string {
  try {
    return JSON.parse(fs.readFileSync(packagePath, 'utf8')).version || '?';
  } catch {
    return '?';
  }
}

function isPodCoreRoot(candidate: string): boolean {
  return fs.existsSync(path.join(candidate, 'package.json'))
    && fs.existsSync(path.join(candidate, 'server', 'package.json'))
    && fs.existsSync(path.join(candidate, 'client', 'package.json'));
}

export function findPodCoreRoot(startDir: string = __dirname): string {
  const starts = [startDir, process.cwd()];
  for (const start of starts) {
    let current = path.resolve(start);
    for (let depth = 0; depth < 8; depth++) {
      if (isPodCoreRoot(current)) return current;
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }
  throw new Error('PodCore-Anwendungswurzel konnte nicht eindeutig ermittelt werden');
}

export function validateStagedApplication(stagingRoot: string, expectedVersion: string): void {
  if (!isPodCoreRoot(stagingRoot)) throw new Error('Staging enthält keine vollständige PodCore-Anwendung');
  const rootVersion = readPackageVersion(path.join(stagingRoot, 'package.json'));
  const serverVersion = readPackageVersion(path.join(stagingRoot, 'server', 'package.json'));
  if (rootVersion !== expectedVersion || serverVersion !== expectedVersion) {
    throw new Error(`Staging-Version stimmt nicht überein: erwartet ${expectedVersion}, Root ${rootVersion}, Server ${serverVersion}`);
  }
  if (!fs.existsSync(path.join(stagingRoot, 'server', 'dist', 'index.js'))) {
    throw new Error('Gebauter Server fehlt im Staging (server/dist/index.js)');
  }
  if (!fs.existsSync(path.join(stagingRoot, 'server', 'public', 'index.html'))) {
    throw new Error('Gebautes Frontend fehlt im Staging (server/public/index.html)');
  }
}

function listFiles(root: string, current: string = root): string[] {
  const result: string[] = [];
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const absolute = path.join(current, entry.name);
    const relative = path.relative(root, absolute).split(path.sep).join('/');
    if (isProtectedRelativePath(relative)) continue;
    if (entry.isDirectory()) result.push(...listFiles(root, absolute));
    else if (entry.isFile()) result.push(relative);
  }
  return result;
}

function atomicCopy(source: string, target: string): void {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.podcore-update-${process.pid}`;
  fs.copyFileSync(source, temporary);
  fs.chmodSync(temporary, fs.statSync(source).mode);
  fs.renameSync(temporary, target);
}

export function applyStagedApplication(
  stagingRoot: string,
  appRoot: string,
  backupDir: string,
  previousVersion: string,
  targetVersion: string,
): UpdateBackupManifest {
  const relativeFiles = listFiles(stagingRoot);
  const createdFiles: string[] = [];
  const overwrittenFiles: string[] = [];
  fs.mkdirSync(backupDir, { recursive: true });

  try {
    for (const relative of relativeFiles) {
      const source = path.join(stagingRoot, ...relative.split('/'));
      const target = path.join(appRoot, ...relative.split('/'));
      assertWithinRoot(appRoot, target);
      if (fs.existsSync(target) && fs.statSync(target).isFile()) {
        const backupTarget = path.join(backupDir, 'files', ...relative.split('/'));
        fs.mkdirSync(path.dirname(backupTarget), { recursive: true });
        fs.copyFileSync(target, backupTarget);
        overwrittenFiles.push(relative);
      } else {
        createdFiles.push(relative);
      }
      atomicCopy(source, target);
    }
  } catch (error) {
    const partial: UpdateBackupManifest = {
      appRoot,
      backupDir,
      createdFiles,
      overwrittenFiles,
      previousVersion,
      targetVersion,
      createdAt: new Date().toISOString(),
    };
    restoreUpdateBackup(partial);
    throw error;
  }

  const manifest: UpdateBackupManifest = {
    appRoot,
    backupDir,
    createdFiles,
    overwrittenFiles,
    previousVersion,
    targetVersion,
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

export function restoreUpdateBackup(manifest: UpdateBackupManifest): void {
  for (const relative of [...manifest.createdFiles].reverse()) {
    const target = path.join(manifest.appRoot, ...relative.split('/'));
    assertWithinRoot(manifest.appRoot, target);
    try { fs.rmSync(target, { force: true }); } catch {}
  }
  for (const relative of manifest.overwrittenFiles) {
    const backupSource = path.join(manifest.backupDir, 'files', ...relative.split('/'));
    const target = path.join(manifest.appRoot, ...relative.split('/'));
    if (fs.existsSync(backupSource)) atomicCopy(backupSource, target);
  }
}
