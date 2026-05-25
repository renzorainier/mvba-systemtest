"use client";

import React, { useEffect, useState } from 'react';
import { Users, Wallet, TrendingUp } from 'lucide-react';

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

const GradeCard = ({ title, value, borderColor, valueColor, accentBg }) => (
  <div
    className={`group relative overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white/95 p-5 shadow-[0_14px_40px_rgba(15,23,42,0.08)] transition-transform duration-200 hover:-translate-y-0.5 ${borderColor}`}
  >
    <div className={`absolute inset-y-0 left-0 w-1.5 ${borderColor.replace('border-', 'bg-')}`} />
    <div className={`absolute right-4 top-4 rounded-full ${accentBg} p-3 ring-1 ring-white/70`}>
      <Users size={18} className={valueColor} />
    </div>
    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</p>
    <h3 className={`text-4xl font-black leading-none tracking-tight ${valueColor}`}>{value}</h3>
    <p className="mt-3 text-xs text-slate-500">Students enrolled</p>
  </div>
);

export default function App() {
  const gradeOrder = ['Kinder 1', 'Kinder 2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];
  const [studentCount, setStudentCount] = useState(null);
  const [students, setStudents] = useState([]);
  const [totalTuition, setTotalTuition] = useState(null);
  const [outstandingBalance, setOutstandingBalance] = useState(null);
  const [totalPayments, setTotalPayments] = useState(null);
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

  const studentsByGrade = gradeOrder.reduce((groups, gradeLevel) => {
    groups[gradeLevel] = students.filter((student) => student.gradeLevel === gradeLevel);
    return groups;
  }, {});

  const unassignedStudents = students.filter((student) => !student.gradeLevel);

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
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">Admin Portal</p>
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
              <p className="mt-1 text-sm text-slate-500">Student totals per grade level.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left sm:text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Total Students</p>
              <p className="text-2xl font-black text-slate-900">{studentCount === null ? '...' : studentCount}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {gradeOrder.map((gradeLevel) => {
              const gradeStudents = studentsByGrade[gradeLevel] || [];
              const gradeStyles = [
                { borderColor: 'border-cyan-500', valueColor: 'text-cyan-700', accentBg: 'bg-cyan-100' },
                { borderColor: 'border-fuchsia-500', valueColor: 'text-fuchsia-700', accentBg: 'bg-fuchsia-100' },
                { borderColor: 'border-emerald-500', valueColor: 'text-emerald-700', accentBg: 'bg-emerald-100' },
                { borderColor: 'border-amber-500', valueColor: 'text-amber-700', accentBg: 'bg-amber-100' },
                { borderColor: 'border-indigo-500', valueColor: 'text-indigo-700', accentBg: 'bg-indigo-100' },
                { borderColor: 'border-sky-500', valueColor: 'text-sky-700', accentBg: 'bg-sky-100' },
                { borderColor: 'border-lime-500', valueColor: 'text-lime-700', accentBg: 'bg-lime-100' },
                { borderColor: 'border-orange-500', valueColor: 'text-orange-700', accentBg: 'bg-orange-100' },
              ];
              const style = gradeStyles[gradeOrder.indexOf(gradeLevel)] || gradeStyles[0];

              return (
                <GradeCard
                  key={gradeLevel}
                  title={gradeLevel}
                  value={studentCount === null ? '...' : String(gradeStudents.length)}
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
                borderColor="border-slate-400"
                valueColor="text-slate-700"
                accentBg="bg-slate-100"
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );  
}