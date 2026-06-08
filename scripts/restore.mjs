// Standalone restore runner.
//
//   node scripts/restore.mjs backups/mvba-backup-20260608-020000.mvbak --yes
//   node scripts/restore.mjs <file> --mode=merge
//   node scripts/restore.mjs <file>.archive.gz            # mongodump archive
//
// Replace mode (default) wipes collections before reinserting; it requires --yes
// as a guard. Merge mode upserts by _id and never deletes.

import 'dotenv/config';
import fs from 'node:fs';
import mongoose from 'mongoose';
import { spawnSync } from 'node:child_process';
import { parseBackupBundle, restoreBundle } from '../lib/backup.mjs';

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith('--'));
const getArg = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : fallback;
};
const hasFlag = (name) => args.includes(`--${name}`);

const file = positional[0];
const mode = getArg('mode', 'replace');
const engine = getArg('engine', 'auto');

const MONGODB_URI = process.env.MONGODB_URI;
const log = (msg) => console.log(`[restore] ${msg}`);

if (!file) {
  console.error('Usage: node scripts/restore.mjs <backup-file> [--mode=replace|merge] [--yes]');
  process.exit(1);
}
if (!fs.existsSync(file)) {
  console.error(`❌ File not found: ${file}`);
  process.exit(1);
}
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set. Add it to your .env file.');
  process.exit(1);
}
if (mode === 'replace' && !hasFlag('yes')) {
  console.error('⚠️  Replace mode wipes existing collections. Re-run with --yes to confirm.');
  process.exit(1);
}

const useMongodump = engine === 'mongodump' || (engine === 'auto' && file.endsWith('.archive.gz'));

try {
  if (useMongodump) {
    log(`running mongorestore from ${file} (drop + restore)`);
    const res = spawnSync('mongorestore', [`--uri=${MONGODB_URI}`, `--archive=${file}`, '--gzip', '--drop'], {
      stdio: 'inherit',
    });
    if (res.error) {
      throw new Error(`mongorestore not available: ${res.error.message}`);
    }
    if (res.status !== 0) {
      throw new Error(`mongorestore exited with code ${res.status}`);
    }
    log('✅ restore complete');
  } else {
    const buffer = fs.readFileSync(file);
    log('validating backup...');
    const parsed = parseBackupBundle(buffer);
    log(`backup from ${parsed.manifest.createdAt} — ${parsed.manifest.documentCount} documents`);

    await mongoose.connect(MONGODB_URI);
    const summary = await restoreBundle(mongoose.connection.db, parsed, { mode });
    log(`✅ restored ${summary.restoredDocuments} documents across ${Object.keys(summary.collections).length} collections (${mode})`);
    await mongoose.disconnect();
  }
  process.exit(0);
} catch (error) {
  console.error(`[restore] ❌ ${error.message}`);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
}
