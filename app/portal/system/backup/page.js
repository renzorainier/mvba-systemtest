"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (value) => {
  if (!value) return "Never";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
};

export default function BackupPage() {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState("");

  // schedule form
  const [frequency, setFrequency] = useState("weekly");
  const [retention, setRetention] = useState(8);

  // restore form
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreMode, setRestoreMode] = useState("replace");
  const [restorePassword, setRestorePassword] = useState("");
  const [confirmingRestore, setConfirmingRestore] = useState(false);

  const loadState = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/backup");
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load backup settings.");
      setState(data.data);
      setFrequency(data.data.frequency);
      setRetention(data.data.retention);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadState();
  }, []);

  const flash = (setter, message) => {
    setter(message);
    setError("");
    setSuccess("");
  };

  const saveSchedule = async () => {
    try {
      setBusy("schedule");
      setError("");
      setSuccess("");
      const res = await fetch("/api/admin/backup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frequency, retention: Number(retention) }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to save schedule.");
      setState(data.data);
      setSuccess("Backup schedule saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const downloadBackup = async () => {
    try {
      setBusy("download");
      setError("");
      setSuccess("");
      const res = await fetch("/api/admin/backup/export", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create backup.");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="(.+?)"/);
      const filename = match ? match[1] : "mvba-backup.mvbak";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setSuccess(`Downloaded ${filename}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const backupToServer = async () => {
    try {
      setBusy("server");
      setError("");
      setSuccess("");
      const res = await fetch("/api/admin/backup", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to back up.");
      setState(data.data.state);
      setSuccess(`Saved ${data.data.file} to the server backups folder.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const submitRestore = async () => {
    if (!restoreFile) {
      setError("Choose a backup file first.");
      return;
    }
    try {
      setBusy("restore");
      setError("");
      setSuccess("");
      setConfirmingRestore(false);

      const form = new FormData();
      form.append("file", restoreFile);
      form.append("mode", restoreMode);
      form.append("currentPassword", restorePassword);

      const res = await fetch("/api/admin/backup/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Restore failed.");

      const { summary, safetySnapshot } = data.data;
      setSuccess(
        `Restored ${summary.restoredDocuments} records (${restoreMode} mode). ` +
          (safetySnapshot ? `A safety snapshot (${safetySnapshot}) was saved first.` : "")
      );
      setRestoreFile(null);
      setRestorePassword("");
      await loadState();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const card = "rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.06)]";
  const label = "mb-1 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500";
  const field = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white";

  return (
    <div className="min-h-screen bg-white p-4 text-slate-800 lg:p-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/portal/system" className="text-sm font-semibold text-cyan-700 hover:underline">
              ← Back to System Settings
            </Link>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Backup &amp; Restore</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Export a full copy of the system (students, enrollments, financials, schedules, archives, and uploaded
              files), restore from a backup, and schedule automatic backups.
            </p>
          </div>
        </div>

        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        {success && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

        {loading ? (
          <div className="text-sm text-slate-500">Loading backup settings…</div>
        ) : (
          <>
            {/* Status */}
            <div className={card}>
              <h2 className="text-lg font-bold text-slate-900">Status</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <p className={label}>Last Backup</p>
                  <p className="text-sm font-semibold text-slate-900">{formatDate(state?.lastBackupAt)}</p>
                  {state?.lastBackupStatus === "error" && (
                    <p className="mt-1 text-xs text-rose-600">Last run failed: {state?.lastBackupError}</p>
                  )}
                  {state?.lastBackupStatus === "success" && state?.lastBackupSize != null && (
                    <p className="mt-1 text-xs text-slate-500">{formatBytes(state.lastBackupSize)}</p>
                  )}
                </div>
                <div>
                  <p className={label}>Schedule</p>
                  <p className="text-sm font-semibold text-slate-900">{state?.frequencyLabel}</p>
                </div>
                <div>
                  <p className={label}>Next Automatic Backup</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {state?.frequency === "off" ? "—" : state?.isDue ? "Due now" : formatDate(state?.nextDueAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Manual */}
            <div className={card}>
              <h2 className="text-lg font-bold text-slate-900">Manual Backup</h2>
              <p className="mt-1 text-sm text-slate-600">Create a backup right now.</p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={downloadBackup}
                  disabled={busy === "download"}
                  className="inline-flex items-center justify-center rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-cyan-300"
                >
                  {busy === "download" ? "Preparing…" : "Download backup file"}
                </button>
                <button
                  type="button"
                  onClick={backupToServer}
                  disabled={busy === "server"}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy === "server" ? "Saving…" : "Back up to server now"}
                </button>
              </div>
            </div>

            {/* Schedule */}
            <div className={card}>
              <h2 className="text-lg font-bold text-slate-900">Automatic Backups</h2>
              <p className="mt-1 text-sm text-slate-600">
                The app backs up on this cadence while running. For backups even when the app is closed, also register the
                Windows scheduled task (see <span className="font-mono text-xs">BACKUP.md</span>).
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={label}>Frequency</label>
                  <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className={field}>
                    <option value="off">Off</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className={label}>Backups to keep</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={retention}
                    onChange={(e) => setRetention(e.target.value)}
                    className={field}
                  />
                </div>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={saveSchedule}
                  disabled={busy === "schedule"}
                  className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                >
                  {busy === "schedule" ? "Saving…" : "Save schedule"}
                </button>
              </div>
            </div>

            {/* Restore */}
            <div className={`${card} border-rose-200`}>
              <h2 className="text-lg font-bold text-slate-900">Restore from Backup</h2>
              <p className="mt-1 text-sm text-rose-600">
                Replace mode overwrites current data. A safety snapshot of the current database is saved automatically
                before restoring.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={label}>Backup file (.mvbak)</label>
                  <input
                    type="file"
                    accept=".mvbak,.gz,application/gzip"
                    onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                    className={field}
                  />
                </div>
                <div>
                  <label className={label}>Mode</label>
                  <select value={restoreMode} onChange={(e) => setRestoreMode(e.target.value)} className={field}>
                    <option value="replace">Replace (full restore)</option>
                    <option value="merge">Merge (add/update only)</option>
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (!restoreFile) {
                      setError("Choose a backup file first.");
                      return;
                    }
                    setError("");
                    setConfirmingRestore(true);
                  }}
                  disabled={busy === "restore"}
                  className="inline-flex items-center justify-center rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
                >
                  {busy === "restore" ? "Restoring…" : "Restore"}
                </button>
              </div>
            </div>

            {/* Server backups list */}
            <div className={card}>
              <h2 className="text-lg font-bold text-slate-900">Server Backups</h2>
              <p className="mt-1 text-sm text-slate-600">Files stored in the server&apos;s backups folder.</p>
              {state?.backups?.length ? (
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-2">File</th>
                        <th className="px-4 py-2">Type</th>
                        <th className="px-4 py-2">Size</th>
                        <th className="px-4 py-2">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {state.backups.map((b) => (
                        <tr key={b.name}>
                          <td className="px-4 py-2 font-mono text-xs text-slate-700">{b.name}</td>
                          <td className="px-4 py-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                b.kind === "safety" ? "bg-amber-100 text-amber-700" : "bg-cyan-100 text-cyan-700"
                              }`}
                            >
                              {b.kind === "safety" ? "pre-restore" : "backup"}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-slate-600">{formatBytes(b.size)}</td>
                          <td className="px-4 py-2 text-slate-600">{formatDate(b.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">No server backups yet.</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Restore confirmation */}
      {confirmingRestore && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[1.75rem] bg-white p-7 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Confirm Restore</h2>
            <p className="mt-2 text-sm text-slate-600">
              {restoreMode === "replace"
                ? "This will overwrite current data with the contents of the backup. A safety snapshot is saved first."
                : "This will add and update records from the backup without deleting anything."}
            </p>
            <p className="mt-3 text-sm font-medium text-slate-700">Enter your admin password to continue:</p>
            <input
              type="password"
              value={restorePassword}
              onChange={(e) => setRestorePassword(e.target.value)}
              placeholder="Current password"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-cyan-500"
            />
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmingRestore(false)}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitRestore}
                disabled={!restorePassword || busy === "restore"}
                className="rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
              >
                {busy === "restore" ? "Restoring…" : "Restore now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
