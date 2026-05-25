"use client";

import { Search, Plus, MoreHorizontal, Download, X } from "lucide-react";
import React, { useState, useEffect } from "react";
import AddNewRecord from "../financials/newRecordModal";
import FileViewer from "@/components/FileViewer";
import { useSchoolYearContext } from '@/components/SchoolYearContext';

export default function Financials() {
  const { isHistorical } = useSchoolYearContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [financials, setFinancials] = useState([]);
  const [updatingId, setUpdatingId] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState(null);

  const statusOptions = ['Pending', 'Completed', 'Failed', 'Cancelled'];

  const getStatusStyles = (status) => {
    switch (status) {
      case "Completed":
        return "border-green-200 bg-green-50 text-green-700 focus:border-green-500 focus:ring-green-500";
      case "Failed":
        return "border-red-200 bg-red-50 text-red-700 focus:border-red-500 focus:ring-red-500";
      case "Pending":
        return "border-yellow-200 bg-yellow-50 text-yellow-700 focus:border-yellow-500 focus:ring-yellow-500";
      default:
        return "border-gray-300 bg-white text-gray-700 focus:border-blue-500 focus:ring-blue-500";
    }
  };

  const openModal = () => {
    if (isHistorical) {
      return;
    }

    setIsModalOpen(true);
  };
  const closeModal = () => setIsModalOpen(false);

  useEffect(() => {
    fetchFinancials();

    // Listen for payment recorded event
    window.addEventListener("paymentRecorded", fetchFinancials);

    return () => window.removeEventListener("paymentRecorded", fetchFinancials);
  }, []);

  const fetchFinancials = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/financials");
      const data = await response.json();

      if (data.success) {
        setFinancials(data.data);
      } else {
        setError(data.error || "Failed to fetch payment records.");
      }
    } catch (error) {
      console.error("Failed to fetch financial records:", error);
      setError("Failed to fetch financial records.");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (record, nextStatus) => {
    if (isHistorical) {
      return;
    }

    if (!record?._id || record.status === nextStatus) {
      return;
    }

    try {
      setUpdatingId(record._id);
      setError("");

      const response = await fetch(`/api/financials/${record._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to update payment status.");
      }

      setFinancials((prev) =>
        prev.map((item) =>
          item._id === record._id
            ? { ...item, status: data.data.status }
            : item,
        ),
      );

      // Notify other pages that use payment-related totals.
      window.dispatchEvent(new Event("paymentRecorded"));
    } catch (err) {
      setError(err.message || "Failed to update payment status.");
    } finally {
      setUpdatingId("");
    }
  }

  const viewProofOfPayment = (fileId) => {
    setSelectedFileId(fileId);
    setViewerOpen(true);
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(Number(value || 0));
  }

  const printReceipt = (record) => {
    const receiptHtml = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Receipt ${record.paymentId}</title>
        <style>
          @page { size: A4 landscape; margin: 8mm; }
          html,body { height:100%; }
          body { font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color:#1f2937; padding:0; margin:0; box-sizing:border-box }
          .container { display:flex; gap:8mm; padding:8mm; height:100vh }
          .receipt { width:calc(50% - 4mm); box-sizing:border-box; padding:8mm; display:flex; flex-direction:column }
          .header { display:flex; justify-content:space-between; align-items:flex-start; gap:8px }
          .brand { font-weight:800; font-size:24px; }
          .badge { background:#ecfdf5; color:#059669; padding:4px 8px; border-radius:9999px; font-weight:700; font-size:11px; }
          .panel { display:flex; gap:8px; margin-top:8px }
          .box { background:#f8fafc; padding:8px; border-radius:6px; flex:1 }
          .label { font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:0.06em; font-weight:700 }
          .amount { font-size:20px; color:#059669; font-weight:800 }
          table { width:100%; margin-top:10px; border-collapse:collapse }
          th, td { padding:6px 0; border-bottom:1px solid #e6e9ee }
          .right { text-align:right }
          .footer { margin-top:auto; display:flex; justify-content:space-between; align-items:flex-end }
          @media print { @page { size: A4 landscape; margin:8mm } body{padding:0} }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="receipt">
            <div class="header">
              <div>
                <div class="brand">OFFICIAL RECEIPT</div>
                <div style="color:#6b7280;">Standard Academy Institute<br/>123 Education Blvd, Metro Manila</div>
              </div>
              <div style="text-align:right">
                <div class="badge">${record.status || 'Completed'}</div>
                <div style="margin-top:6px;">Receipt No: <strong>#${record.paymentId}</strong></div>
                <div>Date: ${new Date(record.dateOfPayment).toLocaleDateString()}</div>
              </div>
            </div>

            <div class="panel">
              <div class="box">
                <div class="label">Received From</div>
                <div style="font-weight:700; margin-top:6px">${record.studentName || ''}</div>
                <div style="color:#475569; margin-top:4px">LRN: ${record.learnersReferenceNumber || record.studentId || ''}</div>
              </div>
              <div class="box">
                <div class="label">Payment Details</div>
                <div style="margin-top:6px">Method: ${record.paymentMethod || 'Not Specified'}</div>
                <div>Ref Number: ${record.referenceNumber || 'N/A'}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr><th style="text-align:left">Description</th><th class="right">Amount</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>School Fees / Assessment Payment</td>
                  <td class="right">${formatCurrency(record.amountPaid)}</td>
                </tr>
              </tbody>
            </table>

            <div class="footer">
              <div>
                <div style="font-size:12px;color:#6b7280">Remarks</div>
                <div style="background:#f8fafc;padding:6px;border-radius:6px;margin-top:6px;font-style:italic">${record.remarks ? record.remarks : ''}</div>
                <div class="signature" style="margin-top:12px">_____</div>
                <div style="font-size:12px;color:#64748b">AUTHORIZED RECEIVER</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:12px;color:#64748b">Total Amount Paid</div>
                <div class="amount">${formatCurrency(record.amountPaid)}</div>
                <div style="color:#94a3b8;margin-top:6px;font-size:12px">Thank you for your payment.</div>
              </div>
            </div>
          </div>

          <div class="receipt">
            <div class="header">
              <div>
                <div class="brand">OFFICIAL RECEIPT</div>
                <div style="color:#6b7280;">Standard Academy Institute<br/>123 Education Blvd, Metro Manila</div>
              </div>
              <div style="text-align:right">
                <div class="badge">${record.status || 'Completed'}</div>
                <div style="margin-top:6px;">Receipt No: <strong>#${record.paymentId}</strong></div>
                <div>Date: ${new Date(record.dateOfPayment).toLocaleDateString()}</div>
              </div>
            </div>

            <div class="panel">
              <div class="box">
                <div class="label">Received From</div>
                <div style="font-weight:700; margin-top:6px">${record.studentName || ''}</div>
                <div style="color:#475569; margin-top:4px">LRN: ${record.learnersReferenceNumber || record.studentId || ''}</div>
              </div>
              <div class="box">
                <div class="label">Payment Details</div>
                <div style="margin-top:6px">Method: ${record.paymentMethod || 'Not Specified'}</div>
                <div>Ref Number: ${record.referenceNumber || 'N/A'}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr><th style="text-align:left">Description</th><th class="right">Amount</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>School Fees / Assessment Payment</td>
                  <td class="right">${formatCurrency(record.amountPaid)}</td>
                </tr>
              </tbody>
            </table>

            <div class="footer">
              <div>
                <div style="font-size:12px;color:#6b7280">Remarks</div>
                <div style="background:#f8fafc;padding:6px;border-radius:6px;margin-top:6px;font-style:italic">${record.remarks ? record.remarks : ''}</div>
                <div class="signature" style="margin-top:12px">_____</div>
                <div style="font-size:12px;color:#64748b">AUTHORIZED RECEIVER</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:12px;color:#64748b">Total Amount Paid</div>
                <div class="amount">${formatCurrency(record.amountPaid)}</div>
                <div style="color:#94a3b8;margin-top:6px;font-size:12px">Thank you for your payment.</div>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.open();
    w.document.write(receiptHtml);
    w.document.close();
    w.focus();
    // Give the new window a short moment to render before printing
    setTimeout(() => {
      try { w.print(); } catch (e) { console.error('Print failed', e); }
    }, 500);
  }

  const closeViewer = () => {
    setViewerOpen(false);
    setSelectedFileId(null);
  }

  // Pagination logic
  const itemsPerPage = 10;
  const totalPages = Math.ceil(financials.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedFinancials = financials.slice(startIdx, startIdx + itemsPerPage);

  return (
    <>
      <div className="min-h-screen bg-gray-50 font-sans text-slate-800 p-4 md:p-8">
        {/* Header Section */}
        <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Financial Management</h1>
          <button onClick={openModal} disabled={isHistorical} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm disabled:cursor-not-allowed disabled:bg-green-300">
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
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Proof of Payment
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
                            disabled={updatingId === record._id || isHistorical}
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center gap-3">
                            {record.documents && record.documents.length > 0 ? (
                              <button
                                onClick={() =>
                                  viewProofOfPayment(record.documents[0].fileId)
                                }
                                className="inline-flex text-blue-600 hover:text-blue-900 font-medium transition-colors"
                                title={record.documents[0].fileName}
                              >
                                View
                              </button>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}

                            <button
                              onClick={() => printReceipt(record)}
                              className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 px-3 py-1 rounded text-sm font-medium text-slate-700"
                            >
                              Receipt
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : loading ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                        Loading payment records...
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                        No payment records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
      <AddNewRecord open={isModalOpen} onClose={closeModal} isHistorical={isHistorical} />
      
      {/* Proof of Payment Viewer Modal */}
      {viewerOpen && selectedFileId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl max-h-[90vh] bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Proof of Payment</h2>
              <button
                onClick={closeViewer}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <FileViewer fileId={selectedFileId} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
