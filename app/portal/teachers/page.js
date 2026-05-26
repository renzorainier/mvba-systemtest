'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, MoreHorizontal } from 'lucide-react';
import AddTeachersModal from './addTeachersModal';
import { useSchoolYearContext } from '@/components/SchoolYearContext';

export default function Dashboard() {
  const { isHistorical } = useSchoolYearContext();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const openModal = () => {
    if (isHistorical) {
      return;
    }
    setEditingTeacher(null);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTeacher(null);
  };
  const openEditModal = (teacher) => {
    if (isHistorical) {
      return;
    }
    setEditingTeacher(teacher);
    setIsModalOpen(true);
  };

  useEffect(() => {
    fetchTeachers();

    // Listen for teacher added event
    window.addEventListener('teacherAdded', fetchTeachers);

    return () => window.removeEventListener('teacherAdded', fetchTeachers);
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/teachers');
      const data = await response.json();

      if(data.success) {
        setTeachers(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter logic for search
    const filteredTeachers = teachers.filter(teacher =>
      `${teacher.firstName} ${teacher.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.teacherId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination logic
    const itemsPerPage = 10;
    const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage);
    const startIdx = (currentPage - 1) * itemsPerPage;
    const paginatedTeachers = filteredTeachers.slice(startIdx, startIdx + itemsPerPage);

    // Reset page when search changes
    React.useEffect(() => {
      setCurrentPage(1);
    }, [searchTerm]);


    return (
      <div className="min-h-screen bg-white font-sans text-slate-800 p-4">
        {/* Header Section */}
        <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">teacher Management</h1>
          <button onClick={openModal} disabled={isHistorical} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm disabled:cursor-not-allowed disabled:bg-blue-300">
            <Plus size={18} />
            Add New Teacher
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
                placeholder="Search Teachers by name or ID..."
                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:placeholder-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm transition duration-150 ease-in-out"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          {/* Teachers Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Phone Number
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Hire Date
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {!loading && paginatedTeachers.length > 0 ? (
                    paginatedTeachers.map((teacher) => (
                      <tr key={teacher._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                          {teacher.teacherId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                          {teacher.firstName} {teacher.lastName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {teacher.phoneNumber}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {teacher.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(teacher.hireDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => openEditModal(teacher)}
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
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        Loading teachers...
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        No teachers found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer / Pagination */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between flex-wrap gap-4">
              <span className="text-sm text-gray-500">
                Showing <span className="font-medium">{startIdx + 1}</span>-<span className="font-medium">{Math.min(startIdx + itemsPerPage, filteredTeachers.length)}</span> of <span className="font-medium">{filteredTeachers.length}</span> teachers
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
        {/* Add Teacher Modal */}
        <AddTeachersModal isOpen={isModalOpen} onClose={closeModal} editingTeacher={editingTeacher} isHistorical={isHistorical} />
      </div>
    );
  }
