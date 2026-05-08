"use client";

import React, { useEffect, useState } from 'react';
import { SlidersHorizontal, Users, Wallet, TrendingUp } from 'lucide-react';

const StatCard = ({ title, value, subtitle, valueColor, borderColor, icon: Icon, accentBg }) => (
  <div className={`relative overflow-hidden bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 ${borderColor} flex flex-col justify-center h-36`}>
    <div className={`absolute right-4 top-4 ${accentBg} rounded-full p-3`}>
      <Icon size={18} className={valueColor} />
    </div>
    <p className="text-gray-500 text-xs font-semibold mb-1 uppercase tracking-[0.18em]">{title}</p>
    <h3 className={`text-3xl font-bold ${valueColor}`}>{value}</h3>
    <p className="text-gray-400 text-xs mt-2 max-w-[14rem]">{subtitle}</p>
  </div>
);

export default function App() {
  const [studentCount, setStudentCount] = useState(null);

  useEffect(() => {
    const fetchStudentCount = async () => {
      try {
        const response = await fetch('/api/students');
        const data = await response.json();

        if (data.success) {
          setStudentCount(data.data.length);
        }
      } catch (error) {
        console.error('Failed to fetch student count:', error);
      }
    };

    fetchStudentCount();
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#ffffff_0%,_#f3f7ff_38%,_#eef2f7_100%)] font-sans text-slate-800">
      <main className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 md:px-8 lg:px-10 lg:py-8">
        <div className="mb-8 flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600">Admin Portal</p>
          <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">Dashboard</h1>
          <p className="max-w-2xl text-sm text-slate-500">
            Quick view of your school totals, balances, and current payment activity.
          </p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <StatCard
            title="Total Students"
            value={studentCount === null ? '...' : String(studentCount)}
            subtitle="Total registered students"
            valueColor="text-sky-700"
            borderColor="border-sky-500"
            icon={Users}
            accentBg="bg-sky-100"
          />
          <StatCard
            title="Outstanding Balance"
            value="₱13,700"
            subtitle="Total unpaid fees across all students"
            valueColor="text-rose-600"
            borderColor="border-rose-500"
            icon={Wallet}
            accentBg="bg-rose-50"
          />
          <StatCard
            title="Total Payments"
            value="₱11,000"
            subtitle="Total payments recorded this semester"
            valueColor="text-emerald-700"
            borderColor="border-emerald-500"
            icon={TrendingUp}
            accentBg="bg-emerald-100"
          />
        </div>

        {/* Automated Reports Panel */}
        <div className="mt-6 rounded-2xl border border-white/70 bg-white/90 p-6 shadow-sm backdrop-blur">
          <h2 className="mb-1 text-lg font-bold text-slate-900">Automated Reports</h2>
          <p className="mb-5 text-sm text-slate-500">Generate necessary reports for effective planning and decision-making.</p>
          <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700">
            <SlidersHorizontal size={16} />
            Generate Report
          </button>
        </div>
      </main>
    </div>
  );
}