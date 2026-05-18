"use client";

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';

const emptyForm = {
  sectionId: '',
  teacherId: '',
  scheduleId: '',
};

export default function AddClassAssignmentModal({ open, onClose, editingAssignment }) {
  const [formData, setFormData] = useState(emptyForm);
  const [sections, setSections] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingAssignment) {
      setFormData({
        sectionId: editingAssignment.section?._id || editingAssignment.section || '',
        teacherId: editingAssignment.teacher?._id || editingAssignment.teacher || '',
        scheduleId: editingAssignment.schedule?._id || editingAssignment.schedule || '',
      });
    } else {
      setFormData(emptyForm);
    }
  }, [editingAssignment, open]);

  useEffect(() => {
    if (!open) return;

    const fetchOptions = async () => {
      try {
        setLoadingOptions(true);
        const [sectionsRes, teachersRes, schedulesRes] = await Promise.all([
          fetch('/api/sections'),
          fetch('/api/teachers'),
          fetch('/api/schedules'),
        ]);

        const [sectionsData, teachersData, schedulesData] = await Promise.all([
          sectionsRes.json(),
          teachersRes.json(),
          schedulesRes.json(),
        ]);

        if (sectionsData.success) setSections(sectionsData.data);
        if (teachersData.success) setTeachers(teachersData.data);
        if (schedulesData.success) setSchedules(schedulesData.data);
      } catch (fetchError) {
        setError(fetchError.message || 'Failed to load class assignment options');
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchOptions();
  }, [open]);

  const selectedSection = useMemo(
    () => sections.find((section) => section._id === formData.sectionId),
    [sections, formData.sectionId]
  );

  const selectedCurriculum = useMemo(() => {
    const glCurriculum = selectedSection?.glCurriculumId;
    if (!glCurriculum) {
      return null;
    }

    return glCurriculum.curriculum_id || glCurriculum;
  }, [selectedSection]);

  const visibleSchedules = useMemo(() => {
    if (!selectedSection?.gradeLevel) {
      return schedules;
    }

    return schedules.filter((schedule) => String(schedule.gradeLevel || '').trim() === String(selectedSection.gradeLevel || '').trim());
  }, [schedules, selectedSection]);

  useEffect(() => {
    if (formData.scheduleId && visibleSchedules.length > 0) {
      const stillVisible = visibleSchedules.some((schedule) => schedule._id === formData.scheduleId);
      if (!stillVisible) {
        setFormData((prev) => ({ ...prev, scheduleId: '' }));
      }
    }
  }, [formData.scheduleId, visibleSchedules]);

  const selectedSchedule = useMemo(
    () => visibleSchedules.find((schedule) => schedule._id === formData.scheduleId),
    [visibleSchedules, formData.scheduleId]
  );

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      if (!formData.sectionId || !formData.teacherId || !formData.scheduleId) {
        setError('Please select a section, teacher, and schedule');
        return;
      }

      if (selectedSection && selectedSchedule && String(selectedSection.gradeLevel || '').trim() !== String(selectedSchedule.gradeLevel || '').trim()) {
        setError('Section and schedule must have the same grade level');
        return;
      }

      const method = editingAssignment ? 'PUT' : 'POST';
      const url = editingAssignment ? `/api/classes/${editingAssignment._id}` : '/api/classes';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save class assignment');
      }

      setFormData(emptyForm);
      window.dispatchEvent(new Event('classAssignmentSaved'));
      onClose();
    } catch (submitError) {
      setError(submitError.message || 'An error occurred while saving the class assignment');
    } finally {
      setLoading(false);
    }
  };

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
                    {editingAssignment ? 'Edit Class Assignment' : 'Create Class Assignment'}
                  </DialogTitle>

                  <p className="mt-1 text-sm text-gray-500">
                    Link one section to a teacher and a grade-compatible schedule.
                  </p>

                  {error && (
                    <div className="mt-4 rounded-md bg-red-100 p-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Section *</label>
                      <select
                        value={formData.sectionId}
                        onChange={(e) => setFormData({ ...formData, sectionId: e.target.value, scheduleId: '' })}
                        disabled={loading || loadingOptions}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      >
                        <option value="">Select a section</option>
                        {sections.map((section) => (
                          <option key={section._id} value={section._id}>
                            {section.sectionName} | {section.sectionId} | {section.gradeLevel}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Teacher *</label>
                      <select
                        value={formData.teacherId}
                        onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                        disabled={loading || loadingOptions}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      >
                        <option value="">Select a teacher</option>
                        {teachers.map((teacher) => (
                          <option key={teacher._id} value={teacher._id}>
                            {teacher.firstName} {teacher.lastName} | {teacher.teacherId}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Schedule *</label>
                      <select
                        value={formData.scheduleId}
                        onChange={(e) => setFormData({ ...formData, scheduleId: e.target.value })}
                        disabled={loading || loadingOptions}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      >
                        <option value="">{selectedSection?.gradeLevel ? `Select a schedule for ${selectedSection.gradeLevel}` : 'Select a schedule'}</option>
                        {visibleSchedules.map((schedule) => (
                          <option key={schedule._id} value={schedule._id}>
                            {schedule.name} | {schedule.scheduleId} | {schedule.gradeLevel}
                          </option>
                        ))}
                      </select>
                      {selectedSection && (
                        <p className="mt-2 text-xs text-gray-500">
                          Showing schedules for <span className="font-medium text-gray-700">{selectedSection.gradeLevel}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 rounded-md bg-gray-50 p-4 text-sm text-gray-700 sm:grid-cols-2">
                    <div>
                      <span className="block text-xs uppercase tracking-wide text-gray-500">Section</span>
                      <span className="font-medium">{selectedSection ? `${selectedSection.sectionName} (${selectedSection.gradeLevel})` : 'Not selected'}</span>
                    </div>
                    <div>
                      <span className="block text-xs uppercase tracking-wide text-gray-500">Teacher</span>
                      <span className="font-medium">
                        {formData.teacherId ? `${teachers.find((teacher) => teacher._id === formData.teacherId)?.firstName || ''} ${teachers.find((teacher) => teacher._id === formData.teacherId)?.lastName || ''}`.trim() : 'Not selected'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs uppercase tracking-wide text-gray-500">Curriculum</span>
                      <span className="font-medium">
                        {selectedCurriculum ? selectedCurriculum.curriculum_name || selectedCurriculum.curriculum_id || 'Assigned curriculum' : 'Not available'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || loadingOptions}
                className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 disabled:bg-blue-400 sm:ml-3 sm:w-auto"
              >
                {loading ? (editingAssignment ? 'Updating...' : 'Saving...') : (editingAssignment ? 'Update Assignment' : 'Save Assignment')}
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
  );
}