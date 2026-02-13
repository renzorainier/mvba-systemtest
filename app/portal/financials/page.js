'use client';

import { Search, Plus, MoreHorizontal } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import AddNewRecord from '../financials/newRecordModal';

export default function Financials() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [financials, setFinancials] = useState([]);

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
      const response = await fetch('/api/financials');
      const data = await response.json();

      if (data.success) {
        setFinancials(data.data);
      }
    }
    catch (error) {
      console.error('Failed to fetch financial records:', error);
    } finally {
      setLoading(false);
    }
  }
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
                    Student ID
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
                {!loading && financials.length > 0 ? (
                  financials.map((record) => (
                    <tr key={record._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                        {record.paymentId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {record.studentId}
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
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          record.status === 'Completed' ? 'bg-green-100 text-green-600' :
                          record.status === 'Pending' ? 'bg-yellow-100 text-yellow-600' :
                          record.status === 'Failed' ? 'bg-red-100 text-red-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {record.status}
                        </span>
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

          {/* Footer / Pagination mock */}
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Showing <span className="font-medium">{financials.length}</span> payment records
            </span>
          </div>

        </div>

      </div>
      <AddNewRecord open={isModalOpen} onClose={closeModal} />
    </div>
  );
}
