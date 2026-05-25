'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, MoreHorizontal } from 'lucide-react';
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
                          <div className="text-sm text-gray-700 font-medium">
                            {`${section._studentCount ?? 0}/15`}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => openEditModal(section)}
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
      </div>
    );
  }
