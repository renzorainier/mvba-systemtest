"use client";

import { useState, useEffect, useMemo } from "react";
import { useSchoolYearContext } from '@/components/SchoolYearContext';
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";

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
  const { selectedSchoolYear } = useSchoolYearContext();

  const [formData, setFormData] = useState({
    learnersReferenceNumber: "",
    studentId: "",
    sectionId: "TBA",
    schoolYear: selectedSchoolYear || "",
    enrollmentDate: "",
    status: "",
  });

  // New state to hold the fetched students and sections
  const [students, setStudents] = useState([]);
  const [sections, setSections] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [studentQuery, setStudentQuery] = useState('');
  const [showStudentSuggestions, setShowStudentSuggestions] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Resolve selected student by DB _id only. Do not rely on learnersReferenceNumber
  // for grade/section resolution to avoid ambiguous LRN matches.
  const selectedStudent = students.find((student) => String(student._id) === String(formData.studentId));

  const selectedSection = sections.find(
    (section) => (section.sectionId || section._id) === formData.sectionId
  );

  const sectionGradeLevel = selectedStudent?.gradeLevel || selectedSection?.gradeLevel;

  const visibleSections = sectionGradeLevel
    ? sections.filter((section) => section.gradeLevel === sectionGradeLevel)
    : sections;

  const filteredStudents = useMemo(() => {
    const query = studentQuery.trim().toLowerCase();

    if (!query) {
      return students.slice(0, 8);
    }

    return students
      .filter((student) => {
        const studentNumber = String(student.learnersReferenceNumber || '').toLowerCase();
        const fullName = `${student.firstName || ''} ${student.lastName || ''}`.toLowerCase();
        return studentNumber.includes(query) || fullName.includes(query);
      })
      .slice(0, 8);
  }, [students, studentQuery]);

  const selectStudent = (student) => {
    setFormData((prev) => ({
      ...prev,
      studentId: String(student._id),
      learnersReferenceNumber: String(student.learnersReferenceNumber || ''),
      sectionId: 'TBA',
    }));
    setStudentQuery(`${student.learnersReferenceNumber || 'TBA'} - ${student.firstName || ''} ${student.lastName || ''}`.trim());
    setShowStudentSuggestions(false);
  };

  // Populate form when editing
  useEffect(() => {
    if (editingEnrollment) {
      setFormData({
        learnersReferenceNumber:
          editingEnrollment.learnersReferenceNumber || "",
        studentId: editingEnrollment.studentId || "",
        sectionId: editingEnrollment.sectionId || "TBA",
        schoolYear: editingEnrollment.schoolYear || selectedSchoolYear || "",
        enrollmentDate: editingEnrollment.enrollmentDate?.split("T")[0] || "",
        status: editingEnrollment.status || "",
      });
    } else {
      setFormData({
        learnersReferenceNumber: "",
        studentId: "",
        sectionId: "TBA",
        schoolYear: selectedSchoolYear || "",
        enrollmentDate: "",
        status: "",
      });
    }
    setShowStudentSuggestions(false);
  }, [editingEnrollment, open]);

  useEffect(() => {
    if (!open) {
      setStudentQuery('');
      setShowStudentSuggestions(false);
      return;
    }

    if (selectedStudent) {
      setStudentQuery(`${selectedStudent.learnersReferenceNumber || 'TBA'} - ${selectedStudent.firstName || ''} ${selectedStudent.lastName || ''}`.trim());
    } else {
      setStudentQuery('');
    }
  }, [open, selectedStudent]);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, schoolYear: selectedSchoolYear || prev.schoolYear }));
  }, [selectedSchoolYear]);

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

  // When students load, if we have an editingEnrollment that only contains learnersReferenceNumber,
  // try to resolve and set the corresponding studentId so the select shows correctly.
  useEffect(() => {
    if (students.length > 0 && editingEnrollment) {
      // Prefer using the explicit studentId on the editing enrollment to resolve the select.
      if (editingEnrollment.studentId) {
        const foundById = students.find((s) => String(s._id) === String(editingEnrollment.studentId));
        if (foundById) {
          setFormData((prev) => ({ ...prev, studentId: String(foundById._id) }));
        }
      }
      // If no studentId is present on the editingEnrollment, do not auto-resolve by LRN
      // to avoid choosing the wrong student when LRNs are ambiguous (e.g., 'TBA').
    }
  }, [students, editingEnrollment]);

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
    if (formData.studentId && enrollments.length > 0) {
      const exists = enrollments.find((e) => {
        const sameStudentById = e.studentId && String(e.studentId) === String(formData.studentId);
        const sameRecord = editingEnrollment && e._id === editingEnrollment._id;
        return sameStudentById && !sameRecord;
      });
      setIsDuplicate(Boolean(exists));
    } else {
      // If studentId is not set, do not mark as duplicate based solely on shared LRN placeholders like 'TBA'.
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

      // Ensure students list is loaded so we can resolve the selected student's DB id and LRN
      let resolvedStudent = students.find((s) => String(s._id) === String(formData.studentId)) || null;
      if (!resolvedStudent && (!formData.studentId || students.length === 0)) {
        try {
          const r = await fetch('/api/students');
          const j = await r.json();
          if (r.ok && j.success) {
            setStudents(j.data || []);
            resolvedStudent = (j.data || []).find((s) => String(s._id) === String(formData.studentId)) || null;
          }
        } catch (err) {
          // ignore — resolvedStudent will remain null and server-side checks will catch ambiguity
        }
      }
      const payload = {
        ...formData,
        studentId: formData.studentId || (resolvedStudent ? String(resolvedStudent._id) : undefined),
        learnersReferenceNumber: formData.learnersReferenceNumber || (resolvedStudent ? String(resolvedStudent.learnersReferenceNumber || '') : ''),
      };

      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
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
                      <div className="relative">
                        <label className="block text-sm font-medium text-gray-700">
                          Student *
                        </label>
                        <input
                          type="text"
                          placeholder="Search student by name or LRN"
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={studentQuery}
                          onChange={(e) => {
                            setStudentQuery(e.target.value);
                            setFormData((prev) => ({
                              ...prev,
                              studentId: '',
                              learnersReferenceNumber: '',
                              sectionId: 'TBA',
                            }));
                            setShowStudentSuggestions(true);
                          }}
                          onFocus={() => setShowStudentSuggestions(true)}
                          disabled={loading || students.length === 0}
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
                                <p className="text-sm font-semibold text-gray-900">
                                  {student.firstName} {student.lastName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {student.learnersReferenceNumber || 'TBA'} • {student.gradeLevel || 'No grade level'}
                                </p>
                              </button>
                            ))}
                          </div>
                        )}
                        {showStudentSuggestions && filteredStudents.length === 0 && studentQuery.trim() && (
                          <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 shadow-lg">
                            No matching student found.
                          </div>
                        )}
                        {!!formData.studentId && selectedStudent && (
                          <p className="mt-2 text-xs text-gray-500">
                            Selected: {selectedStudent.firstName} {selectedStudent.lastName} ({selectedStudent.learnersReferenceNumber || 'TBA'})
                          </p>
                        )}
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
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-gray-50 focus:outline-none"
                            value={formData.schoolYear}
                            readOnly={true}
                            disabled={true}
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
