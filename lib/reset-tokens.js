import crypto from 'node:crypto';

const RESET_TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes
const tokens = new Map(); // token -> { accountId, expiresAt }

function pruneExpired() {
  const now = Date.now();
  for (const [token, data] of tokens) {
    if (data.expiresAt < now) tokens.delete(token);
  }
}

export function createResetToken(accountId) {
  pruneExpired();
  const token = crypto.randomBytes(32).toString('hex');
  tokens.set(token, { accountId: String(accountId), expiresAt: Date.now() + RESET_TOKEN_TTL_MS });
  return token;
}

export function consumeResetToken(token) {
  pruneExpired();
  const data = tokens.get(token);
  if (!data || data.expiresAt < Date.now()) return null;
  tokens.delete(token);
  return data.accountId;
}
