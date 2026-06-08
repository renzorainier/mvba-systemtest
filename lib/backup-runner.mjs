// Glue between the engine, the filesystem, and the persisted schedule config.
// Reads/writes the backup settings stored on the singleton system_settings
// document, and performs a full "scheduled" backup to disk with pruning.
//
// Uses the raw collection (not the Mongoose model) so it works identically from
// the API, the in-process scheduler, and the standalone CLI scripts.

import { createBackupBundle } from './backup.mjs';
import { writeBackup, pruneBackups, SCHEDULED_PREFIX } from './backup-fs.mjs';
import {
  DEFAULT_BACKUP_FREQUENCY,
  DEFAULT_BACKUP_RETENTION,
  isValidFrequency,
} from './backup-schedule.mjs';

const SETTINGS_KEY = 'tuition-breakdown';
const settingsCollection = (db) => db.collection('system_settings');

export async function getBackupConfig(db) {
  const settings = await settingsCollection(db).findOne({ key: SETTINGS_KEY });

  return {
    frequency: isValidFrequency(settings?.backupFrequency) ? settings.backupFrequency : DEFAULT_BACKUP_FREQUENCY,
    retention: Number.isFinite(settings?.backupRetention) ? settings.backupRetention : DEFAULT_BACKUP_RETENTION,
    lastBackupAt: settings?.lastBackupAt ?? null,
    lastBackupStatus: settings?.lastBackupStatus ?? null,
    lastBackupError: settings?.lastBackupError ?? null,
    lastBackupSize: settings?.lastBackupSize ?? null,
    lastBackupFile: settings?.lastBackupFile ?? null,
    currentSchoolYear: settings?.currentSchoolYear ?? null,
  };
}

export async function setBackupConfig(db, { frequency, retention } = {}) {
  const update = {};

  if (frequency !== undefined) {
    if (!isValidFrequency(frequency)) {
      throw new Error('Backup frequency must be off, weekly, or monthly.');
    }
    update.backupFrequency = frequency;
  }

  if (retention !== undefined) {
    const value = Number(retention);
    if (!Number.isInteger(value) || value < 1 || value > 60) {
      throw new Error('Keep-count must be a whole number between 1 and 60.');
    }
    update.backupRetention = value;
  }

  if (Object.keys(update).length > 0) {
    await settingsCollection(db).updateOne({ key: SETTINGS_KEY }, { $set: update });
  }

  return getBackupConfig(db);
}

async function recordResult(db, fields) {
  await settingsCollection(db).updateOne({ key: SETTINGS_KEY }, { $set: fields });
}

/**
 * Create a backup, write it to the backups directory, prune old ones, and
 * stamp the result on the settings doc. Throws on failure (after recording it).
 */
export async function runScheduledBackup(db, { retention, appVersion, schoolYear } = {}) {
  const cfg = await getBackupConfig(db);
  const keep = Number.isFinite(retention) ? retention : cfg.retention;

  try {
    const { buffer, manifest } = await createBackupBundle(db, {
      appVersion,
      schoolYear: schoolYear ?? cfg.currentSchoolYear,
    });

    const written = writeBackup(buffer, SCHEDULED_PREFIX);
    const pruned = pruneBackups(keep, SCHEDULED_PREFIX);

    await recordResult(db, {
      lastBackupAt: new Date(),
      lastBackupStatus: 'success',
      lastBackupError: null,
      lastBackupSize: buffer.length,
      lastBackupFile: written.name,
    });

    return { manifest, file: written, pruned };
  } catch (error) {
    await recordResult(db, {
      lastBackupStatus: 'error',
      lastBackupError: error.message,
    });
    throw error;
  }
}
