// Filesystem helpers for on-disk backups. Shared by the API run-now action,
// the CLI scripts, and the in-process scheduler.

import fs from 'node:fs';
import path from 'node:path';
import { BACKUP_EXTENSION } from './backup.mjs';

// Files written by the scheduler/CLI; safety snapshots taken right before a
// restore get a separate prefix so retention pruning never removes them.
export const SCHEDULED_PREFIX = 'mvba-backup-';
export const SAFETY_PREFIX = 'pre-restore-';

export function getBackupsDir() {
  return process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
}

export function ensureBackupsDir() {
  const dir = getBackupsDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function timestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

export function backupFilename(prefix = SCHEDULED_PREFIX, date = new Date(), ext = BACKUP_EXTENSION) {
  return `${prefix}${timestamp(date)}${ext}`;
}

export function writeBackup(buffer, prefix = SCHEDULED_PREFIX, ext = BACKUP_EXTENSION) {
  const dir = ensureBackupsDir();
  const name = backupFilename(prefix, new Date(), ext);
  const fullPath = path.join(dir, name);
  fs.writeFileSync(fullPath, buffer);
  return { name, path: fullPath, size: buffer.length };
}

export function listBackups() {
  const dir = getBackupsDir();
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(BACKUP_EXTENSION) || f.endsWith('.archive.gz'))
    .map((f) => {
      const stat = fs.statSync(path.join(dir, f));
      return {
        name: f,
        size: stat.size,
        createdAt: stat.mtime.toISOString(),
        kind: f.startsWith(SAFETY_PREFIX) ? 'safety' : 'backup',
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Keep only the newest `retention` scheduled backups; delete older ones.
 * Safety snapshots (different prefix) are never pruned here.
 * @returns {string[]} names of deleted files
 */
export function pruneBackups(retention, prefix = SCHEDULED_PREFIX) {
  const dir = getBackupsDir();
  if (!fs.existsSync(dir) || !Number.isFinite(retention) || retention < 1) {
    return [];
  }

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith(prefix))
    .map((f) => ({ name: f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  const toRemove = files.slice(retention);
  for (const { name } of toRemove) {
    fs.unlinkSync(path.join(dir, name));
  }
  return toRemove.map((r) => r.name);
}
