import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import { getBackupConfig, setBackupConfig, runScheduledBackup } from '@/lib/backup-runner.mjs';
import { listBackups } from '@/lib/backup-fs.mjs';
import { nextDueDate, isBackupDue, describeFrequency } from '@/lib/backup-schedule.mjs';

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

const buildState = async (db) => {
  const config = await getBackupConfig(db);
  const due = nextDueDate(config.lastBackupAt, config.frequency);

  return {
    frequency: config.frequency,
    frequencyLabel: describeFrequency(config.frequency),
    retention: config.retention,
    lastBackupAt: config.lastBackupAt,
    lastBackupStatus: config.lastBackupStatus,
    lastBackupError: config.lastBackupError,
    lastBackupSize: config.lastBackupSize,
    lastBackupFile: config.lastBackupFile,
    nextDueAt: due && due.getTime() > 0 ? due.toISOString() : null,
    isDue: isBackupDue(config.lastBackupAt, config.frequency),
    backups: listBackups(),
  };
};

export async function GET(request) {
  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ success: false, error: 'Admin access required.' }, { status: 403 });
    }
    await dbConnect();
    return NextResponse.json({ success: true, data: await buildState(mongoose.connection.db) }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ success: false, error: 'Admin access required.' }, { status: 403 });
    }
    await dbConnect();
    const db = mongoose.connection.db;

    const body = await request.json();
    await setBackupConfig(db, { frequency: body.frequency, retention: body.retention });

    return NextResponse.json({ success: true, data: await buildState(db) }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

// Trigger an immediate server-side backup to the backups/ folder (same as the scheduler).
export async function POST(request) {
  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ success: false, error: 'Admin access required.' }, { status: 403 });
    }
    await dbConnect();
    const db = mongoose.connection.db;

    const result = await runScheduledBackup(db, {});

    return NextResponse.json(
      {
        success: true,
        data: { file: result.file.name, size: result.file.size, pruned: result.pruned, state: await buildState(db) },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
