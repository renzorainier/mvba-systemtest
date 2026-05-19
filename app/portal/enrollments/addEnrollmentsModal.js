"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import FileUpload from "@/components/FileUpload";

export default function AddEnrollmentsModal({
  open,
  onClose,
  editingEnrollment,
  isHistorical = false,
}) {
  const getStatusStyles = (status) => {
    switch (status) {
      case 'Enrolled':
      case 'Approved':
        return 'border-green-200 bg-green-50 text-green-700 focus:border-green-500 focus:ring-green-500';
      case 'Dropped':
        return 'border-red-200 bg-red-50 text-red-700 focus:border-red-500 focus:ring-red-500';
      case 'Pending':
      case 'For payment':
        return 'border-yellow-200 bg-yellow-50 text-yellow-700 focus:border-yellow-500 focus:ring-yellow-500';
      case 'Interview':
        return 'border-gray-300 bg-white text-gray-700 focus:border-blue-500 focus:ring-blue-500';
      default:
        return 'border-gray-300 bg-white text-gray-700 focus:border-blue-500 focus:ring-blue-500';
    }
  };
  const [formData, setFormData] = useState({
    learnersReferenceNumber: "",
    sectionId: "TBA",
    schoolYear: "",
    enrollmentDate: "",
    status: "",
  });

  // New state to hold the fetched students and sections
  const [students, setStudents] = useState([]);
  const [sections, setSections] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [isDuplicate, setIsDuplicate] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedStudent = students.find(
    (student) =>
      student.learnersReferenceNumber === formData.learnersReferenceNumber ||
      student._id === formData.learnersReferenceNumber
  );

  const selectedSection = sections.find(
    (section) => (section.sectionId || section._id) === formData.sectionId
  );

  const sectionGradeLevel = selectedStudent?.gradeLevel || selectedSection?.gradeLevel;

  const visibleSections = sectionGradeLevel
    ? sections.filter((section) => section.gradeLevel === sectionGradeLevel)
    : sections;

  // Populate form when editing
  useEffect(() => {
    if (editingEnrollment) {
      setFormData({
        learnersReferenceNumber:
          editingEnrollment.learnersReferenceNumber || "",
        sectionId: editingEnrollment.sectionId || "TBA",
        schoolYear: editingEnrollment.schoolYear || "",
        enrollmentDate: editingEnrollment.enrollmentDate?.split("T")[0] || "",
        status: editingEnrollment.status || "",
      });
    } else {
      setFormData({
        learnersReferenceNumber: "",
        sectionId: "TBA",
        schoolYear: "",
        enrollmentDate: "",
        status: "",
      });
    }
  }, [editingEnrollment, open]);

  // Fetch students and sections when the modal opens
  useEffect(() => {
    if (open) {
      // Fetch Students
      fetch("/api/students")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setStudents(data.data);
        })
        .catch((err) => console.error("Failed to fetch students:", err));

      // Fetch Sections
      fetch("/api/sections")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setSections(data.data);
        })
        .catch((err) => console.error("Failed to fetch sections:", err));

      // Fetch Enrollments to allow client-side duplicate checks
      fetch("/api/enrollments")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setEnrollments(data.data);
        })
        .catch((err) => console.error("Failed to fetch enrollments:", err));
    }
  }, [open]);

  // When enrollments or sections change, annotate sections with current student counts
  useEffect(() => {
    if (sections.length > 0 && enrollments.length > 0) {
      const counts = {};
      enrollments.forEach((e) => {
        const sid = e.sectionId;
        if (!sid) return;
        counts[sid] = (counts[sid] || 0) + 1;
      });

      setSections((prev) => prev.map((s) => ({ ...s, _studentCount: counts[s.sectionId] || 0 })));
    }
  }, [sections.length, enrollments]);

  // Client-side check: if adding (not editing) and selected student already has an enrollment, show error
  useEffect(() => {
    if (formData.learnersReferenceNumber && enrollments.length > 0) {
      const exists = enrollments.find((e) => {
        const sameStudent = e.learnersReferenceNumber === formData.learnersReferenceNumber;
        const sameRecord = editingEnrollment && e._id === editingEnrollment._id;
        return sameStudent && !sameRecord;
      });
      setIsDuplicate(Boolean(exists));
    } else {
      setIsDuplicate(false);
    }

    // clear form-level error when no LRN selected
    if (!formData.learnersReferenceNumber) setError('');
  }, [formData.learnersReferenceNumber, enrollments, editingEnrollment]);

  const handleSubmit = async () => {
    if (isHistorical) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Validate required fields
      if (
        !formData.learnersReferenceNumber ||
        !formData.schoolYear ||
        !formData.enrollmentDate ||
        !formData.status
      ) {
        setError("Please fill in all required fields");
        setLoading(false);
        return;
      }

      const method = editingEnrollment ? "PUT" : "POST";
      const url = editingEnrollment
        ? `/api/enrollments/${editingEnrollment._id}`
        : "/api/enrollments";

      // Capacity check: ensure selected section has space (15 max)
      const selectedSectionId = formData.sectionId;
      if (selectedSectionId && selectedSectionId !== 'TBA') {
        const sectionObj = sections.find(s => (s.sectionId || s._id) === selectedSectionId);
        const currentCount = sectionObj?._studentCount || 0;
        const isChangingSection = editingEnrollment && editingEnrollment.sectionId !== selectedSectionId;
        if (!editingEnrollment && currentCount >= 15) {
          setError('Selected section is full (15 students).');
          setLoading(false);
          return;
        }
        if (editingEnrollment && isChangingSection && currentCount >= 15) {
          setError('Selected section is full (15 students).');
          setLoading(false);
          return;
        }
      }

      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save enrollment");
      }

      // Reset form and close modal
      setFormData({
        learnersReferenceNumber: "",
        sectionId: "TBA",
        schoolYear: "",
        enrollmentDate: "",
        status: "",
      });
      setError("");

      // Dispatch custom event to notify parent component to refresh the table
      window.dispatchEvent(new Event("enrollmentAdded"));
      onClose();
    } catch (err) {
      setError(err.message || "An error occurred");
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
                  <DialogTitle
                    as="h3"
                    className="text-base font-semibold text-gray-900"
                  >
                    {editingEnrollment
                      ? "Edit Enrollment"
                      : "Add New Enrollment"}
                  </DialogTitle>

                  {error && (
                    <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                      {error}
                    </div>
                  )}
                  {isDuplicate && (
                    <div className="mt-4 p-3 bg-yellow-100 text-yellow-800 rounded-md text-sm">
                      Student already has an enrollment
                    </div>
                  )}

                  <div className="mt-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      {/* Student Dropdown */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Student *
                        </label>
                        <select
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={formData.learnersReferenceNumber}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              learnersReferenceNumber: e.target.value,
                              sectionId: "TBA",
                            }))
                          }
                          disabled={loading || students.length === 0}
                        >
                          <option value="">Select a student</option>
                          {students.map((student) => (
                            <option
                              key={student._id}
                              value={
                                student.learnersReferenceNumber || student._id
                              }
                            >
                              {student.firstName} {student.lastName} (
                              {student.learnersReferenceNumber})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Section Dropdown */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Section *
                        </label>
                        <select
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={formData.sectionId}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              sectionId: e.target.value,
                            })
                          }
                          disabled={loading}
                        >
                          <option value="TBA">TBA</option>
                            {sectionGradeLevel && visibleSections.length === 0 ? (
                            <option value="" disabled>
                              No sections for {sectionGradeLevel}
                            </option>
                          ) : null}
                            {visibleSections.map((section) => {
                              const count = section._studentCount || 0;
                              const isFull = count >= 15;
                              const isSameAsEditing = editingEnrollment && (editingEnrollment.sectionId === (section.sectionId || section._id));
                              return (
                                <option
                                  key={section._id}
                                  value={section.sectionId || section._id}
                                  disabled={isFull && !isSameAsEditing}
                                >
                                  {section.sectionName || section.name} {isFull ? '(Full)' : ''}
                                </option>
                              );
                            })}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          School Year *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 2025-2026"
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={formData.schoolYear}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              schoolYear: e.target.value,
                            })
                          }
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Enrollment Date *
                        </label>
                        <input
                          type="date"
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={formData.enrollmentDate}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              enrollmentDate: e.target.value,
                            })
                          }
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Status *
                      </label>
                      <select
                        className={`mt-1 w-full px-3 py-2 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-1 ${getStatusStyles(formData.status)}`}
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({ ...formData, status: e.target.value })
                        }
                        disabled={loading}
                      >
                        <option value="">Select status</option>
                        <option value="Interview">Interview</option>
                        <option value="Approved">Approved</option>
                        <option value="For payment">For payment</option>
                        <option value="Enrolled">Enrolled</option>
                        <option value="Dropped">Dropped</option>
                        <option value="Pending">Pending</option>
                      </select>
                    </div>

                    <FileUpload
                      onUpload={(data) => console.log("Uploaded:", data)}
                      accept="image/*"
                      endpoint="/api/upload-file"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || isDuplicate || isHistorical}
                className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 disabled:bg-blue-400 sm:ml-3 sm:w-auto"
              >
                {loading
                  ? editingEnrollment
                    ? "Updating..."
                    : "Adding..."
                  : editingEnrollment
                    ? "Update Enrollment"
                    : "Add Enrollment"}
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
