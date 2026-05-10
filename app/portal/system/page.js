"use client";

import { useEffect, useMemo, useState } from "react";

const formatPhp = (value) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
};

export default function SystemSettingsPage() {
  const [title, setTitle] = useState("");
  const [breakdown, setBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmingPassword, setConfirmingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const totalEstimatedCost = useMemo(() => {
    return breakdown.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [breakdown]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/system-settings");
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to load system settings.");
      }

      setTitle(data.data.title || "");
      setBreakdown((data.data.breakdown || []).map((item) => ({
        label: item.label,
        amount: Number(item.amount || 0),
      })));
    } catch (err) {
      setError(err.message || "An error occurred while loading settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const openEditMode = () => {
    setError("");
    setSuccess("");
    setIsEditing(true);
  };

  const cancelEditMode = () => {
    setIsEditing(false);
    setConfirmingPassword(false);
    setCurrentPassword("");
    setError("");
    setSuccess("");
    fetchSettings();
  };

  const updateItem = (index, key, value) => {
    if (!isEditing) {
      return;
    }

    setBreakdown((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [key]: key === "amount" ? Number(value || 0) : value,
            }
          : item
      )
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const cleanedBreakdown = breakdown
        .map((item) => ({
          label: String(item.label || "").trim(),
          amount: Number(item.amount || 0),
        }))
        .filter((item) => item.label.length > 0);

      if (cleanedBreakdown.length === 0) {
        throw new Error("Breakdown must have at least one item.");
      }

      if (!currentPassword.trim()) {
        throw new Error("Current password is required for confirmation.");
      }

      const response = await fetch("/api/system-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          currency: "PHP",
          breakdown: cleanedBreakdown,
          currentPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to save system settings.");
      }

      setBreakdown((data.data.breakdown || []).map((item) => ({
        label: item.label,
        amount: Number(item.amount || 0),
      })));
      setTitle(data.data.title || "");
      setIsEditing(false);
      setConfirmingPassword(false);
      setCurrentPassword("");
      setSuccess("System settings updated successfully.");
    } catch (err) {
      setError(err.message || "An error occurred while saving settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 text-slate-800 md:p-8">
      <div className="mx-auto max-w-5xl rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">System Settings</h1>
        <p className="mt-2 text-sm text-slate-600">
          Manage the default tuition fee breakdown used by the system. New students will use this total as their starting remaining balance.
        </p>

        {error && <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-700">{success}</div>}

        {loading ? (
          <div className="mt-6 text-sm text-slate-500">Loading system settings...</div>
        ) : (
          <>
            <div className="mt-6 flex items-start justify-between gap-4">
              <div className="flex-1">
                <label className="mb-2 block text-sm font-medium text-slate-700">Breakdown Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={!isEditing}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>
              <div className="flex items-center gap-2 pt-7">
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={openEditMode}
                    className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    Edit
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={cancelEditMode}
                      className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingPassword(true)}
                      className="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
                    >
                      Save Changes
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Expense</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {breakdown.map((item, index) => (
                    <tr key={`${item.label}-${index}`}>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => updateItem(index, "label", e.target.value)}
                          disabled={!isEditing}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          value={item.amount}
                          onChange={(e) => updateItem(index, "amount", e.target.value)}
                          disabled={!isEditing}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-right text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-col gap-4 border-t border-gray-100 pt-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Total Estimated Cost</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{formatPhp(totalEstimatedCost)}</p>
              </div>
              <div className="text-sm text-slate-500">
                {isEditing ? "Editing is enabled. Save requires password confirmation." : "Click Edit to modify the breakdown."}
              </div>
            </div>

            {confirmingPassword && isEditing && (
              <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
                <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                  <h2 className="text-lg font-semibold text-slate-900">Confirm Your Password</h2>
                  <p className="mt-2 text-sm text-slate-600">Enter your current password to save the updated system settings.</p>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="mt-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Current password"
                  />
                  <div className="mt-5 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setConfirmingPassword(false)}
                      className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-400"
                    >
                      {saving ? "Saving..." : "Confirm and Save"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
