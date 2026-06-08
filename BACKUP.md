# Backup & Restore

Full export / import of all system data, plus automatic scheduled backups.

## What's included

Every MongoDB collection in the database, captured with full type fidelity
(ObjectId, Date, Decimal, binary). That means:

- All live data — students, enrollments, financials, schedules, curriculums,
  sections, class assignments, teachers, accounts, system settings.
- All archived data (`archived_*` collections).
- **Uploaded files** — the GridFS `school-files.*` buckets (student documents,
  receipts, etc.) are backed up too, so nothing is lost.

Backups are a single gzipped file (`*.mvbak`) with an embedded manifest and a
SHA-256 integrity checksum that is verified before any restore.

## In the app (admins only)

**System Settings → Backup & Restore** (`/portal/system/backup`):

- **Download backup file** — saves a `.mvbak` to your computer.
- **Back up to server now** — writes a backup into the server `backups/` folder.
- **Automatic Backups** — choose Off / Weekly / Monthly and how many backups to
  keep. While the app is running it checks hourly and backs up when due.
- **Restore** — upload a `.mvbak` and choose:
  - **Replace** — wipe and restore the exact snapshot (true disaster recovery).
  - **Merge** — add/update records by id, never delete.
  Restoring requires your admin password and automatically saves a
  `pre-restore-*` safety snapshot first.

## Command line

```bash
# Create a backup (writes to ./backups, prunes to the configured retention)
node scripts/backup.mjs
node scripts/backup.mjs --retention=12
node scripts/backup.mjs --engine=mongodump      # uses MongoDB's own tools

# Restore
node scripts/restore.mjs backups/mvba-backup-YYYYMMDD-HHMMSS.mvbak --yes
node scripts/restore.mjs <file> --mode=merge
node scripts/restore.mjs <file>.archive.gz      # restore a mongodump archive
```

`--yes` is required for replace mode (it overwrites data). `MONGODB_URI` is read
from `.env`.

## Scheduling (runs even when the app is closed)

The in-app scheduler only runs while the app is up. For backups that fire even
when the app/PC was closed, register a Windows scheduled task (run once, from an
**elevated** PowerShell):

```powershell
# Weekly, every Sunday at 02:00
powershell -ExecutionPolicy Bypass -File scripts\register-backup-task.ps1 -Frequency Weekly

# Monthly, on the 1st at 01:30
powershell -ExecutionPolicy Bypass -File scripts\register-backup-task.ps1 -Frequency Monthly -Time 01:30
```

Manage it:

```powershell
schtasks /Run    /TN "MVBA School System Backup"   # run now
schtasks /Query  /TN "MVBA School System Backup"   # status
schtasks /Delete /TN "MVBA School System Backup" /F
```

The OS task and the in-app scheduler share the same `lastBackupAt`, so they
don't double-up: whichever runs first satisfies the schedule.

## Engines (hybrid)

- **Default (`json`)** — pure Node, no external tools. Portable `.mvbak` file.
- **`mongodump`** — shells out to MongoDB's official tools for a binary
  `.archive.gz`. Requires `mongodb-database-tools` on the machine.

## Configuration

| Env var | Default | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | — | Database connection (required). |
| `BACKUP_DIR` | `./backups` | Where on-disk backups are written. |
| `ENABLE_INPROCESS_BACKUP` | `true` | Set `false` to rely only on the OS task. |
