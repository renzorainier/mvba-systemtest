'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { Search, Plus, Trash2, X } from 'lucide-react';
import AddSectionsModal from './addSectionModal';
import { useSchoolYearContext } from '@/components/SchoolYearContext';

export default function Dashboard() {
  const { isHistorical } = useSchoolYearContext();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [sectionStudents, setSectionStudents] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState('');
  const [pageError, setPageError] = useState('');

  const openModal = () => {
    if (isHistorical) {
      return;
    }
    setEditingSection(null);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSection(null);
  };
  const openEditModal = (section) => {
    if (isHistorical) {
      return;
    }
    setEditingSection(section);
    setIsModalOpen(true);
  };

  const handleDeleteSection = async (section) => {
    if (isHistorical) {
      return;
    }

    const confirmed = window.confirm(`Delete section ${section.sectionName}?`);
    if (!confirmed) {
      return;
    }

    try {
      setPageError('');
      const response = await fetch(`/api/sections/${section._id}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete section');
      }

      await fetchSections();
    } catch (error) {
      setPageError(error.message || 'Failed to delete section');
    }
  };

  const closeRosterModal = () => {
    setIsRosterModalOpen(false);
    setSelectedSection(null);
    setSectionStudents([]);
    setRosterError('');
  };

  const openRosterModal = async (section) => {
    setSelectedSection(section);
    setIsRosterModalOpen(true);
    setRosterLoading(true);
    setRosterError('');
    setSectionStudents([]);

    try {
      const response = await fetch('/api/enrollments');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load section students');
      }

      const students = (data.data || [])
        .filter((enrollment) => enrollment.sectionId === section.sectionId)
        .sort((a, b) => {
          const aName = `${a.studentName || ''}`.trim().toLowerCase();
          const bName = `${b.studentName || ''}`.trim().toLowerCase();
          return aName.localeCompare(bName);
        });

      setSectionStudents(students);
    } catch (error) {
      console.error('Failed to load section students:', error);
      setRosterError(error.message || 'Failed to load section students');
    } finally {
      setRosterLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();

    // Listen for section added event
    window.addEventListener('sectionAdded', fetchSections);
    window.addEventListener('enrollmentAdded', fetchSections);

    return () => {
      window.removeEventListener('sectionAdded', fetchSections);
      window.removeEventListener('enrollmentAdded', fetchSections);
    };
  }, []);

  const fetchSections = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/sections');
      const data = await response.json();

      if(data.success) {
        const sectionsData = data.data;

        // also fetch enrollments to compute student counts per section
        try {
          const enrRes = await fetch('/api/enrollments');
          const enrData = await enrRes.json();
          if (enrData.success) {
            const counts = {};
            enrData.data.forEach((e) => {
              const sid = e.sectionId;
              if (!sid) return;
              counts[sid] = (counts[sid] || 0) + 1;
            });
            // attach _studentCount to each section
            sectionsData.forEach((s) => {
              s._studentCount = counts[s.sectionId] || 0;
            });
          }
        } catch (err) {
          console.error('Failed to fetch enrollments for counts:', err);
        }

        setSections(sectionsData);
      }
    } catch (error) {
      console.error('Failed to fetch sections:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter logic for search
    const filteredSections = sections.filter(section =>
      `${section.sectionName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      section.sectionId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination logic
    const itemsPerPage = 10;
    const totalPages = Math.ceil(filteredSections.length / itemsPerPage);
    const startIdx = (currentPage - 1) * itemsPerPage;
    const paginatedSections = filteredSections.slice(startIdx, startIdx + itemsPerPage);

    // Reset page when search changes
    React.useEffect(() => {
      setCurrentPage(1);
    }, [searchTerm]);


    return (
      <div className="min-h-screen bg-white font-sans text-slate-800 p-4">
        {/* Header Section */}
        <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Section Management</h1>
          <button onClick={openModal} disabled={isHistorical} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm disabled:cursor-not-allowed disabled:bg-blue-300">
            <Plus size={18} />
            Add New Section
          </button>
        </div>

        {pageError && <div className="max-w-7xl mx-auto mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{pageError}</div>}

        {/* Search Bar */}
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search Sections by name or ID..."
                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:placeholder-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm transition duration-150 ease-in-out"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          {/* Sections Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Section Name
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Grade Level
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      School Year 
                    </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Curriculum
                      </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Room Number
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Students
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {!loading && paginatedSections.length > 0 ? (
                    paginatedSections.map((section) => (
                      <tr key={section._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                          {section.sectionId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                          {section.sectionName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {section.gradeLevel}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {section.schoolYear}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div
                            className="max-w-[260px] truncate"
                            title={section.glCurriculumId?.curriculum_id?.curriculum_name || section.glCurriculumId?.curriculum_name || '—'}
                          >
                            {section.glCurriculumId?.curriculum_id?.curriculum_name || section.glCurriculumId?.curriculum_name || '—'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {section.roomNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            type="button"
                            onClick={() => openRosterModal(section)}
                            className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-100 hover:text-blue-900 hover:shadow-md cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
                          >
                            {`${section._studentCount ?? 0}/15`}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="inline-flex items-center gap-3">
                            <button
                              onClick={() => openEditModal(section)}
                              disabled={isHistorical}
                              className="text-blue-600 hover:text-blue-900 font-medium transition-colors disabled:cursor-not-allowed disabled:text-blue-300 disabled:hover:text-blue-300"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteSection(section)}
                              disabled={isHistorical}
                              className="inline-flex items-center gap-1 font-medium text-red-600 transition-colors hover:text-red-900 disabled:cursor-not-allowed disabled:text-red-300 disabled:hover:text-red-300"
                            >
                              <Trash2 size={16} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : loading ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                        Loading sections...
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                        No Sections found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer / Pagination */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between flex-wrap gap-4">
              <span className="text-sm text-gray-500">
                Showing <span className="font-medium">{startIdx + 1}</span>-<span className="font-medium">{Math.min(startIdx + itemsPerPage, filteredSections.length)}</span> of <span className="font-medium">{filteredSections.length}</span> sections
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
        {/* Add Sections Modal */}
        <AddSectionsModal isOpen={isModalOpen} onClose={closeModal} editingSection={editingSection} isHistorical={isHistorical} />

        <Dialog open={isRosterModalOpen} onClose={closeRosterModal} className="relative z-50">
          <DialogBackdrop className="fixed inset-0 bg-slate-900/50" />

          <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex min-h-full items-center justify-center">
              <DialogPanel className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
                  <div>
                    <DialogTitle as="h2" className="text-xl font-bold text-slate-900">
                      Section Students
                    </DialogTitle>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedSection ? `${selectedSection.sectionName} • ${selectedSection.sectionId}` : 'Selected section roster'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeRosterModal}
                    className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
                  {rosterLoading ? (
                    <div className="py-10 text-center text-sm text-slate-500">
                      Loading section students...
                    </div>
                  ) : rosterError ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {rosterError}
                    </div>
                  ) : sectionStudents.length > 0 ? (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Student</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">LRN</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Grade Level</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {sectionStudents.map((enrollment) => (
                            <tr key={enrollment._id} className="hover:bg-slate-50/70">
                              <td className="px-4 py-3 text-sm font-medium text-slate-900">
                                {enrollment.studentName || 'Unnamed student'}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {enrollment.learnersReferenceNumber || '—'}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {enrollment.studentGradeLevel || '—'}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {enrollment.status || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                      No students are enrolled in this section.
                    </div>
                  )}
                </div>
              </DialogPanel>
            </div>
          </div>
        </Dialog>
      </div>
    );
  }
