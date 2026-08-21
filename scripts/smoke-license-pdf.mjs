import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { generateLicensePdf } from '../server/dist/routers/license.js';

const outputDirectory = resolve(process.cwd(), '../release-v2.16.31/validation');
await mkdir(outputDirectory, { recursive: true });

const licensePdf = await generateLicensePdf({
  licenseKey: 'PODCORE-LIFETIME-TEST-2026',
  productName: 'PodCore Lifetime Lizenz',
  plan: 'lifetime',
  status: 'active',
  label: 'Validierungsinstallation',
  activatedAt: '2026-08-21T10:30:00.000Z',
  lastValidatedAt: '2026-08-21T10:30:00.000Z',
  expiresAt: null,
  verificationMode: 'offline',
  siteUrl: 'https://podcore.de',
  installationId: 'validation-installation-2026',
  activationToken: '',
  licenseId: 'validation-license',
  publicKey: '',
  signature: '',
  licenseDocument: null,
  lastError: null,
  trialStartedAt: null,
});

const outputPath = resolve(outputDirectory, 'podcore-lizenznachweis-smoketest.pdf');
await writeFile(outputPath, licensePdf);
console.log(outputPath);
