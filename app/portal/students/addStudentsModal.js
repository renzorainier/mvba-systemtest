'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'

const GRADE_LEVEL_OPTIONS = ['Kinder 1', 'Kinder 2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6']

const createEmptyFormData = () => ({
  firstName: '',
  lastName: '',
  middleName: '',
  gender: '',
  gradeLevel: '',
  dateOfBirth: '',
  address: '',
  admissionDate: '',
  learnersReferenceNumber: '',
  parentGuardianName: '',
  parentGuardianRelationship: '',
  parentGuardianContactNumber: '',
})

const generateKinderOneLrn = () => Math.floor(100000 + Math.random() * 900000).toString()

const isValidKinderOneLrn = (value) => /^\d{6}$/.test(value)

const isValidKinderTwoToSixLrn = (value) => /^\d{12}$/.test(value)

export default function AddStudentsModal({ open, onClose, isHistorical = false }) {
  const [formData, setFormData] = useState(createEmptyFormData())
  const lrnByGradeRef = useRef({})

  // Reset form when opening for a fresh add
  useEffect(() => {
    if (open) {
      lrnByGradeRef.current = {}
      setFormData(createEmptyFormData())
    }
  }, [open])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGradeLevelChange = (gradeLevel) => {
    setFormData((prev) => ({
      ...prev,
      gradeLevel,
      learnersReferenceNumber: (() => {
        if (prev.gradeLevel) {
          lrnByGradeRef.current[prev.gradeLevel] = prev.learnersReferenceNumber
        }

        if (gradeLevel === 'Kinder 1') {
          const cachedKinderOneLrn = lrnByGradeRef.current['Kinder 1']
          const nextKinderOneLrn = cachedKinderOneLrn || generateKinderOneLrn()
          lrnByGradeRef.current['Kinder 1'] = nextKinderOneLrn
          return nextKinderOneLrn
        }

        return lrnByGradeRef.current[gradeLevel] || ''
      })(),
    }))
  }

  const handleSubmit = async () => {
    if (isHistorical) {
      return;
    }

    setLoading(true)
    setError('')

    try {
      // Validate required fields
      if (!formData.firstName || !formData.lastName || !formData.gender || !formData.dateOfBirth || !formData.address || !formData.admissionDate) {
        setError('Please fill in all required fields')
        setLoading(false)
        return
      }

      if (!formData.gradeLevel) {
        setError('Please select a grade level')
        setLoading(false)
        return
      }

      if (formData.gradeLevel === 'Kinder 1' && !isValidKinderOneLrn(formData.learnersReferenceNumber)) {
        setError('Kinder 1 LRN must be a 6-digit number')
        setLoading(false)
        return
      }

      if (formData.gradeLevel !== 'Kinder 1' && !isValidKinderTwoToSixLrn(formData.learnersReferenceNumber)) {
        setError('Kinder 2 and Grade 1 to Grade 6 LRN must be a 12-digit number')
        setLoading(false)
        return
      }

      const method = 'POST'
      const url = '/api/students'
      const payload = {
        ...formData,
        learnersReferenceNumber: formData.gradeLevel === 'Kinder 1' ? formData.learnersReferenceNumber : formData.learnersReferenceNumber.trim(),
      }

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save student')
      }

      // Reset form and close modal
      setFormData(createEmptyFormData())
      setError('')

      // Dispatch custom event to notify parent
      window.dispatchEvent(new Event('studentAdded'))
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
                    Add New Student
                  </DialogTitle>

                  {error && (
                    <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                      {error}
                    </div>
                  )}

                  <div className="mt-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">First Name *</label>
                        <input
                          type="text"
                          placeholder="First name"
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                        <input
                          type="text"
                          placeholder="Last name"
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Middle Name</label>
                        <input
                          type="text"
                          placeholder="Middle name"
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={formData.middleName}
                          onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Gender *</label>
                        <select
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={formData.gender}
                          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                          disabled={loading}
                        >
                          <option value="">Select gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Grade Level *</label>
                        <select
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={formData.gradeLevel}
                          onChange={(e) => handleGradeLevelChange(e.target.value)}
                          disabled={loading}
                        >
                          <option value="">Select grade level</option>
                          {GRADE_LEVEL_OPTIONS.map((gradeLevel) => (
                            <option key={gradeLevel} value={gradeLevel}>
                              {gradeLevel}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Learner&apos;s Reference Number (LRN) *</label>
                        <input
                          type="text"
                          placeholder={formData.gradeLevel === 'Kinder 1' ? 'Auto-generated for Kinder 1' : 'Enter 12-digit LRN'}
                          inputMode="numeric"
                          maxLength={formData.gradeLevel === 'Kinder 1' ? 6 : 12}
                          pattern={formData.gradeLevel === 'Kinder 1' ? '\\d{6}' : '\\d{12}'}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={formData.learnersReferenceNumber}
                          onChange={(e) => {
                            const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, formData.gradeLevel === 'Kinder 1' ? 6 : 12)
                            if (formData.gradeLevel) {
                              lrnByGradeRef.current[formData.gradeLevel] = digitsOnly
                            }
                            setFormData({ ...formData, learnersReferenceNumber: digitsOnly })
                          }}
                          readOnly={formData.gradeLevel === 'Kinder 1'}
                          disabled={loading || formData.gradeLevel === 'Kinder 1'}
                        />
                        (
                          <p className="mt-1 text-xs text-gray-500">
                            {formData.gradeLevel === 'Kinder 1'
                              ? 'Kinder 1 automatically uses a random 6-digit LRN.'
                              : 'Kinder 2 to Grade 6 require a 12-digit LRN.'}
                          </p>
                        )
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Date of Birth *</label>
                        <input
                          type="date"
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={formData.dateOfBirth}
                          onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Admission Date *</label>
                        <input
                          type="date"
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={formData.admissionDate}
                          onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">Address *</label>
                      <textarea
                        placeholder="Street address"
                        rows="2"
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        disabled={loading}
                      />
                    </div>

                    <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <h4 className="mb-4 text-sm font-semibold text-gray-900">Parent / Guardian Contact Information</h4>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Parent / Guardian Name</label>
                          <input
                            type="text"
                            placeholder="Full name"
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            value={formData.parentGuardianName}
                            onChange={(e) => setFormData({ ...formData, parentGuardianName: e.target.value })}
                            disabled={loading}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Relationship</label>
                          <input
                            type="text"
                            placeholder="Mother, Father, Guardian"
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            value={formData.parentGuardianRelationship}
                            onChange={(e) => setFormData({ ...formData, parentGuardianRelationship: e.target.value })}
                            disabled={loading}
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700">Contact Number</label>
                        <input
                          type="text"
                          placeholder="09xxxxxxxxx"
                          inputMode="numeric"
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={formData.parentGuardianContactNumber}
                          onChange={(e) => setFormData({ ...formData, parentGuardianContactNumber: e.target.value.replace(/\D/g, '') })}
                          disabled={loading}
                        />
                      </div>
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
                className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 disabled:bg-blue-400 sm:ml-3 sm:w-auto"
              >
                {loading ? 'Adding...' : 'Add Student'}
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
