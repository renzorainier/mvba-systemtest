'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRightLeft, CheckCircle2, FilePlus2, LogIn, RotateCw, School, Trash2, TriangleAlert } from 'lucide-react';
import { useSchoolYearContext } from '@/components/SchoolYearContext';

export default function SchoolYearTransitionPage() {
  const { currentSchoolYear } = useSchoolYearContext();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [status, setStatus] = useState({ currentSchoolYear: '', draftSchoolYear: null, exists: false, nextSchoolYear: '' });

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/draft-school-year');
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to load draft school year status');
      }

      setStatus(payload.data);
    } catch (loadError) {
      setError(loadError.message || 'Failed to load draft school year status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleCreateDraft = async () => {
    try {
      setWorking(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/admin/draft-school-year', { method: 'POST' });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to create draft school year');
      }

      setSuccess(`Draft school year ${payload.data.draftSchoolYear} created. Switch into it to start adding students, curriculum, and schedules.`);
      await loadStatus();
      router.refresh();
    } catch (createError) {
      setError(createError.message || 'Failed to create draft school year');
    } finally {
      setWorking(false);
    }
  };

  const handleEnterDraft = async () => {
    if (!status.draftSchoolYear) {
      return;
    }

    try {
      setWorking(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/school-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolYear: status.draftSchoolYear }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to switch into the draft school year');
      }

      router.refresh();
      router.push('/portal/dashboard');
    } catch (enterError) {
      setError(enterError.message || 'Failed to switch into the draft school year');
      setWorking(false);
    }
  };

  const handleExecuteRollOver = async () => {
    if (!status.draftSchoolYear) {
      return;
    }

    const confirmed = window.confirm(
      `Execute roll over?\n\nThis will permanently:\n• Archive the active year ${status.currentSchoolYear} (it becomes read-only history)\n• Promote/repeat/graduate its students into ${status.draftSchoolYear} based on GWA\n• Make ${status.draftSchoolYear} the new active school year\n\nThis cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setWorking(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/admin/activate-school-year', { method: 'POST' });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to execute roll over');
      }

      const r = payload.data;
      setSuccess(
        `Roll over complete. ${r.activatedSchoolYear} is now the active school year. ` +
        `Archived ${r.archivedStudentCount} student record(s); promoted ${r.promotedCount}, repeating ${r.failedCount}, graduated ${r.graduatedCount}` +
        `${r.conflictCount ? `, ${r.conflictCount} skipped (already in draft)` : ''}.`
      );
      await loadStatus();
      router.refresh();
    } catch (executeError) {
      setError(executeError.message || 'Failed to execute roll over');
    } finally {
      setWorking(false);
    }
  };

  const handleDiscardDraft = async () => {
    if (!status.draftSchoolYear) {
      return;
    }

    const confirmed = window.confirm(
      `Discard the draft school year ${status.draftSchoolYear}? All students, curriculum, sections, schedules, and enrollments added to the draft will be permanently deleted. The active year is not affected.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setWorking(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/admin/draft-school-year', { method: 'DELETE' });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to discard draft school year');
      }

      setSuccess(`Draft school year ${payload.data.discardedSchoolYear} discarded.`);
      await loadStatus();
      router.refresh();
    } catch (discardError) {
      setError(discardError.message || 'Failed to discard draft school year');
    } finally {
      setWorking(false);
    }
  };

  const activeYear = status.currentSchoolYear || currentSchoolYear || 'Loading...';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.08),_transparent_35%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-6 lg:px-10">
        <div className="mb-8 flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-700">Admin Tool</p>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">School Year Transition</h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Prepare next year ahead of time with a <span className="font-semibold">draft school year</span> — an empty workspace you can switch
            into and edit (students, curriculum, sections, schedules, enrollments) without touching the active year.
          </p>
        </div>

        {error && <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        {success && <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</div>}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Active year card */}
          <div className="rounded-[1.75rem] border border-white/70 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              <School size={14} />
              Active School Year
            </div>
            <p className="mt-2 text-3xl font-black text-slate-900">{activeYear}</p>
            <p className="mt-3 text-sm text-slate-600">
              This is the live school year. All day-to-day work happens here until the draft is activated.
            </p>
          </div>

          {/* Draft year card */}
          <div className="rounded-[1.75rem] border border-indigo-100 bg-indigo-50/60 p-6 shadow-[0_18px_50px_rgba(79,70,229,0.08)]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
              <FilePlus2 size={14} />
              Draft School Year
            </div>

            {loading ? (
              <p className="mt-2 text-sm text-slate-500">Loading draft status...</p>
            ) : status.exists ? (
              <>
                <p className="mt-2 text-3xl font-black text-indigo-900">{status.draftSchoolYear}</p>
                <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                  <CheckCircle2 size={14} /> Draft ready to edit
                </p>
                <div className="mt-5 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={handleEnterDraft}
                    disabled={working}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-700/25 transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                  >
                    {working ? <RotateCw size={16} className="animate-spin" /> : <LogIn size={16} />}
                    Enter draft to edit
                  </button>
                  <button
                    type="button"
                    onClick={handleDiscardDraft}
                    disabled={working}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 size={16} />
                    Discard draft
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-slate-600">
                  No draft exists yet. Create an empty draft for <span className="font-semibold">{status.nextSchoolYear || 'next year'}</span> to begin early preparation.
                </p>
                <button
                  type="button"
                  onClick={handleCreateDraft}
                  disabled={working}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-700/25 transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  {working ? <RotateCw size={16} className="animate-spin" /> : <FilePlus2 size={16} />}
                  Create Draft School Year
                </button>
              </>
            )}
          </div>
        </div>

        {/* Execute Roll Over — archive active year + activate the draft */}
        <div className={`mt-6 rounded-[1.75rem] border p-6 ${status.exists ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                <ArrowRightLeft size={14} />
                Execute Roll Over
              </div>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Archive the active year <span className="font-semibold">{activeYear}</span>, migrate its students by GWA
                (promote / repeat / graduate), and make
                {status.exists ? <span className="font-semibold"> {status.draftSchoolYear} </span> : ' the draft '}
                the new active school year. The draft&apos;s pre-configured data is kept.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExecuteRollOver}
              disabled={working || !status.exists}
              title={status.exists ? 'Execute roll over' : 'Create a draft school year first'}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-rose-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-700/25 transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 disabled:shadow-none"
            >
              {working ? <RotateCw size={16} className="animate-spin" /> : <ArrowRightLeft size={16} />}
              Execute Roll Over
            </button>
          </div>
          <p className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-amber-700">
            <TriangleAlert size={14} />
            {status.exists
              ? 'This permanently archives the active year and cannot be undone.'
              : 'Create a draft school year first to enable roll over.'}
          </p>
        </div>
      </div>
    </div>
  );
}
