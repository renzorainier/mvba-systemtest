'use client'

import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import FileUpload from '@/components/FileUpload';

export default function AddNewRecord({ open, onClose, isHistorical = false }) {
  const [formData, setFormData] = useState({
    studentId: '',
    amountPaid: '',
    dateOfPayment: '',
    paymentMethod: '',
    referenceNumber: '',
    status: 'Pending',
    remarks: '',
    receivedBy: '',
    proofOfPayment: null, // Store the File object from upload
  })
  const [students, setStudents] = useState([])
  const [studentQuery, setStudentQuery] = useState('')
  const [showStudentSuggestions, setShowStudentSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)

  useEffect(() => {
    if (!open) {
      return
    }

    const fetchStudents = async () => {
      try {
        const response = await fetch('/api/students')
        const data = await response.json()

        if (data.success) {
          setStudents(data.data || [])
        }
      } catch (err) {
        console.error('Failed to load students:', err)
      }
    }

    fetchStudents()
  }, [open])

  useEffect(() => {
    if (!open) {
      setStudentQuery('')
      setShowStudentSuggestions(false)
    }
  }, [open])

  const filteredStudents = useMemo(() => {
    const query = studentQuery.trim().toLowerCase()

    if (!query) {
      return students.slice(0, 8)
    }

    return students
      .filter((student) => {
        const studentNumber = String(student.learnersReferenceNumber || '').toLowerCase()
        const fullName = `${student.firstName || ''} ${student.lastName || ''}`.toLowerCase()
        return studentNumber.includes(query) || fullName.includes(query)
      })
      .slice(0, 8)
  }, [students, studentQuery])

  const selectStudent = (student) => {
    setFormData((prev) => ({
      ...prev,
      // Use the DB _id for studentId to avoid collisions when LRN is a placeholder like 'TBA'
      studentId: String(student._id),
    }))
    setStudentQuery(`${student.learnersReferenceNumber} - ${student.firstName} ${student.lastName}`)
    setShowStudentSuggestions(false)
  }

  const handleSubmit = async () => {
    if (isHistorical) {
      return;
    }

    setLoading(true)
    setError('')
    
    try {
      // Validate required fields
      if (!formData.studentId || !formData.amountPaid || !formData.dateOfPayment || !formData.paymentMethod || !formData.referenceNumber || !formData.status || !formData.receivedBy) {
        setError('Please fill in all required fields')
        setLoading(false)
        return
      }

      let proofOfPaymentData = null

      // Upload file to GridFS if selected
      if (selectedFile) {
        const uploadFormData = new FormData()
        uploadFormData.append('file', selectedFile)
        uploadFormData.append('relatedRecordType', 'financials')
        // relatedRecordId should reference the student DB id, not a placeholder LRN
        uploadFormData.append('relatedRecordId', String(formData.studentId))

        const uploadResponse = await fetch('/api/upload-file', {
          method: 'POST',
          body: uploadFormData,
        })

        const uploadData = await uploadResponse.json()

        if (!uploadResponse.ok) {
          throw new Error(uploadData.error || 'Failed to upload file')
        }

        proofOfPaymentData = {
          fileId: uploadData.fileId,
          fileName: uploadData.fileName,
          fileType: uploadData.fileType,
          fileSize: uploadData.fileSize,
        }
      }

      const response = await fetch('/api/financials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          amountPaid: parseFloat(formData.amountPaid),
          proofOfPayment: proofOfPaymentData,
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to record payment')
      }
      
      // Reset form and close modal
      setFormData({
        studentId: '',
        amountPaid: '',
        dateOfPayment: '',
        paymentMethod: '',
        referenceNumber: '',
        status: 'Pending',
        proofOfPayment: null,
        remarks: '',
        receivedBy: '',
      })
      setSelectedFile(null)
      setStudentQuery('')
      setShowStudentSuggestions(false)
      setError('')
      
      // Dispatch custom event to notify parent
      window.dispatchEvent(new Event('paymentRecorded'))
      onClose()
    } catch (err) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} className="relative z-10">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
      />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel
            transition
            className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-2xl data-closed:sm:translate-y-0 data-closed:sm:scale-95"
          >
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <DialogTitle as="h3" className="text-base font-semibold text-gray-900">
                    Record New Payment
                  </DialogTitle>
                  
                  {error && (
                    <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                      {error}
                    </div>
                  )}
                  
                  <div className="mt-4">
                    <div className="grid grid-cols-1 gap-4 mb-4">
                      <div className="relative">
                        <label className="block text-sm font-medium text-gray-700">LRN *</label>
                        <input
                          type="text"
                          placeholder="Search LRN or name"
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={studentQuery}
                          onChange={(e) => {
                            setStudentQuery(e.target.value)
                            setFormData((prev) => ({ ...prev, studentId: '' }))
                            setShowStudentSuggestions(true)
                          }}
                          onFocus={() => setShowStudentSuggestions(true)}
                          disabled={loading}
                        />
                        {showStudentSuggestions && filteredStudents.length > 0 && (
                          <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                            {filteredStudents.map((student) => (
                              <button
                                type="button"
                                key={student._id}
                                onClick={() => selectStudent(student)}
                                className="block w-full px-3 py-2 text-left hover:bg-blue-50"
                                disabled={loading}
                              >
                                <p className="text-sm font-semibold text-gray-900">{student.learnersReferenceNumber}</p>
                                <p className="text-xs text-gray-500">{student.firstName} {student.lastName}</p>
                              </button>
                            ))}
                          </div>
                        )}
                        {showStudentSuggestions && filteredStudents.length === 0 && studentQuery.trim() && (
                          <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 shadow-lg">
                            No matching student found.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Amount Paid (₱) *</label>
                        <input
                          type="number"
                          placeholder="0.00"
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={formData.amountPaid}
                          onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
                          disabled={loading}
                          step="0.01"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Date of Payment *</label>
                        <input
                          type="date"
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={formData.dateOfPayment}
                          onChange={(e) => setFormData({ ...formData, dateOfPayment: e.target.value })}
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Payment Method *</label>
                        <select
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={formData.paymentMethod}
                          onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                          disabled={loading}
                        >
                          <option value="">Select payment method</option>
                          <option value="Cash">Cash</option>
                          <option value="Check">Check</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="Online Payment">Online Payment</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Reference Number *</label>
                        <input
                          type="text"
                          placeholder="e.g., CHK-12345"
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={formData.referenceNumber}
                          onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Status *</label>
                        <select
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          disabled={loading}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Completed">Completed</option>
                          <option value="Failed">Failed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Received By *</label>
                        <input
                          type="text"
                          placeholder="Name of receiver"
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={formData.receivedBy}
                          onChange={(e) => setFormData({ ...formData, receivedBy: e.target.value })}
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">Proof of Payment (Optional)</label>
                      <FileUpload 
                        onUpload={(file) => setSelectedFile(file)}
                        accept="image/*"
                        label="Upload Proof of Payment"
                        endpoint="/api/upload-file"
                        compressEndpoint="/api/compress"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">Remarks (Optional)</label>
                      <textarea
                        placeholder="Any additional notes..."
                        rows="2"
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.remarks}
                        onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || isHistorical}
                className="inline-flex w-full justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-500 disabled:bg-green-400 sm:ml-3 sm:w-auto"
              >
                {loading ? 'Recording...' : 'Record Payment'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 disabled:opacity-50 sm:mt-0 sm:w-auto"
              >
                Cancel
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  )
}