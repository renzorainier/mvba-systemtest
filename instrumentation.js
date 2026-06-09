// Next.js instrumentation hook — runs once when the server process starts.
// We use it to launch the in-process backup safety-net scheduler.
//
// Disable by setting ENABLE_INPROCESS_BACKUP=false (e.g. when relying solely on
// Windows Task Scheduler).

export async function register() {
  // Only run in the Node.js server runtime, never on the Edge runtime.
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }
  if (process.env.ENABLE_INPROCESS_BACKUP === 'false') {
    return;
  }

  const { startBackupScheduler } = await import('@/lib/backup-scheduler-inproc.mjs');
  startBackupScheduler();
}
