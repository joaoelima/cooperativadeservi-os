import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
let activeHashes = 0;
async function derive(password, salt) {
  if (activeHashes >= 2) throw Object.assign(new Error('Hash capacity reached'), { code: 'AUTH_BUSY' });
  activeHashes++;
  try { return await scrypt(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }); }
  finally { activeHashes--; }
}
export const sessionDigest = token => createHash('sha256').update(token).digest('hex');
export const newToken = () => randomBytes(32).toString('base64url');
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt);
  return `scrypt:${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  const [algorithm, salt, hex] = stored.split(':');
  if (algorithm !== 'scrypt' || !salt || !hex) return false;
  const actual = await derive(password, salt);
  const expected = Buffer.from(hex, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function parseCredentials(body, registration = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const { email, password, name } = body;
  if (typeof email !== 'string' || typeof password !== 'string') return null;
  const normalized = email.trim().toLowerCase();
  if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return null;
  if (password.length < (registration ? 15 : 1) || password.length > 128) return null;
  if (registration && (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100)) return null;
  return { email: normalized, password, ...(registration ? { name: name.trim() } : {}) };
}
