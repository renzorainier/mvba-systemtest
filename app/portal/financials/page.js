'use client';

import { Search, Plus, MoreHorizontal } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import AddNewRecord from '../financials/newRecordModal';

export default function Financials() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [financials, setFinancials] = useState([]);
  const [updatingId, setUpdatingId] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const statusOptions = ['Pending', 'Completed', 'Failed', 'Cancelled'];

  const getStatusStyles = (status) => {
    switch (status) {
      case 'Completed':
        return 'border-green-200 bg-green-50 text-green-700 focus:border-green-500 focus:ring-green-500';
      case 'Failed':
        return 'border-red-200 bg-red-50 text-red-700 focus:border-red-500 focus:ring-red-500';
      case 'Pending':
        return 'border-yellow-200 bg-yellow-50 text-yellow-700 focus:border-yellow-500 focus:ring-yellow-500';
      default:
        return 'border-gray-300 bg-white text-gray-700 focus:border-blue-500 focus:ring-blue-500';
    }
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  useEffect(() => {
    fetchFinancials();
    
    // Listen for payment recorded event
    window.addEventListener('paymentRecorded', fetchFinancials);
    
    return () => window.removeEventListener('paymentRecorded', fetchFinancials);
  }, []);

  const fetchFinancials = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/financials');
      const data = await response.json();

      if (data.success) {
        setFinancials(data.data);
      } else {
        setError(data.error || 'Failed to fetch payment records.');
      }
    }
    catch (error) {
      console.error('Failed to fetch financial records:', error);
      setError('Failed to fetch financial records.');
    } finally {
      setLoading(false);
    }
  }

  const updateStatus = async (record, nextStatus) => {
    if (!record?._id || record.status === nextStatus) {
      return;
    }

    try {
      setUpdatingId(record._id);
      setError('');

      const response = await fetch(`/api/financials/${record._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update payment status.');
      }

      setFinancials((prev) =>
        prev.map((item) => (item._id === record._id ? { ...item, status: data.data.status } : item))
      );

      // Notify other pages that use payment-related totals.
      window.dispatchEvent(new Event('paymentRecorded'));
    } catch (err) {
      setError(err.message || 'Failed to update payment status.');
    } finally {
      setUpdatingId('');
    }
  }

  // Pagination logic
  const itemsPerPage = 10;
  const totalPages = Math.ceil(financials.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedFinancials = financials.slice(startIdx, startIdx + itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-800 p-4 md:p-8">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Financial Management</h1>
        <button onClick={openModal} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm">
          <Plus size={18} />
          Record New Payment
        </button>
      </div>

      {/* Main Content Card */}
      <div className="max-w-7xl mx-auto">
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Table Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Payment ID
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Student Name
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Amount Paid
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Date of Payment
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Received By
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {!loading && paginatedFinancials.length > 0 ? (
                  paginatedFinancials.map((record) => (
                    <tr key={record._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                        {record.paymentId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {record.studentName || record.studentId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-semibold text-green-600">
                        ₱{record.amountPaid.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(record.dateOfPayment).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.paymentMethod}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <select
                          value={record.status}
                          onChange={(e) => updateStatus(record, e.target.value)}
                          disabled={updatingId === record._id}
                          className={`rounded-md border px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 disabled:opacity-60 ${getStatusStyles(record.status)}`}
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.receivedBy}
                      </td>
                    </tr>
                  ))
                ) : loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      Loading payment records...
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      No payment records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer / Pagination */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between flex-wrap gap-4">
            <span className="text-sm text-gray-500">
              Showing <span className="font-medium">{startIdx + 1}</span>-<span className="font-medium">{Math.min(startIdx + itemsPerPage, financials.length)}</span> of <span className="font-medium">{financials.length}</span> payment records
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
      <AddNewRecord open={isModalOpen} onClose={closeModal} />
    </div>
  );
}
