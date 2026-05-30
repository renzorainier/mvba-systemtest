import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Account from '@/models/Account';
import RecoveryLog from '@/models/RecoveryLog';
import { hashPassword } from '@/lib/passwords';
import { consumeResetToken } from '@/lib/reset-tokens';
import { getClientIp } from '@/lib/login-security';

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const { resetToken, newPassword } = await request.json();

    if (!resetToken || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Reset token and new password are required.' },
        { status: 400 }
      );
    }

    if (String(newPassword).length < 8) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 8 characters.' },
        { status: 400 }
      );
    }

    const accountId = consumeResetToken(String(resetToken));

    if (!accountId) {
      return NextResponse.json(
        { success: false, message: 'Reset session expired or invalid. Please start over.' },
        { status: 401 }
      );
    }

    await dbConnect();
    const account = await Account.findById(accountId);

    if (!account || !account.isActive) {
      return NextResponse.json(
        { success: false, message: 'Account not found or is disabled.' },
        { status: 404 }
      );
    }

    account.password = hashPassword(String(newPassword));
    account.recoveryCodeUsedAt = new Date();
    // Clear the code hash so it cannot be reused even if someone finds the plaintext later
    account.recoveryCodeHash = null;
    account.failedLoginAttempts = 0;
    account.lockoutUntil = null;
    await account.save();

    await RecoveryLog.create({
      username: account.username,
      accountId: account._id,
      action: 'password_reset',
      ip,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'An unexpected error occurred.' }, { status: 500 });
  }
}
