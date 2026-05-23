"use client";

import { useState, useEffect } from 'react'
import { useSchoolYearContext } from '@/components/SchoolYearContext'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'

export default function AddSectionsModal({ isOpen, onClose, editingSection, isHistorical = false }) {
    const gradeLevel = ['Kinder 1', 'Kinder 2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];

    const { selectedSchoolYear } = useSchoolYearContext();

    const [formData, setFormData] = useState({
        sectionName: '',
        sectionId: '',
        gradeLevel: '',
        schoolYear: selectedSchoolYear || '',
        glCurriculumId: '',
        roomNumber: '',
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [curriculumOptions, setCurriculumOptions] = useState([]);
    const [loadingCurriculums, setLoadingCurriculums] = useState(false);

    // Auto-generate section ID based on grade level, section name, and school year
    const generateSectionId = (grade, name, year) => {
        if (!grade || !name || !year) return '';
        
        // Extract grade number
        let gradeCode = '';
        if (grade.toLowerCase().includes('kinder')) {
            const num = grade.replace(/[^\d]/g, '');
            gradeCode = 'K' + num;
        } else {
            const num = grade.replace(/[^\d]/g, '');
            gradeCode = 'G' + num;
        }
        
        // Get first 3 letters of section name
        const sectionCode = name.substring(0, 3).toUpperCase();
        
        // Extract year code (e.g., "2025-2026" -> "2526")
        const yearMatch = year.match(/\d{4}-\d{4}/);
        let yearCode = '';
        if (yearMatch) {
            const [year1, year2] = yearMatch[0].split('-');
            yearCode = year1.substring(2) + year2.substring(2);
        }
        
        return `${gradeCode}-${sectionCode}-${yearCode}`;
    };

    // Populate form when editing
    useEffect(() => {
        if (editingSection) {
            setFormData({
                sectionName: editingSection.sectionName || '',
                sectionId: editingSection.sectionId || '',
                gradeLevel: editingSection.gradeLevel || '',
                // keep section's school year in sync with selected/current school year
                schoolYear: selectedSchoolYear || editingSection.schoolYear || '',
                glCurriculumId: editingSection.glCurriculumId?._id || editingSection.glCurriculumId || '',
                roomNumber: editingSection.roomNumber || '',
            });
        } else {
            setFormData({
                sectionName: '',
                sectionId: '',
                gradeLevel: '',
                schoolYear: selectedSchoolYear || '',
                glCurriculumId: '',
                roomNumber: '',
            });
        }
    }, [editingSection, isOpen]);

    // Keep schoolYear synced with the context if it changes
    useEffect(() => {
        setFormData((prev) => ({ ...prev, schoolYear: selectedSchoolYear || prev.schoolYear }));
    }, [selectedSchoolYear]);

    useEffect(() => {
        const fetchCurriculums = async () => {
            if (!formData.gradeLevel || !formData.schoolYear) {
                setCurriculumOptions([]);
                return;
            }

            try {
                setLoadingCurriculums(true);
                const response = await fetch(`/api/grade-level-curriculums?schoolYearId=${encodeURIComponent(formData.schoolYear)}&gradeLevel=${encodeURIComponent(formData.gradeLevel)}`);
                const data = await response.json();

                if (data.success) {
                    setCurriculumOptions(data.data);
                }
            } catch (curriculumError) {
                console.error('Failed to fetch grade-level curriculums:', curriculumError);
            } finally {
                setLoadingCurriculums(false);
            }
        };

        fetchCurriculums();
    }, [formData.gradeLevel, formData.schoolYear]);

    // Auto-generate section ID when dependencies change
    useEffect(() => {
        if (!editingSection) {
            const newSectionId = generateSectionId(formData.gradeLevel, formData.sectionName, formData.schoolYear);
            setFormData(prev => ({
                ...prev,
                sectionId: newSectionId
            }));
        }
    }, [formData.gradeLevel, formData.sectionName, formData.schoolYear, editingSection])

    useEffect(() => {
        if (formData.glCurriculumId && curriculumOptions.length > 0) {
            const stillVisible = curriculumOptions.some((option) => (option._id || option.gl_curriculum_id) === formData.glCurriculumId);
            if (!stillVisible) {
                setFormData((prev) => ({ ...prev, glCurriculumId: '' }));
            }
        }
    }, [curriculumOptions, formData.glCurriculumId]);

    const handleSubmit = async () => {
        if (isHistorical) {
            return;
        }

        setLoading(true)
        setError('')

        if (!editingSection) {
            console.log('[Sections] New section form submission payload:', formData);
        }

        // Validation check
        if (!formData.sectionName || !formData.sectionId || !formData.gradeLevel ||
            !formData.schoolYear || !formData.glCurriculumId || !formData.roomNumber) {
            setError('Please fill in all required fields.');
            setLoading(false);
            return;
        }

        try {
            const method = editingSection ? 'PUT' : 'POST';
            const url = editingSection ? `/api/sections/${editingSection._id}` : '/api/sections';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMessage = data.error || data.message || 'An error occurred while saving the section.';
                setError(errorMessage);
            } else {
                // Success - Reset the form completely
                setFormData({
                    sectionName: '',
                    sectionId: '',
                    gradeLevel: '',
                    schoolYear: '',
                    glCurriculumId: '',
                    roomNumber: '',
                });
                setError(null);
                window.dispatchEvent(new Event('sectionAdded'));
                onClose();
            }
        } catch (err) {
            console.error("Network Error:", err);
            setError(err.message || 'An error occurred while saving the section.');
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
                                        {editingSection ? 'Edit Section' : 'Add New Section'}
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
                                                    disabled={loading || isHistorical}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Section ID (Auto-generated) *</label>
                                                <input
                                                    type="text"
                                                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-gray-100 focus:outline-none"
                                                    value={formData.sectionId}
                                                    disabled={true}
                                                />
                                            </div>
                                        </div>

                                        {/* Row 2: Grade Level & School Year */}
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Grade Level *</label>
                                                <select
                                                    value={formData.gradeLevel} // FIXED: Now uses formData directly
                                                    onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })} // FIXED: Updates formData directly
                                                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                    disabled={loading || isHistorical}
                                                >
                                                    {/* FIXED: Added a default empty option so the user HAS to click it */}
                                                    <option value="">Select a Grade...</option> 
                                                    {gradeLevel.map(g => <option key={g} value={g}>{g}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">School Year *</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. 2025-2026"
                                                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-gray-50 focus:outline-none"
                                                    value={formData.schoolYear}
                                                    readOnly={true}
                                                    disabled={true}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 mb-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Grade-Level Curriculum *</label>
                                                <select
                                                    value={formData.glCurriculumId}
                                                    onChange={(e) => setFormData({ ...formData, glCurriculumId: e.target.value })}
                                                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                    disabled={loading || loadingCurriculums || !formData.gradeLevel || !formData.schoolYear}
                                                >
                                                    <option value="">
                                                        {!formData.gradeLevel || !formData.schoolYear
                                                            ? 'Select a grade level and school year first'
                                                            : loadingCurriculums
                                                                ? 'Loading curriculum options...'
                                                                : 'Select a curriculum'}
                                                    </option>
                                                    {curriculumOptions.map((option) => {
                                                        const curriculum = option.curriculum_id || {};
                                                        return (
                                                            <option key={option._id} value={option._id}>
                                                                {option.grade_level} | {option.school_year_id} | {curriculum.curriculum_name || curriculum.curriculum_id || 'Curriculum'}
                                                                {option.is_default ? ' | Default' : ''}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                                {formData.gradeLevel && formData.schoolYear && (
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        Available curriculum assignments for {formData.gradeLevel} in {formData.schoolYear}.
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Row 3: Room Number */}
                                        <div className="grid grid-cols-1 gap-4 mb-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Room Number *</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Rm-305"
                                                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                                    value={formData.roomNumber}
                                                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                                                    disabled={loading || isHistorical}
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
                                {loading ? (editingSection ? 'Updating...' : 'Adding...') : (editingSection ? 'Update Section' : 'Add Section')}
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