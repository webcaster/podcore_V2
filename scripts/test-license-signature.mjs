import crypto from 'node:crypto';

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const rawPublic = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32);
const payload = {
  format: 'podcore-license-v1',
  license_key: 'PC-TEST-0000000000000000',
  license_id: 1,
  plan: 'special',
  status: 'active',
  issued_at: '2026-08-20T00:00:00Z',
  expires_at: null,
  customer_email: 'test@example.com',
  customer_name: 'Test',
  max_activations: 1,
  activation_token: null,
  activated_at: null,
  public_key: rawPublic.toString('base64'),
};
const canonical = JSON.stringify(payload);
const signature = crypto.sign(null, Buffer.from(canonical), privateKey);
const derPrefix = Buffer.from('302a300506032b6570032100', 'hex');
const verifyKey = crypto.createPublicKey({ key: Buffer.concat([derPrefix, rawPublic]), format: 'der', type: 'spki' });
if (!crypto.verify(null, Buffer.from(canonical), verifyKey, signature)) throw new Error('Ed25519 verification failed');
console.log('PASS: PodCore license payload verifies with Ed25519.');
