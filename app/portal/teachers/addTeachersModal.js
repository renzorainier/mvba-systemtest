'use client';

import { useState, useEffect } from 'react'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'

export default function AddTeachersModal({ isOpen, onClose, editingTeacher }) {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        middleName: '',
        phoneNumber: '',
        email: '',
        hireDate: '',
        teacherId: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Populate form when editing
    useEffect(() => {
        if (editingTeacher) {
            setFormData({
                firstName: editingTeacher.firstName || '',
                lastName: editingTeacher.lastName || '',
                middleName: editingTeacher.middleName || '',
                phoneNumber: editingTeacher.phoneNumber || '',
                email: editingTeacher.email || '',
                hireDate: editingTeacher.hireDate?.split('T')[0] || '',
                teacherId: editingTeacher.teacherId || '',
            });
        } else {
            setFormData({
                firstName: '',
                lastName: '',
                middleName: '',
                phoneNumber: '',
                email: '',
                hireDate: '',
                teacherId: '',
            });
        }
    }, [editingTeacher, isOpen]);

    const handleSubmit = async () => {
        setLoading(true)
        setError('')

        try {
            if (!formData.firstName || !formData.lastName || !formData.email || !formData.hireDate || !formData.phoneNumber || !formData.teacherId) {
                setError('Please fill in all required fields.');
                setLoading(false);
                return;
            }

            const method = editingTeacher ? 'PUT' : 'POST';
            const url = editingTeacher ? `/api/teachers/${editingTeacher._id}` : '/api/teachers';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'An error occurred while saving the teacher.');
            }

            setFormData({
                firstName: '',
                lastName: '',
                middleName: '',
                phoneNumber: '',
                email: '',
                hireDate: '',
                teacherId: '',
            });
            setError(null);
            window.dispatchEvent(new Event('teacherAdded'));
            onClose();
        } catch (err) {
            setError(err.message || 'An error occurred while saving the teacher.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-10">
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
                                        {editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}
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
                                                <label className="block text-sm font-medium text-gray-700">Email *</label>
                                                <input
                                                    type="email"
                                                    placeholder="Email"
                                                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                                    value={formData.email}
                                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                    disabled={loading}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Phone Number *</label>
                                                <input
                                                    type="tel"
                                                    placeholder="Phone number"
                                                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                                    value={formData.phoneNumber}
                                                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
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
                                                <label className="block text-sm font-medium text-gray-700">Teacher ID *</label>
                                                <input
                                                    type="text"
                                                    placeholder="Teacher ID"
                                                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                                    value={formData.teacherId}
                                                    onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                                                    disabled={loading}
                                                />
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700">Hire Date *</label>
                                            <input
                                                type="date"
                                                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                                value={formData.hireDate}
                                                onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
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
                                disabled={loading}
                                className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 disabled:bg-blue-400 sm:ml-3 sm:w-auto"
                            >
                                {loading ? (editingTeacher ? 'Updating...' : 'Adding...') : (editingTeacher ? 'Update Teacher' : 'Add Teacher')}
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
        </Dialog>)

}
