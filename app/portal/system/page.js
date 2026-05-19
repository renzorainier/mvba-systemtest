"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from "react";
import {
  calculateTotalFromTuitionPlans,
  createDefaultTuitionPlans,
  normalizeTuitionPlans,
} from "@/lib/tuition-settings";
import { useSchoolYearContext } from '@/components/SchoolYearContext';

const formatPhp = (value) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
};

const createId = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const createLineItem = (item = {}) => ({
  id: createId(),
  label: String(item.label || "").trim(),
  amount: item.amount === undefined || item.amount === null ? "" : String(item.amount),
});

const createCustomField = (field = {}) => ({
  id: createId(),
  label: String(field.label || "").trim(),
  value: String(field.value || "").trim(),
});

const createPlanState = (plan = {}) => ({
  id: plan._id || createId(),
  gradeLabel: String(plan.gradeLabel || "").trim(),
  applicableGradesText: Array.isArray(plan.applicableGrades)
    ? plan.applicableGrades.join(", ")
    : String(plan.applicableGrades || "").trim(),
  totalBaseCost: plan.totalBaseCost === undefined || plan.totalBaseCost === null ? "" : String(plan.totalBaseCost),
  lineItems: Array.isArray(plan.lineItems) && plan.lineItems.length > 0 ? plan.lineItems.map(createLineItem) : [createLineItem()],
  amountDueBeforeSchool:
    plan.amountDueBeforeSchool === undefined || plan.amountDueBeforeSchool === null ? "" : String(plan.amountDueBeforeSchool),
  remainingBalanceDue:
    plan.remainingBalanceDue === undefined || plan.remainingBalanceDue === null ? "" : String(plan.remainingBalanceDue),
  monthlyPaymentCount:
    plan.monthlyPaymentCount === undefined || plan.monthlyPaymentCount === null ? "" : String(plan.monthlyPaymentCount),
  monthlyPaymentAmount:
    plan.monthlyPaymentAmount === undefined || plan.monthlyPaymentAmount === null ? "" : String(plan.monthlyPaymentAmount),
  monthlyPaymentMonths: String(plan.monthlyPaymentMonths || "").trim(),
  customFields: Array.isArray(plan.customFields) && plan.customFields.length > 0 ? plan.customFields.map(createCustomField) : [],
  notes: String(plan.notes || "").trim(),
});

const createEmptyPlan = () =>
  createPlanState({
    gradeLabel: "",
    applicableGrades: [],
    totalBaseCost: "",
    lineItems: [],
    amountDueBeforeSchool: "",
    remainingBalanceDue: "",
    monthlyPaymentCount: "",
    monthlyPaymentAmount: "",
    monthlyPaymentMonths: "",
    customFields: [],
    notes: "",
  });

const serializePlans = (plans = []) => {
  return plans
    .map((plan) => {
      const lineItems = plan.lineItems
        .map((item) => ({
          label: String(item.label || "").trim(),
          amount: Number(item.amount || 0),
        }))
        .filter((item) => item.label.length > 0);

      const customFields = plan.customFields
        .map((field) => ({
          label: String(field.label || "").trim(),
          value: String(field.value || "").trim(),
        }))
        .filter((field) => field.label.length > 0 || field.value.length > 0);

      const applicableGrades = String(plan.applicableGradesText || "")
        .split(",")
        .map((grade) => grade.trim())
        .filter(Boolean);

      const derivedBaseCost = lineItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const derivedRemaining = Math.max(0, derivedBaseCost - Number(plan.amountDueBeforeSchool || 0));
      const monthlyCount = Number(plan.monthlyPaymentCount || 0);
      const derivedMonthlyAmount = monthlyCount > 0 ? Math.round(derivedRemaining / monthlyCount) : 0;

      return {
        gradeLabel: String(plan.gradeLabel || "").trim(),
        applicableGrades,
        // Total base cost must be the sum of breakdown line items
        totalBaseCost: Number(derivedBaseCost || 0),
        lineItems,
        amountDueBeforeSchool: Number(plan.amountDueBeforeSchool || 0),
        // Remaining balance is computed as total base cost - amount due before school
        remainingBalanceDue: Number(derivedRemaining || 0),
        monthlyPaymentCount: monthlyCount,
        // Monthly amount is derived from remaining balance divided by monthly payment count
        monthlyPaymentAmount: Number(derivedMonthlyAmount || 0),
        monthlyPaymentMonths: String(plan.monthlyPaymentMonths || "").trim(),
        customFields,
        notes: String(plan.notes || "").trim(),
      };
    })
    .filter((plan) => plan.gradeLabel.length > 0 && plan.applicableGrades.length > 0 && plan.lineItems.length > 0);
};

const TuitionPlanCard = ({ plan, index, isEditing, onChange, onRemove, onAddLineItem, onRemoveLineItem, onAddCustomField, onRemoveCustomField }) => {

  // derive values from breakdown line items
  const derivedBaseCost = (Array.isArray(plan.lineItems) ? plan.lineItems.reduce((s, it) => s + Number(it.amount || 0), 0) : 0);
  const derivedRemaining = Math.max(0, derivedBaseCost - Number(plan.amountDueBeforeSchool || 0));
  const monthlyCount = Number(plan.monthlyPaymentCount || 0);
  const derivedMonthlyAmount = monthlyCount > 0 ? Math.round(derivedRemaining / monthlyCount) : 0;

  const monthlySummary = monthlyCount && derivedMonthlyAmount
    ? `${monthlyCount} monthly payments of ${formatPhp(derivedMonthlyAmount)} (${plan.monthlyPaymentMonths || "schedule to be set"})`
    : "Monthly payment schedule not set yet.";

  return (
    <div className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600" />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Grade Block</label>
          <input
            type="text"
            value={plan.gradeLabel}
            onChange={(e) => onChange(index, "gradeLabel", e.target.value)}
            disabled={!isEditing}
            placeholder="Kinder 1"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white disabled:bg-slate-100 disabled:text-slate-600"
          />
        </div>
        <button
          type="button"
          onClick={() => onRemove(index)}
          disabled={!isEditing}
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Remove Block
        </button>
      </div>

      <div className="mb-4">
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Applicable Grades</label>
        <input
          type="text"
          value={plan.applicableGradesText}
          onChange={(e) => onChange(index, "applicableGradesText", e.target.value)}
          disabled={!isEditing}
          placeholder="Kinder 1 or Grade 1, Grade 2, Grade 3"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white disabled:bg-slate-100 disabled:text-slate-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Total Base Cost</label>
          <input
            type="number"
            min="0"
            value={derivedBaseCost}
            // total base cost is derived from breakdown - not editable
            disabled={true}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white disabled:bg-slate-100 disabled:text-slate-600"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Amount Due Before School</label>
          <input
            type="number"
            min="0"
            value={plan.amountDueBeforeSchool}
            onChange={(e) => onChange(index, "amountDueBeforeSchool", e.target.value)}
            disabled={!isEditing}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white disabled:bg-slate-100 disabled:text-slate-600"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Remaining Balance</label>
          <input
            type="number"
            min="0"
            value={derivedRemaining}
            // remaining balance is derived (total base cost - amount due before school)
            disabled={true}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white disabled:bg-slate-100 disabled:text-slate-600"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Monthly Payments</label>
          <input
            type="number"
            min="0"
            value={plan.monthlyPaymentCount}
            onChange={(e) => onChange(index, "monthlyPaymentCount", e.target.value)}
            disabled={!isEditing}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white disabled:bg-slate-100 disabled:text-slate-600"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Monthly Amount</label>
          <input
            type="number"
            min="0"
            value={derivedMonthlyAmount}
            // monthly amount is derived from remaining balance divided by monthly payments
            disabled={true}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white disabled:bg-slate-100 disabled:text-slate-600"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Payment Months</label>
          <input
            type="text"
            value={plan.monthlyPaymentMonths}
            onChange={(e) => onChange(index, "monthlyPaymentMonths", e.target.value)}
            disabled={!isEditing}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white disabled:bg-slate-100 disabled:text-slate-600"
          />
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900">Breakdown</h3>
          <button
            type="button"
            onClick={() => onAddLineItem(index)}
            disabled={!isEditing}
            className="rounded-lg border border-cyan-200 bg-white px-3 py-1.5 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add Fee Row
          </button>
        </div>

        <div className="space-y-3">
          {plan.lineItems.map((item, lineIndex) => (
            <div key={item.id} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_140px_auto]">
              <input
                type="text"
                value={item.label}
                onChange={(e) => onChange(index, "lineItem", e.target.value, lineIndex, "label")}
                disabled={!isEditing}
                placeholder="Fee label"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500 disabled:bg-slate-100 disabled:text-slate-600"
              />
              <input
                type="number"
                min="0"
                value={item.amount}
                onChange={(e) => onChange(index, "lineItem", e.target.value, lineIndex, "amount")}
                disabled={!isEditing}
                placeholder="Amount"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500 disabled:bg-slate-100 disabled:text-slate-600"
              />
              <button
                type="button"
                onClick={() => onRemoveLineItem(index, lineIndex)}
                disabled={!isEditing || plan.lineItems.length === 1}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900">Additional Fields</h3>
          <button
            type="button"
            onClick={() => onAddCustomField(index)}
            disabled={!isEditing}
            className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add Field
          </button>
        </div>

        {plan.customFields.length > 0 ? (
          <div className="space-y-3">
            {plan.customFields.map((field, fieldIndex) => (
              <div key={field.id} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => onChange(index, "customField", e.target.value, fieldIndex, "label")}
                  disabled={!isEditing}
                  placeholder="Field label"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500 disabled:bg-slate-100 disabled:text-slate-600"
                />
                <input
                  type="text"
                  value={field.value}
                  onChange={(e) => onChange(index, "customField", e.target.value, fieldIndex, "value")}
                  disabled={!isEditing}
                  placeholder="Field value"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500 disabled:bg-slate-100 disabled:text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => onRemoveCustomField(index, fieldIndex)}
                  disabled={!isEditing}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No additional fields yet. Add one if this grade block needs extra details.</p>
        )}
      </div>

      <div className="mt-5 grid gap-3 rounded-2xl bg-slate-900 p-4 text-white md:grid-cols-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">Computed Total</p>
          <p className="mt-1 text-xl font-bold">{formatPhp(derivedBaseCost || 0)}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">Amount Due</p>
          <p className="mt-1 text-xl font-bold">{formatPhp(Number(plan.amountDueBeforeSchool || 0))}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">Monthly Summary</p>
          <p className="mt-1 text-sm leading-6 text-slate-100">{monthlySummary}</p>
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Notes</label>
        <textarea
          value={plan.notes}
          onChange={(e) => onChange(index, "notes", e.target.value)}
          disabled={!isEditing}
          rows={3}
          placeholder="Optional note for this grade block"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white disabled:bg-slate-100 disabled:text-slate-600"
        />
      </div>
    </div>
  );
};

export default function SystemSettingsPage() {
  const { isHistorical } = useSchoolYearContext();
  const [title, setTitle] = useState("");
  const [currentSchoolYear, setCurrentSchoolYear] = useState("2025-2026");
  const [tuitionPlans, setTuitionPlans] = useState(createDefaultTuitionPlans().map(createPlanState));
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmingPassword, setConfirmingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const totalEstimatedCost = useMemo(() => {
    return calculateTotalFromTuitionPlans(serializePlans(tuitionPlans));
  }, [tuitionPlans]);

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
      setCurrentSchoolYear(data.data.currentSchoolYear || "2025-2026");
      const plans = data.data.tuitionPlans || data.data.breakdown || createDefaultTuitionPlans();
      setTuitionPlans(normalizeTuitionPlans(plans).map(createPlanState));
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
    if (isHistorical) {
      return;
    }

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

  const updatePlan = (planIndex, key, value, childIndex = null, childKey = null) => {
    if (!isEditing) {
      return;
    }

    setTuitionPlans((prev) =>
      prev.map((plan, index) => {
        if (index !== planIndex) {
          return plan;
        }

        if (key === "lineItem" && childIndex !== null) {
          return {
            ...plan,
            lineItems: plan.lineItems.map((item, lineIndex) =>
              lineIndex === childIndex ? { ...item, [childKey]: value } : item
            ),
          };
        }

        if (key === "customField" && childIndex !== null) {
          return {
            ...plan,
            customFields: plan.customFields.map((field, fieldIndex) =>
              fieldIndex === childIndex ? { ...field, [childKey]: value } : field
            ),
          };
        }

        return { ...plan, [key]: value };
      })
    );
  };

  const addPlan = () => {
    if (!isEditing || isHistorical) {
      return;
    }

    setTuitionPlans((prev) => [...prev, createEmptyPlan()]);
  };

  const removePlan = (planIndex) => {
    if (!isEditing || isHistorical) {
      return;
    }

    setTuitionPlans((prev) => prev.filter((_, index) => index !== planIndex));
  };

  const addLineItem = (planIndex) => {
    if (!isEditing) {
      return;
    }

    setTuitionPlans((prev) =>
      prev.map((plan, index) =>
        index === planIndex ? { ...plan, lineItems: [...plan.lineItems, createLineItem()] } : plan
      )
    );
  };

  const removeLineItem = (planIndex, lineIndex) => {
    if (!isEditing) {
      return;
    }

    setTuitionPlans((prev) =>
      prev.map((plan, index) =>
        index === planIndex
          ? {
              ...plan,
              lineItems: plan.lineItems.length > 1 ? plan.lineItems.filter((_, itemIndex) => itemIndex !== lineIndex) : plan.lineItems,
            }
          : plan
      )
    );
  };

  const addCustomField = (planIndex) => {
    if (!isEditing) {
      return;
    }

    setTuitionPlans((prev) =>
      prev.map((plan, index) =>
        index === planIndex ? { ...plan, customFields: [...plan.customFields, createCustomField()] } : plan
      )
    );
  };

  const removeCustomField = (planIndex, fieldIndex) => {
    if (!isEditing) {
      return;
    }

    setTuitionPlans((prev) =>
      prev.map((plan, index) =>
        index === planIndex
          ? {
              ...plan,
              customFields: plan.customFields.filter((_, itemIndex) => itemIndex !== fieldIndex),
            }
          : plan
      )
    );
  };

  const handleSave = async () => {
    if (isHistorical) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const cleanedPlans = serializePlans(tuitionPlans);

      if (cleanedPlans.length === 0) {
        throw new Error("Tuition plans must have at least one grade block.");
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
          currentSchoolYear,
          currency: "PHP",
          tuitionPlans: cleanedPlans,
          currentPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to save system settings.");
      }

      setTitle(data.data.title || "");
      setCurrentSchoolYear(data.data.currentSchoolYear || currentSchoolYear);
      setTuitionPlans(normalizeTuitionPlans(data.data.tuitionPlans || []).map(createPlanState));
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.12),_transparent_28%),linear-gradient(180deg,_#f7fbff_0%,_#eef4ff_48%,_#eef2f7_100%)] p-4 text-slate-800 md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.1)] backdrop-blur md:p-8 lg:p-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="space-y-4">
            <div className="inline-flex items-center rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-800">
              Finance Setup
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">System Settings</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                Manage the tuition plan cards used by the system. Each block can be edited, expanded, or duplicated later if the school updates the fee structure.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs font-medium text-slate-500">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2">Editable tuition blocks</span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2">Password-protected saves</span>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-5 py-4 text-right shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Current School Year</p>
            <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{currentSchoolYear}</p>
            <p className="mt-1 text-xs text-slate-500">This is the active tuition cycle.</p>
            <Link
              href="/portal/rollover"
              aria-disabled={isHistorical}
              tabIndex={isHistorical ? -1 : 0}
              onClick={(event) => {
                if (isHistorical) {
                  event.preventDefault();
                }
              }}
              className={`mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 ${isHistorical ? 'pointer-events-none opacity-50' : ''}`}
            >
              Open School Year Rollover
            </Link>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Promote students and prepare the next school year from here.
            </p>
          </div>
        </div>

        {error && <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        {success && <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

        {loading ? (
          <div className="mt-8 text-sm text-slate-500">Loading system settings...</div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Breakdown Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={!isEditing}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white disabled:bg-slate-100 disabled:text-slate-600"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row xl:justify-end">
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={openEditMode}
                    disabled={isHistorical}
                    className="inline-flex items-center justify-center rounded-2xl bg-cyan-600 px-5 py-4 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-cyan-300"
                  >
                    Edit Tuition Plans
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={cancelEditMode}
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingPassword(true)}
                      disabled={isHistorical}
                      className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                    >
                      Save Changes
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="mt-8 rounded-[2rem] border border-slate-200 bg-slate-50/90 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] md:p-6 lg:p-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">Tuition Breakdown</p>
                  <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950 md:text-2xl">Grade-based tuition cards</h2>
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 text-right shadow-[0_10px_25px_rgba(15,23,42,0.06)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Total Base Cost</p>
                  <p className="text-3xl font-black tracking-tight text-slate-950">{formatPhp(totalEstimatedCost)}</p>
                </div>
              </div>

              <div className="mt-7 grid grid-cols-1 gap-6 xl:grid-cols-2 xl:gap-8 2xl:grid-cols-2">
                {tuitionPlans.map((plan, index) => (
                  <TuitionPlanCard
                    key={plan.id}
                    plan={plan}
                    index={index}
                    isEditing={isEditing}
                    onChange={updatePlan}
                    onRemove={removePlan}
                    onAddLineItem={addLineItem}
                    onRemoveLineItem={removeLineItem}
                    onAddCustomField={addCustomField}
                    onRemoveCustomField={removeCustomField}
                  />
                ))}
              </div>

              {isEditing && (
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={addPlan}
                    disabled={isHistorical}
                    className="rounded-2xl border border-dashed border-cyan-300 bg-white px-5 py-4 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Add Grade Block
                  </button>
                </div>
              )}
            </div>

            <div className="mt-8 flex flex-col gap-4 border-t border-slate-200 pt-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Active School Year</p>
                <p className="mt-1 text-3xl font-black tracking-tight text-slate-950">{currentSchoolYear}</p>
              </div>
              <div className="max-w-xl text-sm leading-6 text-slate-500">
                {isEditing ? "Editing is enabled. Save requires password confirmation." : "Click Edit Tuition Plans to modify the cards."}
              </div>
            </div>

            {confirmingPassword && isEditing && (
              <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
                <div className="w-full max-w-md rounded-[1.75rem] bg-white p-7 shadow-xl">
                  <h2 className="text-lg font-semibold text-slate-900">Confirm Your Password</h2>
                  <p className="mt-2 text-sm text-slate-600">Enter your current admin password to save the updated tuition plans.</p>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-cyan-500"
                    placeholder="Current password"
                  />
                  <div className="mt-5 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setConfirmingPassword(false)}
                      className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving || isHistorical}
                      className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
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