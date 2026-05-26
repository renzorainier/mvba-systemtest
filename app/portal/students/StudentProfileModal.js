'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { X, Upload, Save, Edit2, Archive } from 'lucide-react';
import FileUpload from '@/components/FileUpload';

const GRADE_LEVEL_OPTIONS = [
  'Kinder 1',
  'Kinder 2',
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
];

const DOCUMENT_FIELDS = [
  'Birth Certificate',
  'Form 137',
  'Report Card',
];

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
});

export default function StudentProfileModal({ open, onClose, student, onStudentUpdate, onArchived, isHistorical = false }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(createEmptyFormData());
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  const [documents, setDocuments] = useState(
    DOCUMENT_FIELDS.map((label) => ({
      label,
      file: null,
      fileId: null,
      fileName: '',
      uploadedAt: '',
    }))
  );
  const [loading, setLoading] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [documentsToRemove, setDocumentsToRemove] = useState([]);
  const fileInputRef = useRef(null);
  const documentInputRef = useRef(null);

  const setProfilePictureFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB');
      return;
    }

    setProfilePicture(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      setProfilePicturePreview(e.target.result);
    };
    reader.readAsDataURL(file);
    setError('');
  };

  // Initialize form data when student changes
  useEffect(() => {
    if (student) {
      const existingDocuments = Array.isArray(student.documents) ? student.documents : [];

      setFormData({
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        middleName: student.middleName || '',
        gender: student.gender || '',
        gradeLevel: student.gradeLevel || '',
        dateOfBirth: student.dateOfBirth?.split('T')[0] || '',
        address: student.address || '',
        admissionDate: student.admissionDate?.split('T')[0] || '',
        learnersReferenceNumber: student.learnersReferenceNumber || '',
        parentGuardianName: student.parentGuardianName || '',
        parentGuardianRelationship: student.parentGuardianRelationship || '',
        parentGuardianContactNumber: student.parentGuardianContactNumber || '',
      });
      setDocuments(
        DOCUMENT_FIELDS.map((label, index) => {
          const existingDocument = existingDocuments.find((doc) => doc.fileName === label) || existingDocuments[index] || null;

          return {
            label,
            file: null,
            fileId: existingDocument?.fileId || null,
            fileName: existingDocument?.fileName || '',
            uploadedAt: existingDocument?.uploadedAt || '',
          };
        })
      );
      setIsEditing(false);
      setError('');
      setSuccess('');
    } else if (open) {
      setFormData(createEmptyFormData());
      setDocuments([]);
      setDocumentsToRemove([]);
      setProfilePicture(null);
      setProfilePicturePreview(null);
      setIsEditing(true);
      setError('');
      setSuccess('');
    }
  }, [student, open]);

  // Load profile picture when student is selected
  useEffect(() => {
    if (student?.profilePicture && student.profilePicture.startsWith('/api/')) {
      // It's a URL - fetch it as a blob and convert to data URL
      fetch(student.profilePicture)
        .then(res => res.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onload = (e) => {
            setProfilePicturePreview(e.target.result);
          };
          reader.readAsDataURL(blob);
        })
        .catch(err => {
          console.error('Failed to load profile picture:', err);
          setProfilePicturePreview(null);
        });
    } else if (student?.profilePicture) {
      // It's already a data URL
      setProfilePicturePreview(student.profilePicture);
    } else {
      setProfilePicturePreview(null);
    }
  }, [student?.profilePicture]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files?.[0];
    setProfilePictureFile(file);
  };

  const handleProfilePictureDrop = (e) => {
    e.preventDefault();
    if (!isEditing) return;

    const file = e.dataTransfer.files?.[0];
    setProfilePictureFile(file);
  };

  // Compress a file using the /api/compress endpoint and return a File
  const compressFile = async (file) => {
    try {
      const form = new FormData();
      form.append('file', file);

      const res = await fetch('/api/compress', { method: 'POST', body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Compression failed');
      }

      const blob = await res.blob();
      const contentType = res.headers.get('Content-Type') || file.type;
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="?([^";]+)"?/);
      const filename = (match && match[1]) || file.name;

      return new File([blob], filename, { type: contentType });
    } catch (err) {
      console.error('Compression error:', err);
      // Fallback to original file if compression fails
      return file;
    }
  };

  // Upload a file to /api/upload-file and return the fileId
  const uploadToGridFS = async (file, relatedRecordId = null, relatedRecordType = null) => {
    const form = new FormData();
    form.append('file', file);
    if (relatedRecordId) form.append('relatedRecordId', relatedRecordId);
    if (relatedRecordType) form.append('relatedRecordType', relatedRecordType);

    const res = await fetch('/api/upload-file', { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Upload failed');
    }
    return data.fileId;
  };

  const handleDocumentChange = (index, file) => {
    if (!file) return;

    const existingFileId = documents[index]?.fileId;
    if (existingFileId) {
      setDocumentsToRemove((prevIds) => [...new Set([...prevIds, existingFileId])]);
    }

    setDocuments((prev) =>
      prev.map((doc, docIndex) =>
        docIndex === index
          ? {
              ...doc,
              file,
              fileName: file.name,
              uploadedAt: new Date().toISOString(),
              fileId: doc.fileId || null,
            }
          : doc
      )
    );

    setError('');
  };

  const removeDocument = (index) => {
    const docToRemove = documents[index];
    if (docToRemove?.fileId) {
      setDocumentsToRemove((prevIds) => [...new Set([...prevIds, docToRemove.fileId])]);
    }

    setDocuments((prev) =>
      prev.map((doc, docIndex) =>
        docIndex === index
          ? {
              ...doc,
              file: null,
              fileId: null,
              fileName: '',
              uploadedAt: '',
            }
          : doc
      )
    );
  };

  const handleSave = async () => {
    if (isHistorical) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate required fields
      if (!formData.firstName || !formData.lastName || !formData.gender || !formData.dateOfBirth) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      const isCreating = !student;
      const updateData = new FormData();
      Object.keys(formData).forEach((key) => {
        updateData.append(key, formData[key]);
      });

      if (profilePicture) {
        // Compress then upload profile picture to GridFS first
        try {
          const compressedProfile = await compressFile(profilePicture);
          const uploadedId = await uploadToGridFS(compressedProfile, student._id, 'student-profile');
          updateData.append('preuploadedProfilePictureId', uploadedId);
        } catch (err) {
          console.error('Profile picture upload error:', err);
          // Fallback: include the raw file so server can handle upload
          updateData.append('profilePicture', profilePicture);
        }
      }

      // Add fixed document slots: compress+upload via /api/upload-file and send references
      const preuploadedDocuments = [];
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        if (doc.file) {
          try {
            const compressed = await compressFile(doc.file);
            const fileId = await uploadToGridFS(compressed, student._id, 'student-document');
            preuploadedDocuments.push({ fileId, fileName: doc.fileName || doc.label, uploadedAt: new Date().toISOString() });
          } catch (err) {
            console.error('Document upload error:', err);
            // Fallback: attach file directly so server will upload; include slot and label
            updateData.append(`documents[${i}]`, doc.file);
            updateData.append(`documentNames[${i}]`, doc.label);
          }
        }
      }

      if (preuploadedDocuments.length > 0) {
        updateData.append('preuploadedDocuments', JSON.stringify(preuploadedDocuments));
      }

      if (documentsToRemove.length > 0) {
        updateData.append('documentsToRemove', JSON.stringify(documentsToRemove));
      }

      const response = await fetch(isCreating ? '/api/students' : `/api/students/${student._id}`, {
        method: isCreating ? 'POST' : 'PUT',
        body: updateData,
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(isCreating ? 'Student created successfully' : 'Student profile updated successfully');
        setIsEditing(false);
        setProfilePicture(null);
        setDocumentsToRemove([]);
        if (onStudentUpdate) {
          onStudentUpdate(result.data);
        }
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError(result.error || result.message || 'Failed to update student');
      }
    } catch (error) {
      console.error('Error updating student:', error);
      setError('An error occurred while updating the student profile');
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!student || isHistorical) return;

    const confirmed = window.confirm(
      'Archive this student and all linked enrollments, payments, and receipt records? You can restore them later from Archived Students.'
    );

    if (!confirmed) {
      return;
    }

    setArchiving(true);
    setError('');

    try {
      const response = await fetch(`/api/students/${student._id}/archive`, {
        method: 'POST',
      });

      const result = await response.json();
      const alreadyArchived = response.status === 409 && result.error === 'Student is already archived.';

      if ((!response.ok || !result.success) && !alreadyArchived) {
        throw new Error(result.error || 'Failed to archive student');
      }

      if (onArchived) {
        onArchived(result.data || student);
      }

      setSuccess(alreadyArchived ? 'Student was already archived' : 'Student archived successfully');
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (archiveError) {
      console.error('Error archiving student:', archiveError);
      setError(archiveError.message || 'An error occurred while archiving the student');
    } finally {
      setArchiving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel className="w-full max-w-4xl transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
              <DialogTitle className="text-lg font-bold text-white">
                {student ? (isEditing ? 'Edit Student Profile' : 'Student Profile') : 'Add New Student'}
              </DialogTitle>
              <button
                onClick={onClose}
                className="text-white hover:bg-blue-700 p-1 rounded transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Alert Messages */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm font-medium">{error}</p>
                </div>
              )}
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 text-sm font-medium">{success}</p>
                </div>
              )}

              {/* Profile Picture Section */}
              <div className="border-b pb-6">
                <div className="flex items-start gap-8">
                  {/* Picture Display */}
                  <div className="flex-shrink-0 relative">
                    <div
                      onDragOver={(e) => {
                        if (!isEditing) return;
                        e.preventDefault();
                      }}
                      onDrop={handleProfilePictureDrop}
                      onClick={() => isEditing && fileInputRef.current?.click()}
                      onKeyDown={(e) => {
                        if (!isEditing) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          fileInputRef.current?.click();
                        }
                      }}
                      tabIndex={isEditing ? 0 : -1}
                      role={isEditing ? 'button' : undefined}
                      aria-label={isEditing ? 'Upload profile picture' : undefined}
                      className={`w-32 h-32 md:w-40 md:h-40 rounded-full border-2 bg-gray-100 flex items-center justify-center overflow-hidden shadow-sm ${isEditing ? 'cursor-pointer border-dashed border-blue-300 outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2' : 'border-gray-200'}`}
                    >
                      {profilePicturePreview ? (
                        <img
                          src={profilePicturePreview}
                          alt={student ? `${student.firstName} ${student.lastName}` : 'New student profile'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <span className="text-gray-400 text-sm">No Picture</span>
                        </div>
                      )}
                    </div>

                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                      className="hidden"
                    />

                    <button
                      onClick={() => isEditing && !isHistorical && fileInputRef.current?.click()}
                      aria-disabled={!isEditing || isHistorical}
                      disabled={!isEditing || isHistorical}
                      className={`absolute -bottom-2 left-8 md:left-10 transform translate-y-1/2 rounded-full p-2 shadow-md transition-colors disabled:cursor-not-allowed ${isEditing && !isHistorical ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white text-blue-600 opacity-80'}`}
                      title={isHistorical ? 'Historical school years are read-only' : isEditing ? 'Upload profile picture' : 'Enable edit to upload'}
                    >
                      <Upload size={16} />
                    </button>
                  </div>

                  {/* Student Information */}
                  <div className="flex-1 pt-2">
                    <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-1 leading-tight truncate">
                      {student ? `${student.firstName} ${student.lastName}` : 'New Student'}
                    </h3>

                    <p className="text-sm text-gray-600 mb-2">
                      <span className="text-gray-400 mr-2">#</span>
                      <span className="font-medium">Student ID:</span>
                      <span className="ml-2 text-gray-800 font-semibold">{student?.learnersReferenceNumber || 'Pending'}</span>
                    </p>

                    <div className="flex items-center gap-3 mb-4">
                      <span className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium border border-blue-100">
                        {student?.gradeLevel || formData.gradeLevel || '—'}
                      </span>
                      <span className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                        Admitted: {student?.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Student Information Section */}
              <div className="border-b pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* First Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Last Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Middle Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      name="middleName"
                      value={formData.middleName}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gender <span className="text-red-600">*</span>
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Birth <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Grade Level */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Grade Level
                    </label>
                    <select
                      name="gradeLevel"
                      value={formData.gradeLevel}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
                    >
                      <option value="">Select Grade Level</option>
                      {GRADE_LEVEL_OPTIONS.map((grade) => (
                        <option key={grade} value={grade}>
                          {grade}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Address */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address {!isEditing && <span className="text-red-600">*</span>}
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Enrollment Information Section */}
              <div className="border-b pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Enrollment Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* LRN */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Learner's Reference Number (LRN)
                    </label>
                    <input
                      type="text"
                      name="learnersReferenceNumber"
                      value={formData.learnersReferenceNumber}
                      onChange={handleInputChange}
                      disabled={!isEditing || formData.gradeLevel === 'Kinder 1'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-600"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.gradeLevel === 'Kinder 1'
                        ? 'This field cannot be changed for Kinder 1.'
                        : 'Editable while this profile is in edit mode.'}
                    </p>
                  </div>

                  {/* Admission Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Admission Date
                    </label>
                    <input
                      type="date"
                      name="admissionDate"
                      value={formData.admissionDate}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Parent/Guardian Information Section */}
              <div className="border-b pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Parent/Guardian Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Parent/Guardian Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      name="parentGuardianName"
                      value={formData.parentGuardianName}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Relationship */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Relationship
                    </label>
                    <input
                      type="text"
                      name="parentGuardianRelationship"
                      value={formData.parentGuardianRelationship}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Contact Number */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      name="parentGuardianContactNumber"
                      value={formData.parentGuardianContactNumber}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Student Documents Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Documents</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {documents.map((doc, index) => (
                    <div key={doc.label} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-gray-900">{doc.label}</p>
                      </div>

                      {doc.fileId || doc.file ? (
                        <div className="space-y-3">
                          <div className="rounded-md bg-white border border-gray-200 p-3">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {doc.fileName || doc.label}
                            </p>
                            <p className="text-xs text-gray-500">
                              {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'Saved document'}
                            </p>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            {doc.fileId ? (
                              <a
                                href={`/api/download-file/${doc.fileId}`}
                                download={doc.fileName || doc.label}
                                className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                              >
                                Download
                              </a>
                            ) : (
                              <span className="text-xs text-green-700 font-medium">Pending save</span>
                            )}
                            {isEditing && !isHistorical && (
                              <button
                                type="button"
                                onClick={() => removeDocument(index)}
                                className="text-red-600 hover:text-red-700 font-medium transition-colors"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <>
                          <input
                            id={`document-${index}`}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleDocumentChange(index, e.target.files?.[0])}
                            className="hidden"
                          />
                          <button
                            type="button"
                            disabled={!isEditing}
                            onClick={() => isEditing && document.getElementById(`document-${index}`)?.click()}
                            className="w-full rounded-lg border-2 border-dashed border-gray-300 bg-white p-4 text-center transition-colors hover:border-blue-500 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Upload size={24} className="mx-auto mb-2 text-gray-400" />
                            <p className="text-sm font-medium text-gray-700">Upload file</p>
                            <p className="text-xs text-gray-500">Click to select a file</p>
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer / Action Buttons */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              {student && !isEditing && (
                <button
                  onClick={handleArchive}
                  disabled={loading || archiving}
                  className="px-4 py-2 border border-red-300 rounded-lg font-medium text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Archive size={18} />
                  {archiving ? 'Archiving...' : 'Archive'}
                </button>
              )}
              <button
                onClick={onClose}
                disabled={loading || archiving}
                className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Close
              </button>
              {!isEditing ? (
                <button
                  onClick={() => !isHistorical && setIsEditing(true)}
                  disabled={isHistorical}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  <Edit2 size={18} />
                  {student ? 'Edit Profile' : 'Create Student'}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    disabled={loading}
                    className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading || isHistorical}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save size={18} />
                    {loading ? 'Saving...' : student ? 'Save Changes' : 'Create Student'}
                  </button>
                </>
              )}
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
