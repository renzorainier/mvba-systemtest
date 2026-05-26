'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, ArrowRightLeft, CheckCircle2, RotateCw, School, Users } from 'lucide-react';
import { useSchoolYearContext } from '@/components/SchoolYearContext';

const PASSING_GWA = 75;
const GRADE_ORDER = ['Kinder 1', 'Kinder 2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];

const getNextGradeLevel = (gradeLevel) => {
  const index = GRADE_ORDER.indexOf(String(gradeLevel || '').trim());

  if (index < 0 || index >= GRADE_ORDER.length - 1) {
    return null;
  }

  return GRADE_ORDER[index + 1];
};

const getNextSchoolYear = (schoolYear) => {
  const match = String(schoolYear || '').match(/^(\d{4})-(\d{4})$/);

  if (!match) {
    return '';
  }

  const startYear = Number(match[1]);
  return `${startYear + 1}-${startYear + 2}`;
};

const getOutcome = (student) => {
  const gwa = Number(student?.gwa);
  const nextGradeLevel = getNextGradeLevel(student?.gradeLevel);

  if (!Number.isFinite(gwa)) {
    return { label: 'Archive', tone: 'bg-slate-100 text-slate-600', icon: Archive, note: 'No GWA entered' };
  }

  if (gwa >= PASSING_GWA && nextGradeLevel) {
    return { label: 'Promote', tone: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2, note: `Passing at ${gwa.toFixed(2)}` };
  }

  if (gwa >= PASSING_GWA) {
    return { label: 'Graduate', tone: 'bg-amber-50 text-amber-700', icon: Archive, note: `Passing at ${gwa.toFixed(2)}` };
  }

  return { label: 'Archive', tone: 'bg-rose-50 text-rose-700', icon: Archive, note: `Failed at ${gwa.toFixed(2)}` };
};

export default function SchoolYearRolloverPage() {
  const { isHistorical, selectedSchoolYear } = useSchoolYearContext();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [students, setStudents] = useState([]);
  const [currentYearId, setCurrentYearId] = useState('');
  const [nextYearId, setNextYearId] = useState('');

  useEffect(() => {
    const loadRolloverData = async () => {
      try {
        setLoading(true);
        const [rolloverResponse, schoolYearsResponse] = await Promise.all([
          fetch('/api/admin/rollover'),
          fetch('/api/school-years'),
        ]);

        const rolloverData = await rolloverResponse.json();
        const schoolYearsData = await schoolYearsResponse.json();

        if (!rolloverResponse.ok || !rolloverData.success) {
          throw new Error(rolloverData.error || 'Failed to load rollover data');
        }

        if (!schoolYearsResponse.ok || !schoolYearsData.success) {
          throw new Error(schoolYearsData.error || 'Failed to load school years');
        }

        const nextYear = rolloverData.data.nextYearId || getNextSchoolYear(rolloverData.data.currentYearId || schoolYearsData.data.selectedSchoolYear);

        const loadedStudents = Array.isArray(rolloverData.data.students) ? rolloverData.data.students : [];
        loadedStudents.sort((left, right) => {
          const leftName = `${left.lastName || ''} ${left.firstName || ''}`.toLowerCase();
          const rightName = `${right.lastName || ''} ${right.firstName || ''}`.toLowerCase();
          return leftName.localeCompare(rightName);
        });

        setStudents(loadedStudents);
        setCurrentYearId(selectedSchoolYear || rolloverData.data.currentYearId || schoolYearsData.data.selectedSchoolYear || schoolYearsData.data.currentSchoolYear || '');
        setNextYearId(nextYear || getNextSchoolYear(selectedSchoolYear) || '');
      } catch (loadError) {
        setError(loadError.message || 'Failed to load rollover data');
      } finally {
        setLoading(false);
      }
    };

    loadRolloverData();
  }, [selectedSchoolYear]);

  const promotedStudents = useMemo(() => students.filter((student) => getOutcome(student).label === 'Promote'), [students]);
  const archivedStudents = useMemo(() => students.filter((student) => getOutcome(student).label !== 'Promote'), [students]);

  const handleRollover = async () => {
    if (isHistorical) {
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/admin/rollover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentYearId,
          nextYearId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to rollover school year');
      }

      setSuccess(`Rollover completed: ${data.data.promotedCount} promoted, ${data.data.archivedStudentCount} archived.`);

      await fetch('/api/logout', { method: 'POST' });
      router.replace('/');
    } catch (rolloverError) {
      setError(rolloverError.message || 'Failed to rollover school year');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(6,182,212,0.08),_transparent_35%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-10">
        <div className="mb-8 flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">Admin Tool</p>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">School Year Rollover</h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Promotion is now driven by each student&apos;s GWA: &gt;= 75 promotes to the next grade, below 75 is archived.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_0.9fr]">
          <div className="rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">Current Year</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">GWA-based promotion list</h2>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <School size={14} />
                  Active Year
                </div>
                <p className="mt-1 text-lg font-black text-slate-900">{currentYearId || 'Loading...'}</p>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Current Year ID</span>
                <p className="mt-2 text-sm font-semibold text-slate-900">{currentYearId || selectedSchoolYear || 'Loading...'}</p>
              </div>
              <label className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Next Year ID</span>
                <input
                  value={nextYearId}
                  onChange={(event) => setNextYearId(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-cyan-500"
                  placeholder="2026-2027"
                />
              </label>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  <ArrowRightLeft size={14} />
                  Auto Summary
                </div>
                <p className="mt-2 font-semibold text-slate-900">{promotedStudents.length} promoted</p>
                <p>{archivedStudents.length} archived</p>
              </div>
            </div>

            {error && <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
            {success && <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</div>}

            <div className="overflow-hidden rounded-[1.5rem] border border-slate-200">
              <div className="max-h-[38rem] overflow-auto">
                <table className="min-w-full divide-y divide-slate-200 bg-white">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">LRN</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Grade</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">GWA</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Outcome</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {!loading && students.length > 0 ? students.map((student) => {
                      const outcome = getOutcome(student);
                      const OutcomeIcon = outcome.icon;

                      return (
                        <tr key={String(student._id)} className="hover:bg-slate-50/70">
                          <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                            {student.firstName} {student.lastName}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600">{student.learnersReferenceNumber}</td>
                          <td className="px-4 py-4 text-sm text-slate-600">{student.gradeLevel || 'Unassigned'}</td>
                          <td className="px-4 py-4 text-sm text-slate-600">{Number.isFinite(Number(student.gwa)) ? Number(student.gwa).toFixed(2) : '—'}</td>
                          <td className="px-4 py-4 text-sm">
                            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${outcome.tone}`}>
                              <OutcomeIcon size={14} />
                              {outcome.label}
                            </span>
                            <p className="mt-1 text-xs text-slate-500">{outcome.note}</p>
                          </td>
                        </tr>
                      );
                    }) : loading ? (
                      <tr>
                        <td colSpan="5" className="px-4 py-12 text-center text-sm text-slate-500">
                          Loading students...
                        </td>
                      </tr>
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-4 py-12 text-center text-sm text-slate-500">
                          No students available for rollover.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">Summary</p>
              <div className="mt-4 grid grid-cols-1 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"><Users size={14} />Promoted</div>
                  <p className="mt-2 text-3xl font-black text-emerald-700">{promotedStudents.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"><Archive size={14} />Archived</div>
                  <p className="mt-2 text-3xl font-black text-amber-700">{archivedStudents.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"><RotateCw size={14} />Next Year</div>
                  <p className="mt-2 text-lg font-bold text-slate-900">{nextYearId || 'Not set'}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRollover}
                disabled={loading || submitting || !currentYearId || !nextYearId || isHistorical}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-700/25 transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                {submitting ? <RotateCw size={16} className="animate-spin" /> : <ArrowRightLeft size={16} />}
                Execute Rollover
              </button>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                This will archive current-year students, enrollments, sections, schedules, class assignments, grade-level curricula, payments, and receipts before creating next-year promotion records.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-cyan-100 bg-cyan-50/70 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">Rollover Notes</p>
              <ul className="mt-4 space-y-3 text-sm text-cyan-950/90">
                <li>Students with GWA &gt;= 75 are promoted to the next grade level.</li>
                <li>Students below 75, or students without a next grade level, are archived.</li>
                <li>The next school year starts with fresh enrollments and curriculum assignments.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}