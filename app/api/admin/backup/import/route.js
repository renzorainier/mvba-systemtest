import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Account from '@/models/Account';
import { verifyPassword } from '@/lib/passwords';
import { parseBackupBundle, restoreBundle, createBackupBundle } from '@/lib/backup.mjs';
import { writeBackup, SAFETY_PREFIX } from '@/lib/backup-fs.mjs';

const getAdminFromToken = (request) => {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return null;
    }
    const parsed = JSON.parse(token);
    return parsed?.role === 'Admin' ? parsed : null;
  } catch {
    return null;
  }
};

// Restoring overwrites live data, so it is gated behind the admin's password and
// always takes a safety snapshot of the current state first.
export async function POST(request) {
  try {
    const adminToken = getAdminFromToken(request);
    if (!adminToken) {
      return NextResponse.json({ success: false, error: 'Admin access required.' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const mode = String(formData.get('mode') || 'replace');
    const currentPassword = String(formData.get('currentPassword') || '').trim();

    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ success: false, error: 'No backup file provided.' }, { status: 400 });
    }
    if (mode !== 'replace' && mode !== 'merge') {
      return NextResponse.json({ success: false, error: 'Invalid restore mode.' }, { status: 400 });
    }
    if (!currentPassword) {
      return NextResponse.json({ success: false, error: 'Your password is required to restore.' }, { status: 400 });
    }

    await dbConnect();

    // Confirm the requester's admin password.
    const account = await Account.findOne({ fullName: adminToken.name, role: 'Admin', isActive: true });
    const passwordCheck = account ? verifyPassword(currentPassword, account.password) : { isValid: false };
    if (!account || !passwordCheck.isValid) {
      return NextResponse.json({ success: false, error: 'Password is incorrect.' }, { status: 401 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate + integrity-check the upload BEFORE touching the database.
    const parsed = parseBackupBundle(buffer);

    const db = mongoose.connection.db;

    // Safety snapshot of the current database so a bad restore can be undone.
    let safety = null;
    try {
      const current = await createBackupBundle(db, { schoolYear: parsed.manifest.schoolYear });
      safety = writeBackup(current.buffer, SAFETY_PREFIX);
    } catch (snapshotError) {
      return NextResponse.json(
        { success: false, error: `Could not write a safety snapshot, restore aborted: ${snapshotError.message}` },
        { status: 500 }
      );
    }

    const summary = await restoreBundle(db, parsed, { mode });

    return NextResponse.json(
      {
        success: true,
        data: {
          mode,
          manifest: parsed.manifest,
          summary,
          safetySnapshot: safety?.name ?? null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
