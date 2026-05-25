'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, School, RotateCw, Archive, ArrowRightLeft, Users } from 'lucide-react';
import { useSchoolYearContext } from '@/components/SchoolYearContext';

const highestGrade = 'Grade 6';

const getNextSchoolYear = (schoolYear) => {
  const match = String(schoolYear || '').match(/^(\d{4})-(\d{4})$/);

  if (!match) {
    return '';
  }

  const startYear = Number(match[1]);
  return `${startYear + 1}-${startYear + 2}`;
};

export default function SchoolYearRolloverPage() {
  const { isHistorical, selectedSchoolYear } = useSchoolYearContext();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [students, setStudents] = useState([]);
  const [currentYearId, setCurrentYearId] = useState('');
  const [nextYearId, setNextYearId] = useState('');
  const [selectedPromotions, setSelectedPromotions] = useState(() => new Set());
  const [availableYears, setAvailableYears] = useState([]);

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

        setStudents(Array.isArray(rolloverData.data.students) ? rolloverData.data.students : []);
        // Prefer the server-provided selectedSchoolYear from context when available
        setCurrentYearId(selectedSchoolYear || rolloverData.data.currentYearId || schoolYearsData.data.selectedSchoolYear || schoolYearsData.data.currentSchoolYear || '');
        setNextYearId(nextYear || getNextSchoolYear(selectedSchoolYear) || '');
        setAvailableYears(Array.isArray(schoolYearsData.data.availableYears) ? schoolYearsData.data.availableYears : []);
        setSelectedPromotions(new Set());
      } catch (loadError) {
        setError(loadError.message || 'Failed to load rollover data');
      } finally {
        setLoading(false);
      }
    };

    loadRolloverData();
  }, []);

  const promotedStudents = useMemo(
    () => students.filter((student) => selectedPromotions.has(String(student._id))),
    [students, selectedPromotions]
  );

  const archivedStudents = useMemo(
    () => students.filter((student) => !selectedPromotions.has(String(student._id))),
    [students, selectedPromotions]
  );

  const togglePromotion = (studentId) => {
    setSelectedPromotions((previous) => {
      const next = new Set(previous);

      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }

      return next;
    });
  };

  const promotableIds = useMemo(() => students.filter((s) => String(s.gradeLevel || '').trim() !== highestGrade).map((s) => String(s._id)), [students]);

  const allPromotableSelected = useMemo(() => {
    if (promotableIds.length === 0) return false;
    return promotableIds.every((id) => selectedPromotions.has(id));
  }, [promotableIds, selectedPromotions]);

  const toggleSelectAll = () => {
    setSelectedPromotions((previous) => {
      if (promotableIds.length === 0) return new Set(previous);

      // if all selected -> clear, else select all promotable
      const allSelected = promotableIds.every((id) => previous.has(id));
      if (allSelected) return new Set();

      return new Set(promotableIds);
    });
  };

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
          promotedStudentIds: Array.from(selectedPromotions),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to rollover school year');
      }

      setSuccess(`Rollover completed: ${data.data.promotedCount} promoted, ${data.data.archivedStudentCount} archived.`);
      setSelectedPromotions(new Set());
    } catch (rolloverError) {
      setError(rolloverError.message || 'Failed to rollover school year');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-10">
        <div className="mb-8 flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">Admin Tool</p>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">School Year Rollover</h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Promote selected students, archive the current school year, and initialize the next year in one atomic step.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_0.9fr]">
          <div className="rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">Current Year</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">Select students to promote</h2>
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
              <label className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Current Year ID</span>
                <select
                  value={currentYearId || selectedSchoolYear}
                  onChange={() => {}}
                  disabled={true}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-gray-50 px-3 py-2 text-sm font-semibold outline-none"
                >
                  <option value={currentYearId || selectedSchoolYear}>{currentYearId || selectedSchoolYear}</option>
                </select>
              </label>
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
                  Selection Summary
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
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={allPromotableSelected}
                            onChange={toggleSelectAll}
                            className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                            aria-label="Select all promotable students"
                          />
                          <span>Promote</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">LRN</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Grade</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Outcome</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {!loading && students.length > 0 ? students.map((student) => {
                      const studentId = String(student._id);
                      const canPromote = String(student.gradeLevel || '').trim() !== highestGrade;
                      const isPromoted = selectedPromotions.has(studentId);

                      return (
                        <tr key={studentId} className="hover:bg-slate-50/70">
                          <td className="px-4 py-4">
                            {canPromote ? (
                              <input
                                type="checkbox"
                                checked={isPromoted}
                                onChange={() => togglePromotion(studentId)}
                                className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                              />
                            ) : (
                              <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">Graduate</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                            {student.firstName} {student.lastName}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600">{student.learnersReferenceNumber}</td>
                          <td className="px-4 py-4 text-sm text-slate-600">{student.gradeLevel || 'Unassigned'}</td>
                          <td className="px-4 py-4 text-sm">
                            {canPromote ? (
                              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${isPromoted ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                <CheckCircle2 size={14} />
                                {isPromoted ? 'Promoting' : 'Archive'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                <Archive size={14} />
                                Graduate to archive
                              </span>
                            )}
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
                This will archive all current-year students, enrollments, sections, schedules, class assignments, grade-level curricula, payments, and receipts before creating next-year promotion records.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-cyan-100 bg-cyan-50/70 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">Rollover Notes</p>
              <ul className="mt-4 space-y-3 text-sm text-cyan-950/90">
                <li>Promoted students keep their records and move up one grade level.</li>
                <li>Students at the highest grade are archived automatically.</li>
                <li>The next school year starts with fresh enrollments and curriculum assignments.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}