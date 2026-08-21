import express, { Response } from 'express';
import http from 'http';
import https from 'https';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import { getDb } from '../database';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';

const router: import('express').Router = express.Router();
const GRACE_PERIOD_DAYS = 14;
const WORDPRESS_API_PATH = '/wp-json/podcore-licensing/v1';

type LicenseStatusValue = 'unconfigured' | 'active' | 'invalid' | 'offline' | 'deactivated';
type LicensePlan = 'monthly' | 'yearly' | 'lifetime' | 'special' | 'unknown';

interface LicenseSettings {
  siteUrl: string;
  licenseKey: string;
  label: string;
  installationId: string;
  activationToken: string;
  status: LicenseStatusValue;
  lastValidatedAt: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
  licenseId: string | number | null;
  productName: string;
  plan: LicensePlan;
  publicKey: string;
  signature: string;
  licenseDocument: any | null;
  verificationMode: 'online' | 'offline';
  lastError: string | null;
}

const DEFAULT_LICENSE: LicenseSettings = {
  siteUrl: 'https://podcore.de',
  licenseKey: '',
  label: 'PodCore Installation',
  installationId: '',
  activationToken: '',
  status: 'unconfigured',
  lastValidatedAt: null,
  activatedAt: null,
  expiresAt: null,
  licenseId: null,
  productName: '',
  plan: 'unknown',
  publicKey: '',
  signature: '',
  licenseDocument: null,
  verificationMode: 'online',
  lastError: null,
};

function readAppSettings(): Record<string, any> {
  const db = getDb();
  const row = db.get('SELECT value FROM settings WHERE key = ?', ['app']) as any;
  if (!row?.value) return {};
  try { return JSON.parse(row.value); } catch { return {}; }
}

function ensureInstallationId(value?: string): string {
  return value && /^[a-zA-Z0-9_-]{12,128}$/.test(value) ? value : crypto.randomUUID().replace(/-/g, '');
}

function readLicense(): LicenseSettings {
  const settings = readAppSettings();
  const stored = settings.license || {};
  return { ...DEFAULT_LICENSE, ...stored, installationId: ensureInstallationId(stored.installationId) };
}

function writeLicense(license: LicenseSettings): void {
  const db = getDb();
  const current = readAppSettings();
  // Entfernt die alten DLM-/WooCommerce-REST-Zugangsdaten bei jeder Speicherung.
  const { consumerKey, consumerSecret, software, ...ownPluginLicense } = license as LicenseSettings & Record<string, unknown>;
  const next = { ...current, license: ownPluginLicense };
  db.run(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    ['app', JSON.stringify(next)]
  );
}

function mask(value: string): string {
  if (!value) return '';
  if (value.length <= 8) return '••••••••';
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

function detectPlan(value: string, expiresAt: string | null): LicensePlan {
  const normalized = value.toLowerCase();
  if (/(lifetime|lebenslang|unbefristet|permanent|never\s*expire|sonderkunde|exclusive)/i.test(normalized)) return 'lifetime';
  if (/(jährlich|jaehrlich|yearly|annual|12\s*monat|365\s*day)/i.test(normalized)) return 'yearly';
  if (/(monatlich|monthly|30\s*day)/i.test(normalized)) return 'monthly';
  if (expiresAt) {
    const days = (new Date(expiresAt).getTime() - Date.now()) / 86400000;
    if (days > 300) return 'yearly';
    if (days > 0 && days <= 90) return 'monthly';
  }
  return 'special';
}

function publicStatus(license: LicenseSettings) {
  let effectiveStatus = license.status;
  let isGracePeriod = false;
  if (license.status === 'offline' && license.lastValidatedAt) {
    const diffDays = (Date.now() - new Date(license.lastValidatedAt).getTime()) / 86400000;
    if (diffDays <= GRACE_PERIOD_DAYS) { effectiveStatus = 'active'; isGracePeriod = true; }
  }
  return {
    provider: 'podcore-wordpress-plugin',
    configured: Boolean(license.siteUrl && license.licenseKey && license.activationToken),
    siteUrl: license.siteUrl,
    label: license.label,
    installationId: license.installationId,
    status: effectiveStatus,
    realStatus: license.status,
    isGracePeriod,
    gracePeriodDaysRemaining: isGracePeriod ? Math.max(0, Math.floor(GRACE_PERIOD_DAYS - (Date.now() - new Date(license.lastValidatedAt!).getTime()) / 86400000)) : 0,
    licenseKeyMasked: mask(license.licenseKey),
    activationTokenMasked: mask(license.activationToken),
    lastValidatedAt: license.lastValidatedAt,
    activatedAt: license.activatedAt,
    expiresAt: license.expiresAt,
    licenseId: license.licenseId,
    productName: license.productName,
    plan: license.plan,
    publicKey: license.publicKey,
    signature: license.signature,
    verificationMode: license.verificationMode,
    hasOfflineDocument: Boolean(license.licenseDocument),
    lastError: license.lastError,
  };
}

function wordpressRequest(siteUrl: string, endpoint: string, payload: Record<string, unknown>, activationToken = ''): Promise<any> {
  return new Promise((resolve, reject) => {
    let base: URL;
    try {
      base = new URL(siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`);
      if (!['https:', 'http:'].includes(base.protocol)) throw new Error('Nur HTTP oder HTTPS ist erlaubt');
    } catch (error: any) { reject(new Error(`Ungültige Lizenz-Webseite: ${error.message}`)); return; }

    const url = new URL(`${WORDPRESS_API_PATH}${endpoint}`, base);
    const body = JSON.stringify(payload);
    const client = url.protocol === 'https:' ? https : http;
    const request = client.request(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'PodCore-License-Client/2.16',
        ...(activationToken ? { Authorization: `Bearer ${activationToken}` } : {}),
      },
      timeout: 10000,
    }, response => {
      let responseBody = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { responseBody += chunk; });
      response.on('end', () => {
        let parsed: any;
        try { parsed = JSON.parse(responseBody); } catch { parsed = { message: responseBody }; }
        if ((response.statusCode || 500) < 200 || (response.statusCode || 500) >= 300 || parsed?.success === false) {
          reject(new Error(String(parsed?.message || parsed?.error || parsed?.data?.message || `Lizenzserver antwortete mit HTTP ${response.statusCode}`)));
          return;
        }
        resolve(parsed);
      });
    });
    request.on('timeout', () => request.destroy(new Error('Zeitüberschreitung bei der Lizenzprüfung')));
    request.on('error', reject);
    request.write(body);
    request.end();
  });
}

function extractLicenseData(response: any): any { return response?.data || response?.license || response || {}; }
function extractError(error: any): string { return error instanceof Error ? error.message : 'Unbekannter Fehler bei der Lizenzprüfung'; }

function verifyOfflineDocument(document: any): { valid: boolean; reason?: string; payload?: any } {
  const payload = document?.payload;
  const signature = String(document?.signature || '');
  const publicKey = String(payload?.public_key || document?.public_key || '');
  if (!payload || !signature || !publicKey) return { valid: false, reason: 'Unvollständiges Lizenzdokument.' };
  if (payload.format !== 'podcore-license-v1' || document.algorithm !== 'Ed25519') return { valid: false, reason: 'Unbekanntes Lizenzformat oder Signaturalgorithmus.' };
  try {
    const rawKey = Buffer.from(publicKey, 'base64');
    const derPrefix = Buffer.from('302a300506032b6570032100', 'hex');
    const key = crypto.createPublicKey({ key: Buffer.concat([derPrefix, rawKey]), format: 'der', type: 'spki' });
    const valid = crypto.verify(null, Buffer.from(JSON.stringify(payload)), key, Buffer.from(signature, 'base64'));
    if (!valid) return { valid: false, reason: 'Lizenzsignatur ist ungültig.' };
    if (payload.status !== 'active') return { valid: false, reason: 'Lizenz ist widerrufen oder nicht aktiv.' };
    if (payload.expires_at && new Date(payload.expires_at).getTime() < Date.now()) return { valid: false, reason: 'Lizenz ist abgelaufen.' };
    return { valid: true, payload };
  } catch (error: any) { return { valid: false, reason: `Offline-Lizenz konnte nicht geprüft werden: ${error.message}` }; }
}

function generateLicensePdf(license: LicenseSettings): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 54 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.fontSize(24).fillColor('#16324f').text('PodCore Lizenznachweis');
    doc.moveDown(0.5).fontSize(10).fillColor('#555').text('Lizenz bestätigt durch das PodCore WordPress-Lizenzplugin');
    doc.moveDown(1.5).fontSize(12).fillColor('#111');
    [
      ['Lizenzschlüssel', license.licenseKey], ['Produkt', license.productName || 'PodCore'], ['Tarif', license.plan],
      ['Status', license.status], ['Installation', license.label], ['Ausgestellt', license.activatedAt || license.lastValidatedAt || '–'],
      ['Gültig bis', license.expiresAt || 'Unbefristet'], ['Prüfmodus', license.verificationMode],
    ].forEach(([label, value]) => doc.text(`${label}: ${value}`));
    doc.moveDown(1.5).fontSize(9).fillColor('#555').text('Das zugehörige Offline-Lizenzdokument wird lokal per Ed25519-Signatur geprüft. Bewahren Sie es zusammen mit diesem Nachweis sicher auf.');
    doc.end();
  });
}

function applyRemoteLicense(current: LicenseSettings, response: any, status: LicenseStatusValue = 'active'): LicenseSettings {
  const data = extractLicenseData(response);
  const license = data.license || {};
  const expiresAt = license.expires_at || data.expires_at || current.expiresAt || null;
  const productName = String(license.name || data.product_name || data.product || current.productName || 'PodCore Lizenz').trim();
  const planCandidate = String(license.plan || data.plan || '').toLowerCase();
  const plan: LicensePlan = ['monthly', 'yearly', 'lifetime', 'special'].includes(planCandidate) ? planCandidate as LicensePlan : detectPlan(productName, expiresAt);
  return {
    ...current,
    activationToken: String(data.token || data.activation_token || current.activationToken || ''),
    status,
    lastValidatedAt: new Date().toISOString(),
    activatedAt: String(data.activated_at || current.activatedAt || new Date().toISOString()),
    expiresAt,
    licenseId: data.license_id || license.id || current.licenseId || null,
    productName,
    plan,
    publicKey: String(data.document?.payload?.public_key || data.payload?.public_key || current.publicKey || ''),
    signature: String(data.document?.signature || current.signature || ''),
    licenseDocument: data.document || current.licenseDocument || null,
    verificationMode: 'online',
    lastError: null,
  };
}

router.get('/status', requireAuth as any, (_req: AuthRequest, res: Response) => res.json({ success: true, data: publicStatus(readLicense()) }));

router.post('/activate', requirePermission('canManageSettings') as any, async (req: AuthRequest, res: Response) => {
  const current = readLicense();
  const siteUrl = String(req.body.siteUrl || current.siteUrl || '').trim().replace(/\/$/, '');
  const licenseKey = String(req.body.licenseKey || current.licenseKey || '').trim().toUpperCase();
  const label = String(req.body.label || current.label || 'PodCore Installation').trim().slice(0, 190);
  if (!siteUrl || !licenseKey) return res.status(400).json({ success: false, error: 'Lizenz-Webseite und Lizenzschlüssel sind erforderlich.' });

  const pending: LicenseSettings = { ...current, siteUrl, licenseKey, label, installationId: ensureInstallationId(current.installationId), status: 'invalid', lastError: null };
  try {
    const response = await wordpressRequest(siteUrl, '/activate', {
      license_key: licenseKey, installation_id: pending.installationId, label, software: 'podcore', client_version: process.env.npm_package_version || '2.16',
    });
    const activated = applyRemoteLicense(pending, response);
    if (!activated.activationToken) throw new Error('Das WordPress-Lizenzplugin hat keinen Aktivierungstoken geliefert.');
    writeLicense(activated);
    return res.json({ success: true, data: publicStatus(activated) });
  } catch (error: any) {
    pending.lastError = extractError(error); writeLicense(pending);
    return res.status(502).json({ success: false, error: pending.lastError, data: publicStatus(pending) });
  }
});

router.post('/validate', requirePermission('canManageSettings') as any, async (_req: AuthRequest, res: Response) => {
  const current = readLicense();
  if (!current.siteUrl || !current.licenseKey || !current.activationToken) return res.status(400).json({ success: false, error: 'Keine aktivierte Lizenz vorhanden.', data: publicStatus(current) });
  try {
    const response = await wordpressRequest(current.siteUrl, '/validate', { license_key: current.licenseKey, installation_id: current.installationId }, current.activationToken);
    const next = applyRemoteLicense(current, response, 'active'); writeLicense(next);
    return res.json({ success: true, data: publicStatus(next) });
  } catch (error: any) {
    const next: LicenseSettings = { ...current, status: 'offline', lastError: extractError(error) }; writeLicense(next);
    return res.status(502).json({ success: false, error: next.lastError, data: publicStatus(next) });
  }
});

router.post('/import', requirePermission('canManageSettings') as any, (req: AuthRequest, res: Response) => {
  const document = req.body?.document || req.body;
  const result = verifyOfflineDocument(document);
  if (!result.valid) return res.status(400).json({ success: false, error: result.reason });
  const payload = result.payload;
  const now = new Date().toISOString();
  const plan: LicensePlan = ['monthly', 'yearly', 'lifetime', 'special'].includes(payload.plan) ? payload.plan : 'special';
  const imported: LicenseSettings = {
    ...readLicense(), siteUrl: String(payload.license_server || ''), licenseKey: String(payload.license_key || ''),
    label: String(payload.installation_label || payload.customer_name || 'Offline-Lizenz'), installationId: ensureInstallationId(String(payload.installation_id || '')),
    activationToken: String(payload.activation_token || ''), status: 'active', lastValidatedAt: now,
    activatedAt: String(payload.activated_at || now), expiresAt: payload.expires_at || null, licenseId: payload.license_id || null,
    productName: String(payload.product_name || `PodCore ${plan} Lizenz`), plan, publicKey: String(payload.public_key || ''),
    signature: String(document.signature || ''), licenseDocument: document, verificationMode: 'offline', lastError: null,
  };
  writeLicense(imported);
  return res.json({ success: true, data: publicStatus(imported) });
});

router.get('/export-pdf', requireAuth as any, async (_req: AuthRequest, res: Response) => {
  try {
    const license = readLicense();
    if (!license.licenseKey) return res.status(400).json({ success: false, error: 'Kein Lizenznachweis vorhanden.' });
    const pdf = await generateLicensePdf(license);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="podcore-lizenznachweis.pdf"');
    res.setHeader('Content-Length', pdf.length);
    return res.send(pdf);
  } catch (error: any) { return res.status(500).json({ success: false, error: error.message }); }
});

router.post('/deactivate', requirePermission('canManageSettings') as any, async (_req: AuthRequest, res: Response) => {
  const current = readLicense();
  if (!current.siteUrl || !current.activationToken) return res.status(400).json({ success: false, error: 'Keine Aktivierung vorhanden.', data: publicStatus(current) });
  try {
    await wordpressRequest(current.siteUrl, '/deactivate', { license_key: current.licenseKey, installation_id: current.installationId }, current.activationToken);
    const next: LicenseSettings = { ...current, activationToken: '', status: 'deactivated', lastValidatedAt: new Date().toISOString(), lastError: null };
    writeLicense(next);
    return res.json({ success: true, data: publicStatus(next) });
  } catch (error: any) {
    const next: LicenseSettings = { ...current, lastError: extractError(error) }; writeLicense(next);
    return res.status(502).json({ success: false, error: next.lastError, data: publicStatus(next) });
  }
});

export default router;
