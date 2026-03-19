'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import AddEnrollmentsModal from '../enrollments/addEnrollmentsModal';

export default function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  useEffect(() => {
    fetchEnrollments();


    window.addEventListener('enrollmentAdded', fetchEnrollments);

    return () => window.removeEventListener('enrollmentAdded', fetchEnrollments);
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

  const filteredEnrollments = enrollments.filter(enrollment => {
    const fullName = (enrollment.studentName || '').toLowerCase();
    const sectionName = (enrollment.sectionName || '').toLowerCase();
    const enrollmentId = enrollment.enrollmentId?.toLowerCase() || '';
    const searchLower = searchTerm.toLowerCase();

    return fullName.includes(searchLower) || sectionName.includes(searchLower) || enrollmentId.includes(searchLower);
  });

  const getStatusColor = (status) => {
    if (status === 'Enrolled') {
      return 'bg-green-100 text-green-600';
    } else if (status === 'Pending') {
      return 'bg-yellow-100 text-yellow-600';
    }
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-800 p-4 md:p-8">
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Enrollment Management</h1>
        <button onClick={openModal} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm">
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {!loading && filteredEnrollments.length > 0 ? (
                  filteredEnrollments.map((enrollment) => (
                    <tr key={enrollment._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                        {enrollment.enrollmentId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {enrollment.studentName || enrollment.learnersReferenceNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {enrollment.sectionName || enrollment.sectionId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {enrollment.schoolYear}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(enrollment.enrollmentDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(enrollment.status)}`}>
                          {enrollment.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      Loading enrollments...
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      No enrollments found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Showing <span className="font-medium">{filteredEnrollments.length}</span> of <span className="font-medium">{enrollments.length}</span> enrollments
            </span>
          </div>
        </div>

      </div>

      <AddEnrollmentsModal open={isModalOpen} onClose={closeModal} />
    </div>
  );
}