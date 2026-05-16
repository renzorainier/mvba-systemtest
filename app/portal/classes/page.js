'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Trash2, PencilLine, Layers3 } from 'lucide-react';
import AddClassAssignmentModal from './addClassAssignmentModal';

export default function ClassAssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingId, setDeletingId] = useState(null);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/classes');
      const data = await response.json();

      if (data.success) {
        setAssignments(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch class assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
    window.addEventListener('classAssignmentSaved', fetchAssignments);

    return () => window.removeEventListener('classAssignmentSaved', fetchAssignments);
  }, []);

  const openModal = () => {
    setEditingAssignment(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAssignment(null);
  };

  const openEditModal = (assignment) => {
    setEditingAssignment(assignment);
    setIsModalOpen(true);
  };

  const handleDelete = async (assignment) => {
    const confirmed = window.confirm(`Delete the assignment for ${assignment.section?.sectionName || 'this section'}?`);
    if (!confirmed) return;

    try {
      setDeletingId(assignment._id);
      const response = await fetch(`/api/classes/${assignment._id}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete class assignment');
      }

      await fetchAssignments();
    } catch (error) {
      alert(error.message || 'Failed to delete class assignment');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredAssignments = useMemo(() => {
    const query = searchTerm.toLowerCase();

    return assignments.filter((assignment) => {
      const sectionName = assignment.section?.sectionName || '';
      const sectionId = assignment.section?.sectionId || '';
      const teacherName = `${assignment.teacher?.firstName || ''} ${assignment.teacher?.lastName || ''}`.trim();
      const teacherId = assignment.teacher?.teacherId || '';
      const scheduleName = assignment.schedule?.name || '';
      const scheduleId = assignment.schedule?.scheduleId || '';

      return [sectionName, sectionId, teacherName, teacherId, scheduleName, scheduleId, assignment.assignmentId]
        .some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [assignments, searchTerm]);

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedAssignments = filteredAssignments.slice(startIdx, startIdx + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-800 md:p-8">
      <div className="mx-auto mb-6 flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
            <Layers3 size={14} />
            Academic Linking
          </div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Class Assignment Management</h1>
          <p className="mt-1 text-sm text-slate-600">Assign one section to one teacher and one grade-compatible schedule.</p>
        </div>

        <button onClick={openModal} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-blue-700">
          <Plus size={18} />
          New Assignment
        </button>
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search by section, teacher, schedule, or assignment ID..."
              className="block w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 leading-5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Assignment ID</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Section</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Teacher</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Schedule</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Grade Level</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Created</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {!loading && paginatedAssignments.length > 0 ? (
                  paginatedAssignments.map((assignment) => (
                    <tr key={assignment._id} className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-blue-600">{assignment.assignmentId}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                        {assignment.section?.sectionName || 'Unknown section'}
                        <div className="text-xs font-normal text-slate-500">{assignment.section?.sectionId || 'No section ID'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {assignment.teacher ? `${assignment.teacher.firstName || ''} ${assignment.teacher.lastName || ''}`.trim() : 'Unknown teacher'}
                        <div className="text-xs text-slate-500">{assignment.teacher?.teacherId || 'No teacher ID'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {assignment.schedule?.name || 'Unknown schedule'}
                        <div className="text-xs text-slate-500">{assignment.schedule?.scheduleId || 'No schedule ID'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{assignment.section?.gradeLevel || assignment.schedule?.gradeLevel || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{assignment.createdAt ? new Date(assignment.createdAt).toLocaleDateString() : '-'}</td>
                      <td className="px-6 py-4 text-right text-sm">
                        <div className="inline-flex items-center gap-3">
                          <button onClick={() => openEditModal(assignment)} className="inline-flex items-center gap-1 font-medium text-blue-600 transition-colors hover:text-blue-900">
                            <PencilLine size={16} />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(assignment)}
                            disabled={deletingId === assignment._id}
                            className="inline-flex items-center gap-1 font-medium text-red-600 transition-colors hover:text-red-900 disabled:opacity-50"
                          >
                            <Trash2 size={16} />
                            {deletingId === assignment._id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                      Loading class assignments...
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                      No class assignments found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-6 py-4">
            <span className="text-sm text-slate-600">
              Showing <span className="font-medium">{filteredAssignments.length ? startIdx + 1 : 0}</span>-<span className="font-medium">{Math.min(startIdx + itemsPerPage, filteredAssignments.length)}</span> of <span className="font-medium">{filteredAssignments.length}</span> assignments
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-slate-600">
                Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages || 1}</span>
              </span>
              <button
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <AddClassAssignmentModal open={isModalOpen} onClose={closeModal} editingAssignment={editingAssignment} />
    </div>
  );
}