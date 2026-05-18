'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCcw, Search } from 'lucide-react';

export default function ArchivedStudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [restoringId, setRestoringId] = useState('');

  const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '—');

  const fetchArchivedStudents = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/students/archived');
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load archived students');
      }

      setStudents(data.data || []);
    } catch (fetchError) {
      setError(fetchError.message || 'Failed to load archived students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return students.filter((student) => {
      return (
        `${student.firstName} ${student.lastName}`.toLowerCase().includes(query) ||
        String(student.learnersReferenceNumber || '').toLowerCase().includes(query)
      );
    });
  }, [students, searchTerm]);

  const handleRestore = async (student) => {
    const confirmed = window.confirm(
      `Restore ${student.firstName} ${student.lastName} and all linked enrollment and payment records?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setRestoringId(student._id);
      setError('');

      const response = await fetch(`/api/students/${student._id}/restore`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to restore student');
      }

      setStudents((prev) => prev.filter((item) => item._id !== student._id));
    } catch (restoreError) {
      setError(restoreError.message || 'Failed to restore student');
    } finally {
      setRestoringId('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/portal/students" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
                <ArrowLeft size={16} />
                Back to Students
              </Link>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Archived Students</h1>
            <p className="text-sm text-slate-500 mt-1">Restore archived student records and their related enrollments and payments.</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search archived students by name or LRN..."
              className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg bg-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">LRN</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Grade</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Archived At</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Linked Records</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {!loading && filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <tr key={student._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-700">{student.learnersReferenceNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                        {student.firstName} {student.lastName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{student.gradeLevel || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{formatDate(student.archivedAt)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {student.enrollmentCount || 0} enrollments, {student.paymentCount || 0} payments, {student.receiptCount || 0} receipts
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleRestore(student)}
                          disabled={restoringId === student._id}
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <RotateCcw size={16} />
                          {restoringId === student._id ? 'Restoring...' : 'Restore'}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-sm text-slate-500">Loading archived students...</td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-sm text-slate-500">
                      No archived students found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}