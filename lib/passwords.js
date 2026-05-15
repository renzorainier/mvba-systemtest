import crypto from 'node:crypto';

const HASH_ALGORITHM = 'pbkdf2';
const HASH_DIGEST = 'sha256';
const HASH_ITERATIONS = 120000;
const HASH_KEY_LENGTH = 32;

function timingSafeEqualString(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEY_LENGTH, HASH_DIGEST)
    .toString('hex');

  return `${HASH_ALGORITHM}$${HASH_ITERATIONS}$${salt}$${hash}`;
}

export function verifyPassword(password, storedPassword) {
  if (!storedPassword) {
    return { isValid: false, needsUpgrade: false };
  }

  if (storedPassword.startsWith(`${HASH_ALGORITHM}$`)) {
    const parts = storedPassword.split('$');

    if (parts.length !== 4) {
      return { isValid: false, needsUpgrade: false };
    }

    const [, iterationsText, salt, storedHash] = parts;
    const iterations = Number(iterationsText);
    const derivedHash = crypto
      .pbkdf2Sync(password, salt, iterations, storedHash.length / 2, HASH_DIGEST)
      .toString('hex');

    return {
      isValid: timingSafeEqualString(storedHash, derivedHash),
      needsUpgrade: false,
    };
  }

  return {
    isValid: timingSafeEqualString(password, storedPassword),
    needsUpgrade: true,
  };
}