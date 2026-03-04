'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'

export default function AddEnrollmentsModal({ open, onClose }) {
  const [formData, setFormData] = useState({
    learnersReferenceNumber: '',
    sectionId: '',
    schoolYear: '',
    enrollmentDate: '',
    status: ''
  })
  
  // New state to hold the fetched students and sections
  const [students, setStudents] = useState([])
  const [sections, setSections] = useState([])
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Fetch students and sections when the modal opens
  useEffect(() => {
    if (open) {
      // Fetch Students
      fetch('/api/students')
        .then(res => res.json())
        .then(data => {
          if (data.success) setStudents(data.data)
        })
        .catch(err => console.error("Failed to fetch students:", err))

      // Fetch Sections
      fetch('/api/sections')
        .then(res => res.json())
        .then(data => {
          if (data.success) setSections(data.data)
        })
        .catch(err => console.error("Failed to fetch sections:", err))
    }
  }, [open])

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      // Validate required fields
      if (!formData.learnersReferenceNumber || !formData.sectionId || !formData.schoolYear || !formData.enrollmentDate || !formData.status) {
        setError('Please fill in all required fields')
        setLoading(false)
        return
      }

      const response = await fetch('/api/enrollments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add enrollment')
      }

      // Reset form and close modal
      setFormData({
        learnersReferenceNumber: '',
        sectionId: '',
        schoolYear: '',
        enrollmentDate: '',
        status: ''
      })
      setError('')

      // Dispatch custom event to notify parent component to refresh the table
      window.dispatchEvent(new Event('enrollmentAdded'))
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
                    Add New Enrollment
                  </DialogTitle>

                  {error && (
                    <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                      {error}
                    </div>
                  )}

                  <div className="mt-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      {/* Student Dropdown */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Student *</label>
                        <select
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={formData.learnersReferenceNumber}
                          onChange={(e) => setFormData({ ...formData, learnersReferenceNumber: e.target.value })}
                          disabled={loading || students.length === 0}
                        >
                          <option value="">Select a student</option>
                          {students.map((student) => (
                            <option key={student._id} value={student.learnersReferenceNumber || student._id}>
                              {student.firstName} {student.lastName} ({student.learnersReferenceNumber})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Section Dropdown */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Section *</label>
                        <select
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={formData.sectionId}
                          onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                          disabled={loading || sections.length === 0}
                        >
                          <option value="">Select a section</option>
                          {sections.map((section) => (
                            <option key={section._id} value={section.sectionId || section._id}>
                              {section.sectionName || section.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">School Year *</label>
                        <input
                          type="text"
                          placeholder="e.g. 2025-2026"
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={formData.schoolYear}
                          onChange={(e) => setFormData({ ...formData, schoolYear: e.target.value })}
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Enrollment Date *</label>
                        <input
                          type="date"
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={formData.enrollmentDate}
                          onChange={(e) => setFormData({ ...formData, enrollmentDate: e.target.value })}
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">Status *</label>
                      <select
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        disabled={loading}
                      >
                        <option value="">Select status</option>
                        <option value="Interview">Interview</option>
                        <option value="Approved">Approved</option>
                        <option value="For payment">For payment</option>
                        <option value="Enrolled">Enrolled</option>
                        <option value="Dropped">Dropped</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 disabled:bg-blue-400 sm:ml-3 sm:w-auto"
              >
                {loading ? 'Adding...' : 'Add Enrollment'}
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