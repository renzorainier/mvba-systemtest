"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Users, Wallet, TrendingUp } from 'lucide-react';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const GRADE_ORDER = ['Kinder 1', 'Kinder 2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];

const GRADE_STYLES = [
  { borderColor: 'border-cyan-500', valueColor: 'text-cyan-700', accentBg: 'bg-cyan-100' },
  { borderColor: 'border-fuchsia-500', valueColor: 'text-fuchsia-700', accentBg: 'bg-fuchsia-100' },
  { borderColor: 'border-emerald-500', valueColor: 'text-emerald-700', accentBg: 'bg-emerald-100' },
  { borderColor: 'border-amber-500', valueColor: 'text-amber-700', accentBg: 'bg-amber-100' },
  { borderColor: 'border-indigo-500', valueColor: 'text-indigo-700', accentBg: 'bg-indigo-100' },
  { borderColor: 'border-sky-500', valueColor: 'text-sky-700', accentBg: 'bg-sky-100' },
  { borderColor: 'border-lime-500', valueColor: 'text-lime-700', accentBg: 'bg-lime-100' },
  { borderColor: 'border-orange-500', valueColor: 'text-orange-700', accentBg: 'bg-orange-100' },
];

const formatMonthKey = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '';
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const getSchoolYearStart = (schoolYearText) => {
  const match = String(schoolYearText || '').match(/^(\d{4})\s*-\s*(\d{4})$/);

  if (!match) {
    return null;
  }

  const startYear = Number(match[1]);
  const endYear = Number(match[2]);

  if (!Number.isInteger(startYear) || !Number.isInteger(endYear) || endYear !== startYear + 1) {
    return null;
  }

  return startYear;
};

const parseStartMonthIndex = (value) => {
  const firstMonthText = String(value || '').split('until')[0].trim().split(/\s+/)[0];
  return MONTH_NAMES.findIndex((month) => month.toLowerCase() === firstMonthText.toLowerCase());
};

const buildMonthOptions = (tuitionPlans = [], schoolYearText = '') => {
  const schoolYearStart = getSchoolYearStart(schoolYearText) || new Date().getFullYear();
  const monthMap = new Map();

  tuitionPlans.forEach((plan) => {
    const monthlyCount = Number(plan?.monthlyPaymentCount || 0);
    const startMonthIndex = parseStartMonthIndex(plan?.monthlyPaymentMonths || '');

    if (monthlyCount <= 0 || startMonthIndex < 0) {
      return;
    }

    for (let index = 0; index < monthlyCount; index += 1) {
      const monthIndex = (startMonthIndex + index) % 12;
      const yearOffset = Math.floor((startMonthIndex + index) / 12);
      const year = schoolYearStart + yearOffset;
      const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

      if (!monthMap.has(key)) {
        monthMap.set(key, {
          key,
          label: `${MONTH_NAMES[monthIndex]} ${year}`,
          monthIndex,
          year,
        });
      }
    }
  });

  return [...monthMap.values()].sort((left, right) => (left.year - right.year) || (left.monthIndex - right.monthIndex));
};

const getStudentIdentifiers = (student) => {
  const identifiers = [String(student?._id || '').trim()];
  const lrn = String(student?.learnersReferenceNumber || '').trim();
  const sourceStudentId = String(student?.sourceStudentId || '').trim();

  if (lrn && lrn.toUpperCase() !== 'TBA') {
    identifiers.push(lrn);
  }

  if (sourceStudentId) {
    identifiers.push(sourceStudentId);
  }

  return identifiers.filter(Boolean);
};

const StatCard = ({ title, value, subtitle, valueColor, borderColor, icon: Icon, accentBg }) => (
  <div
    className={`group relative overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white/95 p-6 shadow-[0_14px_40px_rgba(15,23,42,0.08)] transition-transform duration-200 hover:-translate-y-0.5 ${borderColor}`}
  >
    <div className={`absolute inset-y-0 left-0 w-1.5 ${borderColor.replace('border-', 'bg-')}`} />
    <div className={`absolute right-4 top-4 rounded-full ${accentBg} p-3 ring-1 ring-white/70`}>
      <Icon size={18} className={valueColor} />
    </div>
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</p>
    <h3 className={`text-3xl font-black tracking-tight ${valueColor}`}>{value}</h3>
    <p className="mt-2 max-w-[14rem] text-xs leading-5 text-slate-500">{subtitle}</p>
  </div>
);

const GradeCard = ({ title, value, subtitle, borderColor, valueColor, accentBg }) => (
  <div
    className={`group relative overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white/95 p-5 shadow-[0_14px_40px_rgba(15,23,42,0.08)] transition-transform duration-200 hover:-translate-y-0.5 ${borderColor}`}
  >
    <div className={`absolute inset-y-0 left-0 w-1.5 ${borderColor.replace('border-', 'bg-')}`} />
    <div className={`absolute right-4 top-4 rounded-full ${accentBg} p-3 ring-1 ring-white/70`}>
      <Users size={18} className={valueColor} />
    </div>
    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</p>
    <h3 className={`text-4xl font-black leading-none tracking-tight ${valueColor}`}>{value}</h3>
    <p className="mt-3 text-xs text-slate-500">{subtitle}</p>
  </div>
);

export default function App() {
  const [studentCount, setStudentCount] = useState(null);
  const [students, setStudents] = useState([]);
  const [financialRecords, setFinancialRecords] = useState([]);
  const [settingsData, setSettingsData] = useState(null);
  const [studentBreakdowns, setStudentBreakdowns] = useState({});
  const [totalTuition, setTotalTuition] = useState(null);
  const [outstandingBalance, setOutstandingBalance] = useState(null);
  const [totalPayments, setTotalPayments] = useState(null);
  const [selectedMonthKey, setSelectedMonthKey] = useState('');
  const [schoolYearState, setSchoolYearState] = useState({
    loading: true,
    currentSchoolYear: '',
    selectedSchoolYear: '',
    isHistorical: false,
  });

  const formatPhp = (value) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  const activeSchoolYear = schoolYearState.selectedSchoolYear || schoolYearState.currentSchoolYear || settingsData?.currentSchoolYear || '';
  const tuitionPlans = Array.isArray(settingsData?.tuitionPlans) ? settingsData.tuitionPlans : [];
  const monthOptions = useMemo(() => buildMonthOptions(tuitionPlans, activeSchoolYear), [tuitionPlans, activeSchoolYear]);

  useEffect(() => {
    if (monthOptions.length === 0) {
      return;
    }

    setSelectedMonthKey((previousMonthKey) => {
      if (previousMonthKey && monthOptions.some((option) => option.key === previousMonthKey)) {
        return previousMonthKey;
      }

      const nowKey = formatMonthKey(new Date());
      const matchedMonth = monthOptions.find((option) => option.key === nowKey) || monthOptions[monthOptions.length - 1];
      return matchedMonth?.key || '';
    });
  }, [monthOptions]);

  const studentsByGrade = GRADE_ORDER.reduce((groups, gradeLevel) => {
    groups[gradeLevel] = students.filter((student) => student.gradeLevel === gradeLevel);
    return groups;
  }, {});

  const unassignedStudents = students.filter((student) => !student.gradeLevel);
  const completedPayments = financialRecords.filter((record) => String(record.status || '').toLowerCase() === 'completed');

  const studentKeyLookup = useMemo(() => {
    const lookup = new Map();

    students.forEach((student) => {
      getStudentIdentifiers(student).forEach((identifier) => {
        lookup.set(identifier, String(student._id));
      });
    });

    return lookup;
  }, [students]);

  const unpaidStudentsByMonth = useMemo(() => {
    if (!selectedMonthKey) {
      return [];
    }

    return students.filter((student) => {
      const breakdown = studentBreakdowns[String(student._id)];

      if (!breakdown || !Array.isArray(breakdown.breakdownItems)) {
        return true;
      }

      const monthEntry = breakdown.breakdownItems.find((item) => {
        if (item?.type !== 'monthly') {
          return false;
        }

        const monthKey = `${item.year}-${String(Number(item.monthIndex || 0) + 1).padStart(2, '0')}`;
        return monthKey === selectedMonthKey;
      });

      if (!monthEntry) {
        return true;
      }

      return String(monthEntry.status || '').toLowerCase() !== 'paid';
    });
  }, [selectedMonthKey, studentBreakdowns, students]);

  const unpaidStudentsByGrade = useMemo(() => {
    return GRADE_ORDER.reduce((groups, gradeLevel) => {
      groups[gradeLevel] = unpaidStudentsByMonth.filter((student) => student.gradeLevel === gradeLevel);
      return groups;
    }, {});
  }, [unpaidStudentsByMonth]);

  const totalUnpaidStudents = unpaidStudentsByMonth.length;
  const selectedMonthLabel = monthOptions.find((option) => option.key === selectedMonthKey)?.label || 'Selected month';

  const lastPaymentByStudentId = useMemo(() => {
    const lastPayments = new Map();

    completedPayments.forEach((record) => {
      const matchedStudentId = studentKeyLookup.get(String(record.studentId || '').trim());
      const paymentDate = new Date(record.dateOfPayment);

      if (!matchedStudentId || Number.isNaN(paymentDate.getTime())) {
        return;
      }

      const previousDate = lastPayments.get(matchedStudentId);

      if (!previousDate || paymentDate > previousDate) {
        lastPayments.set(matchedStudentId, paymentDate);
      }
    });

    return lastPayments;
  }, [completedPayments, studentKeyLookup]);

  useEffect(() => {
    if (students.length === 0 || monthOptions.length === 0) {
      setStudentBreakdowns({});
      return;
    }

    let cancelled = false;

    const fetchStudentBreakdowns = async () => {
      try {
        const entries = await Promise.all(
          students.map(async (student) => {
            const lrn = String(student.learnersReferenceNumber || '').trim();
            const id = lrn && lrn.toUpperCase() !== 'TBA' ? lrn : student._id;
            const response = await fetch(`/api/financials/monthly/${id}`);
            const data = await response.json();

            if (!response.ok || !data.success) {
              return [String(student._id), null];
            }

            return [String(student._id), data.data || null];
          })
        );

        if (!cancelled) {
          setStudentBreakdowns(Object.fromEntries(entries));
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to fetch student breakdowns:', error);
          setStudentBreakdowns({});
        }
      }
    };

    fetchStudentBreakdowns();

    return () => {
      cancelled = true;
    };
  }, [students, monthOptions.length]);

  useEffect(() => {
    const fetchDashboardMetrics = async () => {
      try {
        const [studentsResponse, financialsResponse, settingsResponse] = await Promise.all([
          fetch('/api/students'),
          fetch('/api/financials'),
          fetch('/api/system-settings'),
        ]);

        const studentsData = await studentsResponse.json();
        const financialsData = await financialsResponse.json();
        const settingsData = await settingsResponse.json();

        if (!studentsData.success) {
          throw new Error(studentsData.error || 'Failed to load students');
        }

        const students = studentsData.data || [];
        setStudents(students);
        setFinancialRecords(financialsData.data || []);
        setSettingsData(settingsData.data || null);
        setStudentCount(students.length);

        const settingsTotal = Number(settingsData?.data?.totalEstimatedCost || 0);

        const computedTotalTuition = students.reduce(
          (sum, student) => sum + Number(student.totalEstimatedCost || settingsTotal || 0),
          0
        );
        const computedOutstandingBalance = students.reduce(
          (sum, student) => sum + Number(student.remainingBalance || 0),
          0
        );

        setTotalTuition(computedTotalTuition);
        setOutstandingBalance(computedOutstandingBalance);

        if (financialsData.success) {
          const completedPayments = (financialsData.data || []).filter(
            (record) => String(record.status).toLowerCase() === 'completed'
          );
          const computedTotalPayments = completedPayments.reduce(
            (sum, record) => sum + Number(record.amountPaid || 0),
            0
          );
          setTotalPayments(computedTotalPayments);
        } else {
          setTotalPayments(0);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard metrics:', error);
        setStudentCount(0);
        setTotalTuition(0);
        setOutstandingBalance(0);
        setTotalPayments(0);
      }
    };

    const fetchSchoolYear = async () => {
      try {
        const response = await fetch('/api/school-years');
        const data = await response.json();

        if (!response.ok || !data.success) {
          return;
        }

        setSchoolYearState({
          loading: false,
          currentSchoolYear: data.data.currentSchoolYear || '',
          selectedSchoolYear: data.data.selectedSchoolYear || data.data.currentSchoolYear || '',
          isHistorical: Boolean(data.data.isHistorical),
        });
      } catch {
        setSchoolYearState((previous) => ({ ...previous, loading: false }));
      }
    };

    fetchDashboardMetrics();
    fetchSchoolYear();
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800">
      <main className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 lg:px-10">
        <div className="mb-8 flex flex-col gap-3">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">Dashboard</h1>
              <p className="max-w-2xl text-sm text-slate-500">
                Quick view of your school totals, balances, and current payment activity.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">School Year</p>
              <p className="mt-1 text-lg font-black tracking-tight text-slate-900">
                {schoolYearState.loading
                  ? 'Loading...'
                  : schoolYearState.selectedSchoolYear || schoolYearState.currentSchoolYear || 'Not set'}
              </p>
              {schoolYearState.isHistorical && !schoolYearState.loading && (
                <p className="mt-1 text-xs font-medium text-amber-700">
                  Historical selection
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <StatCard
            title="Total Students"
            value={studentCount === null ? '...' : String(studentCount)}
            subtitle="Total registered students"
            valueColor="text-cyan-700"
            borderColor="border-cyan-500"
            icon={Users}
            accentBg="bg-cyan-100"
          />
          <StatCard
            title="Total Tuition"
            value={totalTuition === null ? '...' : formatPhp(totalTuition)}
            subtitle={outstandingBalance === null ? 'Overall tuition for all enrolled students' : `Outstanding: ${formatPhp(outstandingBalance)}`}
            valueColor="text-amber-700"
            borderColor="border-amber-500"
            icon={Wallet}
            accentBg="bg-amber-100"
          />
          <StatCard
            title="Total Payments"
            value={totalPayments === null ? '...' : formatPhp(totalPayments)}
            subtitle="Total payments recorded this semester"
            valueColor="text-emerald-700"
            borderColor="border-emerald-500"
            icon={TrendingUp}
            accentBg="bg-emerald-100"
          />
        </div>  

        {/* Students by Grade Level */}
        <div className="mt-6 rounded-[1.75rem] border border-white/70 bg-white/85 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">Student Breakdown</p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">Students by Grade Level</h2>
              <p className="mt-1 text-sm text-slate-500">Showing all enrolled students by grade level.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left sm:text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Total Students Enrolled</p>
              <p className="text-2xl font-black text-slate-900">{studentCount === null ? '...' : studentCount}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {GRADE_ORDER.map((gradeLevel) => {
              const gradeStudents = studentsByGrade[gradeLevel] || [];
              const unpaidGradeStudents = unpaidStudentsByGrade[gradeLevel] || [];
              const style = GRADE_STYLES[GRADE_ORDER.indexOf(gradeLevel)] || GRADE_STYLES[0];

              return (
                <GradeCard
                  key={gradeLevel}
                  title={`${gradeLevel}`}
                  value={studentCount === null ? '...' : String(gradeStudents.length)}
                  subtitle={`${gradeStudents.length} student${gradeStudents.length !== 1 ? 's' : ''} enrolled`}
                  borderColor={style.borderColor}
                  valueColor={style.valueColor}
                  accentBg={style.accentBg}
                />
              );
            })}

            {unassignedStudents.length > 0 && (
              <GradeCard
                title="Unassigned"
                value={studentCount === null ? '...' : String(unassignedStudents.length)}
                subtitle="Students without a grade level"
                borderColor="border-slate-400"
                valueColor="text-slate-700"
                accentBg="bg-slate-100"
              />
            )}
          </div>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-white/70 bg-white/90 p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)] backdrop-blur">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-rose-700">Unpaid Students</p>
              <h2 className="mt-1 text-base font-bold text-slate-900">Students without a completed payment for {selectedMonthLabel}</h2>
              <p className="mt-1 max-w-2xl text-xs text-slate-500">Switch months to review who still needs payment.</p>
            </div>
            <div className="flex flex-col gap-2 md:items-end">
              <label className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left shadow-[0_8px_18px_rgba(15,23,42,0.03)]">
                <span className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <CalendarDays size={13} />
                  Month
                </span>
                <select
                  value={selectedMonthKey}
                  onChange={(event) => setSelectedMonthKey(event.target.value)}
                  className="w-full min-w-[190px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-cyan-500"
                  disabled={monthOptions.length === 0}
                >
                  {monthOptions.length === 0 ? (
                    <option value="">No tuition months configured</option>
                  ) : (
                    monthOptions.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-white px-3 py-2 shadow-[0_8px_18px_rgba(15,23,42,0.03)] md:min-w-[190px]">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Total unpaid</span>
                <span className="text-xl font-black leading-none text-rose-700">{studentCount === null ? '...' : totalUnpaidStudents}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {selectedMonthKey && totalUnpaidStudents > 0 ? (
              GRADE_ORDER.map((gradeLevel) => {
                const gradeUnpaidStudents = unpaidStudentsByGrade[gradeLevel] || [];

                if (gradeUnpaidStudents.length === 0) {
                  return null;
                }

                return (
                  <div key={gradeLevel} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 shadow-[0_6px_16px_rgba(15,23,42,0.04)]">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{gradeLevel}</h4>
                        <p className="text-xs text-slate-500">{gradeUnpaidStudents.length} unpaid in {selectedMonthLabel}</p>
                      </div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-700">
                        Needs payment
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {gradeUnpaidStudents.map((student) => {
                        const lastPaymentDate = lastPaymentByStudentId.get(String(student._id));

                        return (
                          <div key={student._id} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-start justify-between gap-3">
                                <p className="font-semibold text-slate-900">
                                  {student.firstName} {student.lastName}
                                </p>
                                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-700">
                                  unpaid
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                                <span>LRN: {student.learnersReferenceNumber || 'N/A'}</span>
                                <span>Last payment: {lastPaymentDate ? lastPaymentDate.toLocaleDateString() : 'None'}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                {monthOptions.length === 0
                  ? 'No month options are available yet. Add tuition months in system settings to enable this breakdown.'
                  : 'No unpaid students were found for the selected month.'}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );  
}