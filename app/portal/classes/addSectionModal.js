'use client';

import { useState, useEffect } from 'react' // Added useEffect
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'

export default function AddSectionsModal({ isOpen, onClose }) {
    const [formData, setFormData] = useState({
        sectionName: '',
        sectionId: '',
        gradeLevel: '',
        schoolYear: '',
        teacherId: '',
        roomNumber: '',
    });

    const [teachers, setTeachers] = useState([]); // State to store fetched teachers
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch teachers when the component mounts or modal opens
    useEffect(() => {
        const fetchTeachers = async () => {
            try {
                const response = await fetch('/api/teachers');
                const data = await response.json();
                if (data.success) {
                    setTeachers(data.data);
                } else {
                    console.error("Failed to fetch teachers:", data.error);
                }
            } catch (err) {
                console.error("Error fetching teachers:", err);
            }
        };
        if (isOpen) {
            fetchTeachers();
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        setLoading(true)
        setError('')

        // Validate
        if (!formData.sectionName || !formData.sectionId || !formData.gradeLevel || 
            !formData.schoolYear || !formData.teacherId || !formData.roomNumber) {
            setError('Please fill in all required fields.');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/sections', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMessage = data.error || data.message || 'An error occurred while adding the section.';
                setError(errorMessage);
            } else {
                // Success
                setFormData({
                    sectionName: '',
                    sectionId: '',
                    gradeLevel: '',
                    schoolYear: '',
                    teacherId: '',
                    roomNumber: '',
                });
                setError(null);
                window.dispatchEvent(new Event('sectionAdded'));
                onClose();
            }
        } catch (err) {
            console.error("Network Error:", err);
            setError(err.message || 'An error occurred while adding the section.');
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
                                        Add New Section
                                    </DialogTitle>

                                    {error && (
                                        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                                            {error}
                                        </div>
                                    )}

                                    <div className="mt-4">
                                        {/* Row 1: Section Name & Section ID */}
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Section Name *</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Einstein"
                                                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                                    value={formData.sectionName}
                                                    onChange={(e) => setFormData({ ...formData, sectionName: e.target.value })}
                                                    disabled={loading}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Section ID *</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. SEC-101"
                                                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                                    value={formData.sectionId}
                                                    onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                                                    disabled={loading}
                                                />
                                            </div>
                                        </div>

                                        {/* Row 2: Grade Level & School Year */}
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Grade Level *</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Grade 10"
                                                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                                    value={formData.gradeLevel}
                                                    onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                                                    disabled={loading}
                                                />
                                            </div>
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
                                        </div>

                                        {/* Row 3: Teacher Dropdown & Room Number */}
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Teacher *</label>
                                                <select
                                                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                    value={formData.teacherId}
                                                    onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                                                    disabled={loading}
                                                >
                                                    <option value="">Select a Teacher</option>
                                                    {teachers.map((teacher) => (
                                                        <option key={teacher._id} value={teacher.teacherId}>
                                                            {teacher.firstName} {teacher.lastName} ({teacher.teacherId})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Room Number *</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Rm-305"
                                                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                                    value={formData.roomNumber}
                                                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
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
                                disabled={loading}
                                className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 disabled:bg-blue-400 sm:ml-3 sm:w-auto"
                            >
                                {loading ? 'Adding...' : 'Add Section'}
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