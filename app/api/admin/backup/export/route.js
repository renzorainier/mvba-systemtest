import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import { createBackupBundle } from '@/lib/backup.mjs';
import { backupFilename } from '@/lib/backup-fs.mjs';

const isAdminRequest = (request) => {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return false;
    }
    return JSON.parse(token)?.role === 'Admin';
  } catch {
    return false;
  }
};

// POST so it's a deliberate action (and never prefetched/cached by the browser).
export async function POST(request) {
  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ success: false, error: 'Admin access required.' }, { status: 403 });
    }

    await dbConnect();
    const db = mongoose.connection.db;

    const settings = await db.collection('system_settings').findOne({ key: 'tuition-breakdown' });
    const { buffer, manifest } = await createBackupBundle(db, {
      schoolYear: settings?.currentSchoolYear ?? null,
    });

    const filename = backupFilename();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
        'X-Backup-Checksum': manifest.checksum,
        'X-Backup-Documents': String(manifest.documentCount),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
