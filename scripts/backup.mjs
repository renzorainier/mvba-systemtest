// Standalone backup runner — used by Windows Task Scheduler / cron and runnable
// by hand. Writes a timestamped backup into the backups/ folder and prunes old
// ones according to the configured retention.
//
//   node scripts/backup.mjs                  # in-app EJSON bundle (default)
//   node scripts/backup.mjs --engine=mongodump
//   node scripts/backup.mjs --retention=12
//
// Requires MONGODB_URI in the environment (loaded from .env).

import 'dotenv/config';
import mongoose from 'mongoose';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runScheduledBackup, getBackupConfig } from '../lib/backup-runner.mjs';
import { ensureBackupsDir, backupFilename, pruneBackups, SCHEDULED_PREFIX } from '../lib/backup-fs.mjs';

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : fallback;
};

const engine = getArg('engine', 'json');
const retentionArg = getArg('retention', null);

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set. Add it to your .env file.');
  process.exit(1);
}

const log = (msg) => console.log(`[backup] ${msg}`);

async function runJsonEngine() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const cfg = await getBackupConfig(db);
  const retention = retentionArg !== null ? Number(retentionArg) : cfg.retention;

  log(`creating EJSON backup of "${db.databaseName}"...`);
  const result = await runScheduledBackup(db, { retention, schoolYear: cfg.currentSchoolYear });

  log(`✅ wrote ${result.file.name} (${(result.file.size / 1024).toFixed(1)} KB)`);
  if (result.pruned.length) {
    log(`pruned ${result.pruned.length} old backup(s): ${result.pruned.join(', ')}`);
  }
  await mongoose.disconnect();
}

async function runMongodumpEngine() {
  const dir = ensureBackupsDir();
  const name = backupFilename(SCHEDULED_PREFIX, new Date(), '.archive.gz');
  const out = path.join(dir, name);

  log(`running mongodump -> ${name}`);
  const res = spawnSync('mongodump', [`--uri=${MONGODB_URI}`, `--archive=${out}`, '--gzip'], {
    stdio: 'inherit',
  });

  if (res.error) {
    throw new Error(`mongodump not available: ${res.error.message}`);
  }
  if (res.status !== 0) {
    throw new Error(`mongodump exited with code ${res.status}`);
  }

  // Stamp the run + prune using the configured retention.
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const cfg = await getBackupConfig(db);
  const retention = retentionArg !== null ? Number(retentionArg) : cfg.retention;
  const { statSync } = await import('node:fs');
  await db.collection('system_settings').updateOne(
    { key: 'tuition-breakdown' },
    {
      $set: {
        lastBackupAt: new Date(),
        lastBackupStatus: 'success',
        lastBackupError: null,
        lastBackupSize: statSync(out).size,
        lastBackupFile: name,
      },
    }
  );
  const pruned = pruneBackups(retention, SCHEDULED_PREFIX);
  log(`✅ wrote ${name}`);
  if (pruned.length) {
    log(`pruned ${pruned.length} old backup(s)`);
  }
  await mongoose.disconnect();
}

try {
  if (engine === 'mongodump') {
    await runMongodumpEngine();
  } else {
    await runJsonEngine();
  }
  process.exit(0);
} catch (error) {
  console.error(`[backup] ❌ ${error.message}`);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
}
