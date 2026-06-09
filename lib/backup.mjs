// Core backup engine: serializes every MongoDB collection (including the
// GridFS `school-files.*` collections that hold uploaded documents) into a
// single gzipped EJSON bundle, and restores it back.
//
// EJSON (extended JSON) is used so ObjectId / Date / Binary / Decimal128 etc.
// round-trip with full fidelity — a plain JSON.stringify would corrupt them.
//
// These functions operate on a native `db` handle (mongoose.connection.db) so
// the same code is shared by the Next.js API routes and the CLI scripts.

import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { EJSON } from 'bson';

export const BACKUP_FORMAT = 'mvba-backup';
export const BACKUP_VERSION = 1;
export const BACKUP_EXTENSION = '.mvbak';

// Collections we never touch (Mongo internals). The app's own data — students,
// enrollments, financials, archives, system_settings, and the GridFS buckets —
// is all captured.
const isSkippable = (name) => name.startsWith('system.');

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

export async function listBackupCollections(db) {
  const cols = await db.listCollections({}, { nameOnly: true }).toArray();
  return cols
    .map((c) => c.name)
    .filter((name) => !isSkippable(name))
    .sort();
}

async function gatherData(db) {
  const names = await listBackupCollections(db);
  const data = {};
  const counts = {};

  for (const name of names) {
    const docs = await db.collection(name).find({}).toArray();
    data[name] = docs;
    counts[name] = docs.length;
  }

  return { data, counts };
}

/**
 * Build a backup bundle from the database.
 * @returns {Promise<{ buffer: Buffer, manifest: object }>}
 */
export async function createBackupBundle(db, meta = {}) {
  const { data, counts } = await gatherData(db);

  // Canonical EJSON of the data section is what the checksum protects.
  const dataString = EJSON.stringify(data, { relaxed: false });
  const checksum = sha256(dataString);

  const manifest = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    appVersion: meta.appVersion ?? null,
    database: db.databaseName,
    schoolYear: meta.schoolYear ?? null,
    collections: counts,
    documentCount: Object.values(counts).reduce((sum, n) => sum + n, 0),
    checksum,
  };

  const bundleString = EJSON.stringify({ manifest, data }, { relaxed: false });
  const buffer = zlib.gzipSync(Buffer.from(bundleString, 'utf8'), { level: 9 });

  return { buffer, manifest };
}

/**
 * Decode and validate a backup bundle buffer.
 * Throws with a human-readable message if the file is not a valid, intact backup.
 * @returns {{ manifest: object, data: Record<string, object[]> }}
 */
export function parseBackupBundle(buffer) {
  let text;
  try {
    text = zlib.gunzipSync(buffer).toString('utf8');
  } catch {
    throw new Error('This is not a valid backup file (could not decompress).');
  }

  let bundle;
  try {
    bundle = EJSON.parse(text);
  } catch {
    throw new Error('Backup file is corrupted (could not read its contents).');
  }

  const manifest = bundle?.manifest;
  const data = bundle?.data;

  if (!manifest || manifest.format !== BACKUP_FORMAT) {
    throw new Error('Unrecognized file — this does not look like a system backup.');
  }
  if (manifest.version > BACKUP_VERSION) {
    throw new Error(`Backup was made by a newer version (v${manifest.version}). Update the app before restoring.`);
  }
  if (!data || typeof data !== 'object') {
    throw new Error('Backup file has no data to restore.');
  }

  if (manifest.checksum) {
    const dataString = EJSON.stringify(data, { relaxed: false });
    if (sha256(dataString) !== manifest.checksum) {
      throw new Error('Backup failed its integrity check — the file may be damaged. Restore aborted.');
    }
  }

  return { manifest, data };
}

/**
 * Restore a parsed bundle into the database.
 * @param {object} parsed - result of parseBackupBundle
 * @param {{ mode?: 'replace'|'merge' }} options
 *   replace = wipe each collection then reinsert the snapshot (true restore)
 *   merge   = upsert documents by _id, never delete (non-destructive import)
 */
export async function restoreBundle(db, parsed, { mode = 'replace' } = {}) {
  if (mode !== 'replace' && mode !== 'merge') {
    throw new Error(`Unknown restore mode: ${mode}`);
  }

  const { data } = parsed;
  const summary = { mode, collections: {}, restoredDocuments: 0 };

  for (const [name, docs] of Object.entries(data)) {
    const col = db.collection(name);

    if (mode === 'replace') {
      await col.deleteMany({});
      if (docs.length > 0) {
        await col.insertMany(docs, { ordered: false });
      }
    } else {
      for (const doc of docs) {
        if (doc._id === undefined) {
          await col.insertOne(doc);
        } else {
          await col.replaceOne({ _id: doc._id }, doc, { upsert: true });
        }
      }
    }

    summary.collections[name] = docs.length;
    summary.restoredDocuments += docs.length;
  }

  return summary;
}
