'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, ClipboardList } from 'lucide-react';
import AddEnrollmentsModal from '../enrollments/addEnrollmentsModal';
import { useSchoolYearContext } from '@/components/SchoolYearContext';

export default function App() {
  const { isHistorical } = useSchoolYearContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [enrollments, setEnrollments] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingEnrollment, setEditingEnrollment] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusUpdating, setStatusUpdating] = useState(null);
  const [sectionUpdating, setSectionUpdating] = useState(null);

  const openModal = () => {
    if (isHistorical) {
      return;
    }
    setEditingEnrollment(null);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEnrollment(null);
  };
  const openEditModal = (enrollment) => {
    if (isHistorical) {
      return;
    }
    setEditingEnrollment(enrollment);
    setIsModalOpen(true);
  };

  useEffect(() => {
    fetchEnrollments();
    fetchSections();


    const handleEnrollmentAdded = () => {
      fetchEnrollments();
      fetchSections();
    };

    window.addEventListener('enrollmentAdded', handleEnrollmentAdded);

    return () => window.removeEventListener('enrollmentAdded', handleEnrollmentAdded);
  }, []);

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/enrollments');
      const data = await response.json();

      if (data.success) {
        setEnrollments(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch enrollments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSections = async () => {
    try {
      const response = await fetch('/api/sections');
      const data = await response.json();

      if (data.success) {
        setSections(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error('Failed to fetch sections:', error);
    }
  };

  const filteredEnrollments = enrollments.filter(enrollment => {
    const fullName = (enrollment.studentName || '').toLowerCase();
    const sectionName = (enrollment.sectionName || '').toLowerCase();
    const enrollmentId = enrollment.enrollmentId?.toLowerCase() || '';
    const searchLower = searchTerm.toLowerCase();

    return fullName.includes(searchLower) || sectionName.includes(searchLower) || enrollmentId.includes(searchLower);
  });

  // Pagination logic
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredEnrollments.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedEnrollments = filteredEnrollments.slice(startIdx, startIdx + itemsPerPage);

  // Reset page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Enrolled':
      case 'Approved':
        return 'border-green-200 bg-green-50 text-green-700 focus:border-green-500 focus:ring-green-500';
      case 'Dropped':
        return 'border-red-200 bg-red-50 text-red-700 focus:border-red-500 focus:ring-red-500';
      case 'Failed':
        return 'border-red-200 bg-red-50 text-red-700 focus:border-red-500 focus:ring-red-500';
      case 'For payment':
        return 'border-yellow-200 bg-yellow-50 text-yellow-700 focus:border-yellow-500 focus:ring-yellow-500';
      case 'Interview':
        return 'border-gray-300 bg-white text-gray-700 focus:border-blue-500 focus:ring-blue-500';
      default:
        return 'border-gray-300 bg-white text-gray-700 focus:border-blue-500 focus:ring-blue-500';
    }
  };

  const STATUS_OPTIONS = [
    'Interview',
    'Approved',
    'For payment',
    'Enrolled',
    'Dropped',
    'Failed',
  ];

  const getDisplayStatus = (status) => (status === 'Pending' ? 'For payment' : status);

  const updateEnrollmentStatus = async (enrollment, newStatus) => {
    try {
      setStatusUpdating(enrollment._id);

      // Prepare body with required fields to avoid overwriting with undefined
      const body = {
        learnersReferenceNumber: enrollment.learnersReferenceNumber,
        sectionId: enrollment.sectionId,
        schoolYear: enrollment.schoolYear,
        enrollmentDate: enrollment.enrollmentDate,
        status: newStatus,
      };


      const res = await fetch(`/api/enrollments/${enrollment._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');

      // Update local state
      setEnrollments((prev) => prev.map((e) => (e._id === enrollment._id ? { ...e, status: newStatus } : e)));
    } catch (err) {
      console.error('Failed to update status:', err);
      alert(err.message || 'Failed to update status');
    } finally {
      setStatusUpdating(null);
    }
  };

  const updateEnrollmentSection = async (enrollment, newSectionId) => {
    try {
      setSectionUpdating(enrollment._id);

      const res = await fetch(`/api/enrollments/${enrollment._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learnersReferenceNumber: enrollment.learnersReferenceNumber,
          sectionId: newSectionId,
          enrollmentDate: enrollment.enrollmentDate,
          status: enrollment.status,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update section');

      const selectedSection = sections.find((section) => String(section.sectionId || section._id) === String(newSectionId));

      setEnrollments((prev) => prev.map((e) => (
        e._id === enrollment._id
          ? {
              ...e,
              sectionId: newSectionId,
              sectionName: selectedSection?.sectionName || newSectionId,
            }
          : e
      )));
    } catch (err) {
      console.error('Failed to update section:', err);
      alert(err.message || 'Failed to update section');
    } finally {
      setSectionUpdating(null);
    }
  };

  const getSectionOptionsForEnrollment = (enrollment) => {
    const selectedSectionId = String(enrollment.sectionId || '').trim();
    const selectedSection = sections.find((section) => String(section.sectionId || section._id) === selectedSectionId);
    const enrollmentGradeLevel = String(enrollment.studentGradeLevel || selectedSection?.gradeLevel || '').trim();

    if (!enrollmentGradeLevel) {
      return sections;
    }

    return sections.filter((section) => {
      const sectionGradeLevel = String(section.gradeLevel || '').trim();
      const sectionValue = String(section.sectionId || section._id || '').trim();
      return sectionGradeLevel === enrollmentGradeLevel || sectionValue === selectedSectionId;
    });
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800 p-4">
      <div className="max-w-7xl mx-auto mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">Enrollment Management</h1>
          <p className="mt-1 text-sm text-slate-600">Track and manage student enrollments across sections and school years.</p>
        </div>
        <button onClick={openModal} disabled={isHistorical} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300">
          <Plus size={18} />
          Add New Enrollment
        </button>
      </div>

      <div className="max-w-7xl mx-auto">

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search enrollments by name or ID..."
              className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:placeholder-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm transition duration-150 ease-in-out"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Enrollment ID
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Student Name
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Section Name
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    School Year
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Enrollment Date
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {!loading && paginatedEnrollments.length > 0 ? (
                  paginatedEnrollments.map((enrollment) => (
                    <tr key={enrollment._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        {enrollment.enrollmentId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {enrollment.studentName || enrollment.learnersReferenceNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          {(() => {
                            const sectionOptions = getSectionOptionsForEnrollment(enrollment);

                            return (
                          <select
                            value={enrollment.sectionId || 'TBA'}
                            onChange={(e) => updateEnrollmentSection(enrollment, e.target.value)}
                            disabled={isHistorical || sectionUpdating === enrollment._id}
                            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <option value="TBA">TBA</option>
                            {sectionOptions.map((section) => {
                              const optionValue = section.sectionId || section._id;
                              const optionLabel = section.sectionName || section.sectionId || 'Unnamed Section';

                              return (
                                <option key={section._id || section.sectionId} value={optionValue}>
                                  {optionLabel}
                                </option>
                              );
                            })}
                          </select>
                            );
                          })()}
                          {sectionUpdating === enrollment._id && (
                            <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                            </svg>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {enrollment.schoolYear}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(enrollment.enrollmentDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <select
                            value={getDisplayStatus(enrollment.status)}
                            onChange={(e) => updateEnrollmentStatus(enrollment, e.target.value)}
                            disabled={statusUpdating === enrollment._id}
                            className={`rounded-md border px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 disabled:opacity-60 ${getStatusColor(enrollment.status)}`}
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                          {statusUpdating === enrollment._id && (
                            <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                            </svg>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => openEditModal(enrollment)}
                            disabled={isHistorical}
                            className="text-blue-600 hover:text-blue-900 font-medium transition-colors disabled:cursor-not-allowed disabled:text-blue-300 disabled:hover:text-blue-300"
                          >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                ) : loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      Loading enrollments...
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      No enrollments found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between flex-wrap gap-4">
            <span className="text-sm text-gray-500">
              Showing <span className="font-medium">{startIdx + 1}</span>-<span className="font-medium">{Math.min(startIdx + itemsPerPage, filteredEnrollments.length)}</span> of <span className="font-medium">{filteredEnrollments.length}</span> enrollments
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages || 1}</span>
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Next
              </button>
            </div>
          </div>
        </div>

      </div>

      <AddEnrollmentsModal open={isModalOpen} onClose={closeModal} editingEnrollment={editingEnrollment} isHistorical={isHistorical} />
    </div>
  );
}