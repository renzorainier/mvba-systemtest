import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Account from '@/models/Account';
import RecoveryLog from '@/models/RecoveryLog';
import { verifyRecoveryCode } from '@/lib/recovery-codes';
import { createResetToken } from '@/lib/reset-tokens';
import { getClientIp } from '@/lib/login-security';

// Simple in-memory rate limiter: 5 attempts per IP per 15 minutes
const attempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  const bucket = attempts.get(ip);
  if (!bucket || bucket.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (bucket.count >= MAX_ATTEMPTS) return false;
  bucket.count++;
  return true;
}

export async function POST(request) {
  try {
    const ip = getClientIp(request);

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, message: 'Too many attempts. Please wait 15 minutes and try again.' },
        { status: 429 }
      );
    }

    const { username, recoveryCode } = await request.json();
    const normalizedUsername = String(username || '').trim();
    const normalizedCode = String(recoveryCode || '').trim();

    if (!normalizedUsername || !normalizedCode) {
      return NextResponse.json(
        { success: false, message: 'Username and recovery code are required.' },
        { status: 400 }
      );
    }

    await dbConnect();
    const account = await Account.findOne({ username: normalizedUsername });

    const logBase = { username: normalizedUsername, ip };

    // Always return the same error to prevent username enumeration
    if (!account || !account.isActive) {
      await RecoveryLog.create({ ...logBase, action: 'verify_failed', metadata: { reason: account ? 'inactive' : 'not_found' } });
      return NextResponse.json(
        { success: false, message: 'Invalid username or recovery code.' },
        { status: 401 }
      );
    }

    if (!account.recoveryCodeHash) {
      await RecoveryLog.create({ ...logBase, accountId: account._id, action: 'verify_failed', metadata: { reason: 'no_code' } });
      return NextResponse.json(
        { success: false, message: 'Invalid username or recovery code.' },
        { status: 401 }
      );
    }

    if (account.recoveryCodeUsedAt) {
      await RecoveryLog.create({ ...logBase, accountId: account._id, action: 'verify_failed', metadata: { reason: 'already_used' } });
      return NextResponse.json(
        { success: false, message: 'This recovery code has already been used. Contact an administrator to generate a new one.' },
        { status: 401 }
      );
    }

    const isValid = verifyRecoveryCode(normalizedCode, account.recoveryCodeHash);

    if (!isValid) {
      await RecoveryLog.create({ ...logBase, accountId: account._id, action: 'verify_failed', metadata: { reason: 'wrong_code' } });
      return NextResponse.json(
        { success: false, message: 'Invalid username or recovery code.' },
        { status: 401 }
      );
    }

    const resetToken = createResetToken(account._id);
    await RecoveryLog.create({ ...logBase, accountId: account._id, action: 'verify_success' });

    return NextResponse.json({ success: true, resetToken });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'An unexpected error occurred.' }, { status: 500 });
  }
}
