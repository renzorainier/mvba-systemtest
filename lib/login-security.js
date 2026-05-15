const loginAttemptsByIp = new Map();
const loginAttemptsByUsername = new Map();

const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const IP_ATTEMPT_LIMIT = 15;
const USERNAME_ATTEMPT_LIMIT = 8;
const USERNAME_LOCKOUT_MS = 15 * 60 * 1000;

function getBucket(map, key) {
  if (!map.has(key)) {
    map.set(key, {
      attempts: [],
      lockedUntil: null,
      lastSeenAt: Date.now(),
    });
  }

  return map.get(key);
}

function pruneBucket(bucket, now) {
  bucket.attempts = bucket.attempts.filter((timestamp) => now - timestamp < ATTEMPT_WINDOW_MS);

  if (bucket.lockedUntil && bucket.lockedUntil <= now) {
    bucket.lockedUntil = null;
  }
}

function trackAttempt(map, key, limit) {
  const now = Date.now();
  const bucket = getBucket(map, key);

  bucket.lastSeenAt = now;
  pruneBucket(bucket, now);
  bucket.attempts.push(now);

  const isOverLimit = bucket.attempts.length > limit;

  if (isOverLimit && !bucket.lockedUntil) {
    bucket.lockedUntil = now + ATTEMPT_WINDOW_MS;
  }

  return {
    bucket,
    isOverLimit,
    retryAfterMs: bucket.lockedUntil ? Math.max(bucket.lockedUntil - now, 0) : ATTEMPT_WINDOW_MS,
  };
}

function clearStaleBucket(map, key, bucket) {
  if (!bucket.lockedUntil && bucket.attempts.length === 0 && Date.now() - bucket.lastSeenAt > ATTEMPT_WINDOW_MS * 2) {
    map.delete(key);
  }
}

export function getClientIp(request) {
  const forwardedFor = request.headers.get('x-forwarded-for');

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

export function checkLoginThrottle({ ip, username }) {
  const normalizedUsername = String(username || '').trim().toLowerCase() || 'unknown';

  const ipResult = trackAttempt(loginAttemptsByIp, ip, IP_ATTEMPT_LIMIT);
  const usernameResult = trackAttempt(loginAttemptsByUsername, normalizedUsername, USERNAME_ATTEMPT_LIMIT);

  clearStaleBucket(loginAttemptsByIp, ip, ipResult.bucket);
  clearStaleBucket(loginAttemptsByUsername, normalizedUsername, usernameResult.bucket);

  if (ipResult.bucket.lockedUntil && ipResult.bucket.lockedUntil > Date.now()) {
    return {
      allowed: false,
      status: 429,
      message: 'Too many login attempts from this network. Try again later.',
      retryAfterMs: ipResult.retryAfterMs,
    };
  }

  if (usernameResult.bucket.lockedUntil && usernameResult.bucket.lockedUntil > Date.now()) {
    return {
      allowed: false,
      status: 429,
      message: 'Too many attempts for this user. Try again later.',
      retryAfterMs: usernameResult.retryAfterMs,
    };
  }

  if (ipResult.isOverLimit) {
    console.warn('[login] rate limit triggered by IP', {
      ip,
      username: normalizedUsername,
      attempts: ipResult.bucket.attempts.length,
    });

    return {
      allowed: false,
      status: 429,
      message: 'Too many login attempts from this network. Try again later.',
      retryAfterMs: ipResult.retryAfterMs,
    };
  }

  if (usernameResult.isOverLimit) {
    console.warn('[login] rate limit triggered by username', {
      ip,
      username: normalizedUsername,
      attempts: usernameResult.bucket.attempts.length,
    });

    return {
      allowed: false,
      status: 429,
      message: 'Too many attempts for this user. Try again later.',
      retryAfterMs: usernameResult.retryAfterMs,
    };
  }

  return { allowed: true };
}

export function recordLoginFailure({ ip, username, account }) {
  const normalizedUsername = String(username || '').trim().toLowerCase() || 'unknown';
  const now = new Date();

  const ipBucket = getBucket(loginAttemptsByIp, ip);
  const usernameBucket = getBucket(loginAttemptsByUsername, normalizedUsername);

  ipBucket.lastSeenAt = Date.now();
  usernameBucket.lastSeenAt = Date.now();

  if (account) {
    account.failedLoginAttempts = Number(account.failedLoginAttempts || 0) + 1;
    account.lastFailedLoginAt = now;

    if (account.failedLoginAttempts >= 5) {
      account.lockoutUntil = new Date(Date.now() + USERNAME_LOCKOUT_MS);
      account.failedLoginAttempts = 0;
    }

    return account;
  }

  return null;
}

export function recordLoginSuccess({ ip, username, account }) {
  const normalizedUsername = String(username || '').trim().toLowerCase() || 'unknown';

  loginAttemptsByIp.delete(ip);
  loginAttemptsByUsername.delete(normalizedUsername);

  if (!account) {
    return null;
  }

  account.failedLoginAttempts = 0;
  account.lockoutUntil = null;
  account.lastSuccessfulLoginAt = new Date();
  account.lastFailedLoginAt = null;

  return account;
}