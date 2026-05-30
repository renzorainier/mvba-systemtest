import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Account from '@/models/Account';
import RecoveryLog from '@/models/RecoveryLog';
import { getAuthenticatedUser } from '@/lib/auth';
import { generateRecoveryCode, hashRecoveryCode } from '@/lib/recovery-codes';
import { getClientIp } from '@/lib/login-security';

export async function POST(request, { params }) {
  try {
    const user = getAuthenticatedUser(request);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const ip = getClientIp(request);

    await dbConnect();
    const account = await Account.findById(id);
    if (!account) {
      return NextResponse.json({ success: false, message: 'Account not found.' }, { status: 404 });
    }

    const plaintext = generateRecoveryCode();
    account.recoveryCodeHash = hashRecoveryCode(plaintext);
    account.recoveryCodeCreatedAt = new Date();
    account.recoveryCodeUsedAt = null;
    await account.save();

    await RecoveryLog.create({
      username: account.username,
      accountId: account._id,
      action: 'code_generated',
      ip,
      metadata: { generatedBy: user.name },
    });

    // The plaintext is returned exactly once here and never stored
    return NextResponse.json({ success: true, plaintext });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
