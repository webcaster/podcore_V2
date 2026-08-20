import express, { Response } from 'express';
import http from 'http';
import https from 'https';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import { getDb } from '../database';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';

const router: import('express').Router = express.Router();

interface LicenseSettings {
  siteUrl: string;
  consumerKey: string;
  consumerSecret: string;
  licenseKey: string;
  software: string;
  label: string;
  activationToken: string;
  status: 'unconfigured' | 'active' | 'invalid' | 'offline' | 'deactivated';
  lastValidatedAt: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
  licenseId: string | number | null;
  productName: string;
  plan: 'monthly' | 'yearly' | 'lifetime' | 'special' | 'unknown';
  publicKey: string;
  signature: string;
  licenseDocument: any | null;
  verificationMode: 'online' | 'offline' | 'legacy';
  lastError: string | null;
}

const GRACE_PERIOD_DAYS = 14;

const DEFAULT_LICENSE: LicenseSettings = {
  siteUrl: 'https://podcore.de',
  consumerKey: '',
  consumerSecret: '',
  licenseKey: '',
  software: '',
  label: 'PodCore Installation',
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
  verificationMode: 'legacy',
  lastError: null,
};

function readAppSettings(): Record<string, any> {
  const db = getDb();
  const row = db.get('SELECT value FROM settings WHERE key = ?', ['app']) as any;
  if (!row?.value) return {};
  try { return JSON.parse(row.value); } catch { return {}; }
}

function readLicense(): LicenseSettings {
  const settings = readAppSettings();
  return { ...DEFAULT_LICENSE, ...(settings.license || {}) };
}

function writeLicense(license: LicenseSettings): void {
  const db = getDb();
  const current = readAppSettings();
  const next = { ...current, license };
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

function detectPlan(productName: string, expiresAt: string | null): 'monthly' | 'yearly' | 'lifetime' | 'unknown' {
  const value = productName.toLowerCase();
  if (/(lifetime|lebenslang|unbefristet|permanent|never\s*expire|sonderkunde|exclusive)/i.test(value)) return 'lifetime';
  if (/(jährlich|jaehrlich|yearly|annual|12\s*monat|365\s*day)/i.test(value)) return 'yearly';
  if (/(monatlich|monthly|30\s*day)/i.test(value)) return 'monthly';
  if (expiresAt) {
    const days = (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (days > 300) return 'yearly';
    if (days > 0 && days <= 90) return 'monthly';
  }
  return 'unknown';
}

function publicStatus(license: LicenseSettings) {
  let effectiveStatus = license.status;
  let isGracePeriod = false;

  if (license.status === 'offline' && license.lastValidatedAt) {
    const lastCheck = new Date(license.lastValidatedAt).getTime();
    const now = Date.now();
    const diffDays = (now - lastCheck) / (1000 * 60 * 60 * 24);
    
    if (diffDays <= GRACE_PERIOD_DAYS) {
      effectiveStatus = 'active';
      isGracePeriod = true;
    }
  }

  return {
    configured: Boolean(license.siteUrl && license.consumerKey && license.consumerSecret && license.licenseKey),
    siteUrl: license.siteUrl,
    software: license.software,
    label: license.label,
    status: effectiveStatus,
    realStatus: license.status,
    isGracePeriod,
    gracePeriodDaysRemaining: isGracePeriod ? Math.max(0, Math.floor(GRACE_PERIOD_DAYS - (Date.now() - new Date(license.lastValidatedAt!).getTime()) / (1000 * 60 * 60 * 24))) : 0,
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

function dlmRequest(siteUrl: string, endpoint: string, consumerKey: string, consumerSecret: string): Promise<any> {
  return new Promise((resolve, reject) => {
    let base: URL;
    try {
      base = new URL(siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`);
      if (base.protocol !== 'https:' && base.protocol !== 'http:') throw new Error('Nur HTTP oder HTTPS ist erlaubt');
    } catch (error: any) {
      reject(new Error(`Ungültige Lizenz-Webseite: ${error.message}`));
      return;
    }

    const url = new URL(endpoint.replace(/^\//, ''), base);
    url.searchParams.set('consumer_key', consumerKey);
    url.searchParams.set('consumer_secret', consumerSecret);

    const client = url.protocol === 'https:' ? https : http;
    const request = client.get(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'PodCore-License-Client/2.15.9',
      },
      timeout: 10000,
    }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => {
        let parsed: any;
        try { parsed = JSON.parse(body); } catch { parsed = { message: body }; }
        if ((response.statusCode || 500) < 200 || (response.statusCode || 500) >= 300 || parsed?.success === false) {
          const message = parsed?.message || parsed?.error || parsed?.data?.message || `DLM antwortete mit HTTP ${response.statusCode}`;
          reject(new Error(String(message)));
          return;
        }
        resolve(parsed);
      });
    });
    request.on('timeout', () => request.destroy(new Error('Zeitüberschreitung bei der Lizenzprüfung')));
    request.on('error', reject);
  });
}

function extractLicenseData(response: any): any {
  return response?.data || response?.license || response || {};
}

function extractError(error: any): string {
  return error instanceof Error ? error.message : 'Unbekannter Fehler bei der Lizenzprüfung';
}

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
  } catch (error: any) {
    return { valid: false, reason: `Offline-Lizenz konnte nicht geprüft werden: ${error.message}` };
  }
}

function generateLicensePdf(license: LicenseSettings): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 54 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.fontSize(24).fillColor('#16324f').text('PodCore Lizenznachweis');
    doc.moveDown(0.5).fontSize(10).fillColor('#555').text('Offline verifizierbares Lizenzdokument');
    doc.moveDown(1.5).fontSize(12).fillColor('#111');
    const rows = [
      ['Lizenzschlüssel', license.licenseKey], ['Produkt', license.productName || 'PodCore'],
      ['Tarif', license.plan], ['Status', license.status], ['Ausgestellt', license.activatedAt || license.lastValidatedAt || '–'],
      ['Gültig bis', license.expiresAt || 'Unbefristet'], ['Prüfmodus', license.verificationMode],
    ];
    rows.forEach(([label, value]) => doc.text(`${label}: ${value}`));
    doc.moveDown(1.5).fontSize(9).fillColor('#555').text('Die Lizenz kann ohne Internetverbindung anhand der eingebetteten Ed25519-Signatur geprüft werden. Bewahren Sie dieses PDF und die zugehörige Lizenzdatei sicher auf.');
    if (license.signature) { doc.moveDown(1).text(`Signatur: ${license.signature}`); }
    doc.end();
  });
}

router.get('/status', requireAuth as any, (_req: AuthRequest, res: Response) => {
  return res.json({ success: true, data: publicStatus(readLicense()) });
});

router.post('/activate', requirePermission('canManageSettings') as any, async (req: AuthRequest, res: Response) => {
  const current = readLicense();
  const siteUrl = String(req.body.siteUrl || current.siteUrl || '').trim().replace(/\/$/, '');
  const consumerKey = String(req.body.consumerKey || current.consumerKey || '').trim();
  const consumerSecret = String(req.body.consumerSecret || current.consumerSecret || '').trim();
  const licenseKey = String(req.body.licenseKey || current.licenseKey || '').trim();
  const software = String(req.body.software ?? current.software ?? '').trim();
  const label = String(req.body.label || current.label || 'PodCore Installation').trim();

  if (!siteUrl || !consumerKey || !consumerSecret || !licenseKey) {
    return res.status(400).json({ success: false, error: 'Webseite, Consumer Key, Consumer Secret und Lizenzschlüssel sind erforderlich.' });
  }

  const pending: LicenseSettings = { ...current, siteUrl, consumerKey, consumerSecret, licenseKey, software, label, status: 'invalid', lastError: null };

  try {
    const query = new URLSearchParams({ label });
    if (software) query.set('software', software);
    const response = await dlmRequest(
      siteUrl,
      `/wp-json/dlm/v1/licenses/activate/${encodeURIComponent(licenseKey)}?${query.toString()}`,
      consumerKey,
      consumerSecret
    );
    const data = extractLicenseData(response);
    const now = new Date().toISOString();
    const activated: LicenseSettings = {
      ...pending,
      activationToken: String(data.token || ''),
      status: data.token ? 'active' : 'invalid',
      lastValidatedAt: now,
      activatedAt: now,
      expiresAt: data.license?.expires_at || data.expires_at || null,
      licenseId: data.license_id || data.license?.id || data.id || null,
      productName: String(data.license?.name || data.license?.title || data.license?.product_name || data.product_name || data.product || label || '').trim(),
      plan: detectPlan(String(data.license?.name || data.license?.title || data.license?.product_name || data.product_name || data.product || label || ''), data.license?.expires_at || data.expires_at || null),
      lastError: data.token ? null : 'Die Lizenz wurde bestätigt, aber kein Aktivierungs-Token geliefert.',
    };
    writeLicense(activated);
    return res.json({ success: activated.status === 'active', data: publicStatus(activated), raw: response });
  } catch (error: any) {
    pending.lastError = extractError(error);
    writeLicense(pending);
    return res.status(502).json({ success: false, error: pending.lastError, data: publicStatus(pending) });
  }
});

router.post('/validate', requirePermission('canManageSettings') as any, async (_req: AuthRequest, res: Response) => {
  const current = readLicense();
  if (!current.siteUrl || !current.consumerKey || !current.consumerSecret || !current.activationToken) {
    return res.status(400).json({ success: false, error: 'Keine aktivierte Lizenz vorhanden.', data: publicStatus(current) });
  }

  try {
    const response = await dlmRequest(
      current.siteUrl,
      `/wp-json/dlm/v1/licenses/validate/${encodeURIComponent(current.activationToken)}`,
      current.consumerKey,
      current.consumerSecret
    );
    const data = extractLicenseData(response);
    const next: LicenseSettings = {
      ...current,
      status: data.deactivated_at ? 'deactivated' : 'active',
      lastValidatedAt: new Date().toISOString(),
      expiresAt: data.license?.expires_at || data.expires_at || current.expiresAt,
      licenseId: data.license_id || data.license?.id || current.licenseId,
      productName: String(data.license?.name || data.license?.title || data.license?.product_name || data.product_name || data.product || current.productName || '').trim(),
      plan: detectPlan(String(data.license?.name || data.license?.title || data.license?.product_name || data.product_name || data.product || current.productName || ''), data.license?.expires_at || data.expires_at || current.expiresAt),
      lastError: null,
    };
    writeLicense(next);
    return res.json({ success: next.status === 'active', data: publicStatus(next), raw: response });
  } catch (error: any) {
    const next = { ...current, status: 'offline' as const, lastError: extractError(error) };
    writeLicense(next);
    return res.status(502).json({ success: false, error: next.lastError, data: publicStatus(next) });
  }
});

router.post('/import', requirePermission('canManageSettings') as any, (req: AuthRequest, res: Response) => {
  const document = req.body?.document || req.body;
  const result = verifyOfflineDocument(document);
  if (!result.valid) return res.status(400).json({ success: false, error: result.reason });
  const payload = result.payload;
  const now = new Date().toISOString();
  const imported: LicenseSettings = {
    ...readLicense(), siteUrl: '', consumerKey: '', consumerSecret: '', licenseKey: String(payload.license_key || ''),
    software: 'podcore', label: String(payload.customer_name || 'Offline-Lizenz'), activationToken: String(payload.activation_token || ''),
    status: 'active', lastValidatedAt: now, activatedAt: String(payload.activated_at || now), expiresAt: payload.expires_at || null,
    licenseId: payload.license_id || null, productName: String(payload.product_name || `PodCore ${payload.plan || 'Lizenz'}`),
    plan: payload.plan === 'monthly' || payload.plan === 'yearly' || payload.plan === 'special' ? payload.plan : 'unknown',
    publicKey: String(payload.public_key || ''), signature: String(document.signature || ''), licenseDocument: document, verificationMode: 'offline', lastError: null,
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
  if (!current.activationToken) {
    return res.status(400).json({ success: false, error: 'Keine Aktivierung vorhanden.', data: publicStatus(current) });
  }

  try {
    const response = await dlmRequest(
      current.siteUrl,
      `/wp-json/dlm/v1/licenses/deactivate/${encodeURIComponent(current.activationToken)}`,
      current.consumerKey,
      current.consumerSecret
    );
    const next: LicenseSettings = {
      ...current,
      activationToken: '',
      status: 'deactivated',
      lastValidatedAt: new Date().toISOString(),
      lastError: null,
    };
    writeLicense(next);
    return res.json({ success: true, data: publicStatus(next), raw: response });
  } catch (error: any) {
    const next = { ...current, lastError: extractError(error) };
    writeLicense(next);
    return res.status(502).json({ success: false, error: next.lastError, data: publicStatus(next) });
  }
});

export default router;
