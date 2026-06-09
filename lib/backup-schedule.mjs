// Pure scheduling math for automatic backups. No database or filesystem here —
// shared by the API, the in-process scheduler, and the CLI.

export const BACKUP_FREQUENCIES = ['off', 'weekly', 'monthly'];
export const DEFAULT_BACKUP_FREQUENCY = 'weekly';
export const DEFAULT_BACKUP_RETENTION = 8;

export function isValidFrequency(freq) {
  return BACKUP_FREQUENCIES.includes(freq);
}

/**
 * When the next automatic backup is due, given the last run and the frequency.
 * Returns a Date, or null when automatic backups are off.
 * A missing lastBackupAt means "due immediately".
 */
export function nextDueDate(lastBackupAt, frequency) {
  if (!frequency || frequency === 'off') {
    return null;
  }
  if (!lastBackupAt) {
    return new Date(0); // never backed up -> due now
  }

  const next = new Date(lastBackupAt);
  if (Number.isNaN(next.getTime())) {
    return new Date(0);
  }

  if (frequency === 'weekly') {
    next.setDate(next.getDate() + 7);
  } else if (frequency === 'monthly') {
    next.setMonth(next.getMonth() + 1);
  } else {
    return null;
  }

  return next;
}

export function isBackupDue(lastBackupAt, frequency, now = new Date()) {
  const due = nextDueDate(lastBackupAt, frequency);
  if (!due) {
    return false;
  }
  return now.getTime() >= due.getTime();
}

export function describeFrequency(frequency) {
  switch (frequency) {
    case 'weekly':
      return 'Every week';
    case 'monthly':
      return 'Every month';
    case 'off':
      return 'Disabled';
    default:
      return 'Unknown';
  }
}
