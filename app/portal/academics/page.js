'use client';

import { useEffect, useMemo, useState } from 'react';
import { Save, School, Users, CheckCircle2, Archive } from 'lucide-react';
import { useSchoolYearContext } from '@/components/SchoolYearContext';

const PASSING_GWA = 75;

const getOutcome = (gwa) => {
  const numericGwa = Number(gwa);

  if (!Number.isFinite(numericGwa)) {
    return {
      label: 'Not set',
      tone: 'bg-slate-100 text-slate-600',
      icon: Archive,
      note: 'Needs a GWA entry',
    };
  }

  if (numericGwa >= PASSING_GWA) {
    return {
      label: 'Promote',
      tone: 'bg-emerald-50 text-emerald-700',
      icon: CheckCircle2,
      note: `Passing at ${numericGwa.toFixed(2)}`,
    };
  }

  return {
    label: 'Failed',
    tone: 'bg-rose-50 text-rose-700',
    icon: Archive,
    note: `Below ${PASSING_GWA}`,
  };
};

const toKey = (studentId) => String(studentId || '');

const getSectionKeys = (section) => {
  const keys = [section?.sectionId, section?._id]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  return Array.from(new Set(keys));
};

const enrollmentMatchesSection = (enrollment, section) => {
  const enrollmentSectionId = String(enrollment?.sectionId || '').trim();
  if (!enrollmentSectionId || !section) {
    return false;
  }

  return getSectionKeys(section).includes(enrollmentSectionId);
};

export default function AcademicsPage() {
  const { isHistorical, isDraft } = useSchoolYearContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [students, setStudents] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [gwaDrafts, setGwaDrafts] = useState({});

  const enrollmentCountBySection = useMemo(() => {
    return enrollments.reduce((counts, enrollment) => {
      const sectionId = String(enrollment.sectionId || '').trim();
      if (!sectionId) {
        return counts;
      }

      counts[sectionId] = (counts[sectionId] || 0) + 1;
      return counts;
    }, {});
  }, [enrollments]);

  const gradeLevels = useMemo(() => {
    const unique = Array.from(new Set(sections.map((section) => String(section.gradeLevel || '').trim()).filter(Boolean)));
    const order = ['Kinder 1', 'Kinder 2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];
    return unique.sort((left, right) => order.indexOf(left) - order.indexOf(right));
  }, [sections]);

  const sectionsForGrade = useMemo(
    () => sections.filter((section) => String(section.gradeLevel || '') === String(selectedGradeLevel || '')),
    [sections, selectedGradeLevel]
  );

  const selectedSection = useMemo(
    () => sectionsForGrade.find((section) => String(section.sectionId) === String(selectedSectionId)) || null,
    [sectionsForGrade, selectedSectionId]
  );

  const sectionEnrollments = useMemo(() => {
    if (!selectedSection) {
      return [];
    }

    return enrollments
      .filter((enrollment) => enrollmentMatchesSection(enrollment, selectedSection))
      .sort((left, right) => {
        const leftName = `${left.studentName || ''}`.toLowerCase();
        const rightName = `${right.studentName || ''}`.toLowerCase();
        return leftName.localeCompare(rightName);
      });
  }, [enrollments, selectedSection]);

  const sectionStudents = useMemo(() => {
    if (sectionEnrollments.length === 0) {
      return [];
    }

    // 'TBA' is a shared placeholder LRN, so it can't identify a single student — match by id.
    const isResolvableLrn = (lrn) => {
      const value = String(lrn || '').trim();
      return Boolean(value) && value !== 'TBA';
    };

    const studentById = new Map(students.map((student) => [String(student._id), student]));
    const studentByLrn = new Map(
      students
        .filter((student) => isResolvableLrn(student.learnersReferenceNumber))
        .map((student) => [String(student.learnersReferenceNumber).trim(), student])
    );

    return sectionEnrollments
      .map((enrollment) => {
        const resolvedStudent = (enrollment.studentId && studentById.get(String(enrollment.studentId)))
          || (isResolvableLrn(enrollment.learnersReferenceNumber) && studentByLrn.get(String(enrollment.learnersReferenceNumber).trim()))
          || null;

        if (!resolvedStudent) {
          return null;
        }

        return {
          ...resolvedStudent,
          enrollmentId: enrollment.enrollmentId,
          enrollmentStatus: enrollment.status,
          enrollmentSectionId: enrollment.sectionId,
          enrollmentSchoolYear: enrollment.schoolYear,
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        const leftName = `${left.lastName || ''} ${left.firstName || ''}`.toLowerCase();
        const rightName = `${right.lastName || ''} ${right.firstName || ''}`.toLowerCase();
        return leftName.localeCompare(rightName);
      });
  }, [students, sectionEnrollments]);

  const summary = useMemo(() => {
    const draftValues = sectionStudents.map((student) => gwaDrafts[toKey(student._id)] ?? student.gwa);
    const entered = draftValues.filter((value) => value !== '' && value !== null && value !== undefined);
    const promoted = entered.filter((value) => Number(value) >= PASSING_GWA).length;
    return {
      total: sectionStudents.length,
      entered: entered.length,
      promoted,
      archived: entered.length - promoted,
    };
  }, [sectionStudents, gwaDrafts]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [studentsResponse, sectionsResponse, enrollmentsResponse] = await Promise.all([
          fetch('/api/students'),
          fetch('/api/sections'),
          fetch('/api/enrollments'),
        ]);

        const studentsData = await studentsResponse.json();
        const sectionsData = await sectionsResponse.json();

        if (!studentsResponse.ok || !studentsData.success) {
          throw new Error(studentsData.error || 'Failed to load students');
        }

        if (!sectionsResponse.ok || !sectionsData.success) {
          throw new Error(sectionsData.error || 'Failed to load sections');
        }

        const enrollmentsData = await enrollmentsResponse.json();

        if (!enrollmentsResponse.ok || !enrollmentsData.success) {
          throw new Error(enrollmentsData.error || 'Failed to load enrollments');
        }

        const loadedStudents = Array.isArray(studentsData.data) ? studentsData.data : [];
        const loadedSections = Array.isArray(sectionsData.data) ? sectionsData.data : [];
        const loadedEnrollments = Array.isArray(enrollmentsData.data) ? enrollmentsData.data : [];

        setStudents(loadedStudents);
        setSections(loadedSections);
        setEnrollments(loadedEnrollments);

        const firstSectionWithStudents = loadedSections.find((section) => loadedEnrollments.some((enrollment) => enrollmentMatchesSection(enrollment, section)));
        const firstGradeLevel = firstSectionWithStudents?.gradeLevel || loadedSections[0]?.gradeLevel || '';
        const firstSectionId = firstSectionWithStudents?.sectionId || loadedSections.find((section) => String(section.gradeLevel || '') === String(firstGradeLevel || ''))?.sectionId || '';
        setSelectedGradeLevel(firstGradeLevel);
        setSelectedSectionId(firstSectionId);
      } catch (loadError) {
        setError(loadError.message || 'Failed to load academics data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (selectedGradeLevel && sectionsForGrade.length > 0 && !sectionsForGrade.some((section) => String(section.sectionId) === String(selectedSectionId))) {
      const nextSection = sectionsForGrade.find((section) => sectionEnrollments.some((enrollment) => enrollmentMatchesSection(enrollment, section))) || sectionsForGrade[0];
      setSelectedSectionId(nextSection?.sectionId || '');
    }
  }, [sectionEnrollments, sectionsForGrade, selectedGradeLevel, selectedSectionId]);

  const handleGwaChange = (studentId, value) => {
    setGwaDrafts((previous) => ({
      ...previous,
      [toKey(studentId)]: value,
    }));
  };

  const handleSaveSection = async () => {
    if (isHistorical || isDraft || sectionStudents.length === 0) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const updates = await Promise.all(
        sectionStudents.map(async (student) => {
          const gwaValue = gwaDrafts[toKey(student._id)];
          const updateData = new FormData();
          updateData.append(
            'gwa',
            gwaValue === undefined || gwaValue === '' || gwaValue === null ? String(student.gwa ?? '') : String(Number(gwaValue))
          );

          const response = await fetch(`/api/students/${student._id}`, {
            method: 'PUT',
            body: updateData,
          });

          const result = await response.json();

          if (!response.ok || !result.success) {
            throw new Error(result.error || `Failed to update ${student.firstName} ${student.lastName}`);
          }

          return result.data;
        })
      );

      setStudents((previous) => previous.map((student) => {
        const updated = updates.find((item) => String(item._id) === String(student._id));
        return updated || student;
      }));
      setGwaDrafts({});
      setSuccess(`Saved GWA for ${updates.length} student${updates.length === 1 ? '' : 's'}.`);
    } catch (saveError) {
      setError(saveError.message || 'Failed to save grades');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white px-4 py-6 text-slate-900 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-3">
          <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Student GWA Registry</h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Enter each student&apos;s GWA by grade level and section. The rollover process uses the saved values to decide promotion or archiving.
          </p>
        </div>

        {error && <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        {success && <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</div>}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-6 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">Filters</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">Choose grade level and section</h2>
            </div>

            <div className="grid gap-4">
              <label className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Grade Level</span>
                <select
                  value={selectedGradeLevel}
                  onChange={(event) => {
                    setSelectedGradeLevel(event.target.value);
                    const nextSections = sections.filter((section) => String(section.gradeLevel || '') === String(event.target.value || ''));
                    setSelectedSectionId(nextSections[0]?.sectionId || '');
                  }}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-cyan-500"
                >
                  <option value="">Select grade level</option>
                  {gradeLevels.map((gradeLevel) => (
                    <option key={gradeLevel} value={gradeLevel}>{gradeLevel}</option>
                  ))}
                </select>
              </label>

              <label className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Section</span>
                <select
                  value={selectedSectionId}
                  onChange={(event) => setSelectedSectionId(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-cyan-500"
                >
                  <option value="">Select section</option>
                  {sectionsForGrade.map((section) => (
                    <option key={section._id} value={section.sectionId}>
                      {section.sectionName} ({section.sectionId}) - {sectionEnrollments.filter((enrollment) => enrollmentMatchesSection(enrollment, section)).length} student{sectionEnrollments.filter((enrollment) => enrollmentMatchesSection(enrollment, section)).length === 1 ? '' : 's'}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500"><School size={14} />Students</div>
                <p className="mt-2 text-3xl font-black text-slate-900">{summary.total}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500"><Users size={14} />Entered</div>
                <p className="mt-2 text-3xl font-black text-cyan-700">{summary.entered}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500"><CheckCircle2 size={14} />Passing</div>
                <p className="mt-2 text-3xl font-black text-emerald-700">{summary.promoted}</p>
              </div>
            </div>

            {isDraft && (
              <p className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
                Grade encoding is disabled for draft school years. Activate the school year first.
              </p>
            )}
            <button
              type="button"
              onClick={handleSaveSection}
              disabled={loading || saving || isHistorical || isDraft || sectionStudents.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-700/25 transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              <Save size={16} />
              {saving ? 'Saving grades...' : 'Save section grades'}
            </button>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">Section roster</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {selectedSection ? `${selectedSection.sectionName} - ${selectedSection.gradeLevel}` : 'No section selected'}
                </h2>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left sm:text-right">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">School Year</p>
                <p className="mt-1 text-lg font-black tracking-tight text-slate-900">
                  {selectedSection?.schoolYear || 'Current'}
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-[1.5rem] border border-slate-200">
              <div className="max-h-[40rem] overflow-auto">
                <table className="min-w-full divide-y divide-slate-200 bg-white">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">LRN</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">GWA</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Outcome</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {!loading && selectedSection ? sectionStudents.map((student) => {
                      const gwaDraft = gwaDrafts[toKey(student._id)];
                      const currentValue = gwaDraft !== undefined ? gwaDraft : (student.gwa ?? '');
                      const outcome = getOutcome(currentValue);
                      const OutcomeIcon = outcome.icon;

                      return (
                        <tr key={`${String(student.enrollmentId || student._id)}-${String(student.enrollmentSchoolYear || '')}-${String(student.enrollmentSectionId || '')}`} className="hover:bg-slate-50/70">
                          <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                            {student.firstName} {student.lastName}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600">{student.learnersReferenceNumber}</td>
                          <td className="px-4 py-4">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={currentValue}
                              onChange={(event) => handleGwaChange(student._id, event.target.value)}
                              disabled={isHistorical || isDraft}
                              placeholder="0.00"
                              className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                            />
                          </td>
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
                        <td colSpan="4" className="px-4 py-12 text-center text-sm text-slate-500">
                          Loading roster...
                        </td>
                      </tr>
                    ) : (
                      <tr>
                        <td colSpan="4" className="px-4 py-12 text-center text-sm text-slate-500">
                          Select a grade level and section to enter GWA.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
