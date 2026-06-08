// In-process safety net: while the app is running, check hourly whether an
// automatic backup is overdue and run one if so. This complements (does not
// replace) the OS-level scheduler — if the machine's Task Scheduler job runs,
// lastBackupAt advances and this check stays quiet. It only fires when the OS
// job has been missed (e.g. the PC was off at the scheduled time).

import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import { getBackupConfig, runScheduledBackup } from '@/lib/backup-runner.mjs';
import { isBackupDue } from '@/lib/backup-schedule.mjs';

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // hourly
const FIRST_CHECK_DELAY_MS = 60 * 1000; // 1 min after boot

let started = false;

async function checkAndRun() {
  try {
    await dbConnect();
    const db = mongoose.connection.db;
    const cfg = await getBackupConfig(db);

    if (isBackupDue(cfg.lastBackupAt, cfg.frequency)) {
      console.log('[backup] automatic backup is due — running...');
      const result = await runScheduledBackup(db, { retention: cfg.retention, schoolYear: cfg.currentSchoolYear });
      console.log(`[backup] automatic backup complete: ${result.file.name}`);
    }
  } catch (error) {
    console.error(`[backup] scheduler check failed: ${error.message}`);
  }
}

export function startBackupScheduler() {
  if (started) {
    return;
  }
  started = true;

  const first = setTimeout(checkAndRun, FIRST_CHECK_DELAY_MS);
  const interval = setInterval(checkAndRun, CHECK_INTERVAL_MS);

  // Don't keep the event loop alive purely for the timers.
  first.unref?.();
  interval.unref?.();
}
