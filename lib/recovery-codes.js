import crypto from 'node:crypto';

// 32-char alphabet excluding visually ambiguous chars (0, O, I, 1, L)
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const SEGMENTS = 5;
const SEGMENT_LENGTH = 5;

export function generateRecoveryCode() {
  const bytes = crypto.randomBytes(SEGMENTS * SEGMENT_LENGTH);
  const segments = [];
  for (let s = 0; s < SEGMENTS; s++) {
    let segment = '';
    for (let i = 0; i < SEGMENT_LENGTH; i++) {
      segment += ALPHABET[bytes[s * SEGMENT_LENGTH + i] % ALPHABET.length];
    }
    segments.push(segment);
  }
  return segments.join('-');
}

export function hashRecoveryCode(code) {
  const normalized = code.replace(/-/g, '').toUpperCase();
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(normalized, salt, 10000, 32, 'sha256').toString('hex');
  return `rc1$10000$${salt}$${hash}`;
}

export function verifyRecoveryCode(code, stored) {
  if (!stored || !stored.startsWith('rc1$')) return false;
  const parts = stored.split('$');
  if (parts.length !== 4) return false;
  const [, iterationsText, salt, storedHash] = parts;
  const normalized = code.replace(/-/g, '').toUpperCase();
  const derived = crypto
    .pbkdf2Sync(normalized, salt, Number(iterationsText), storedHash.length / 2, 'sha256')
    .toString('hex');
  const left = Buffer.from(storedHash);
  const right = Buffer.from(derived);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}
