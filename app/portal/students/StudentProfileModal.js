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
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [documentsToRemove, setDocumentsToRemove] = useState([]);
  const fileInputRef = useRef(null);
  const documentInputRef = useRef(null);

  // Initialize form data when student changes
  useEffect(() => {
    if (student) {
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
      // Load existing documents
      if (student.documents && Array.isArray(student.documents)) {
        setDocuments(student.documents);
      }
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
    if (file) {
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
    }
  };

  const handleDocumentChange = (e) => {
    const files = e.target.files;
    if (files) {
      const newDocuments = Array.from(files).map((file) => ({
        file,
        name: file.name,
        uploadedAt: new Date().toISOString(),
      }));
      setDocuments((prev) => [...prev, ...newDocuments]);
      setError('');
    }
  };

  const removeDocument = (index) => {
    const docToRemove = documents[index];
    // Track documents to remove (those with fileId)
    if (docToRemove.fileId) {
      setDocumentsToRemove((prev) => [...prev, docToRemove.fileId]);
    }
    setDocuments((prev) => prev.filter((_, i) => i !== index));
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
        updateData.append('profilePicture', profilePicture);
      }

      documents.forEach((doc, index) => {
        if (doc.file) {
          updateData.append(`documents[${index}]`, doc.file);
          updateData.append(`documentNames[${index}]`, doc.name);
        }
      });

      if (!isCreating && documentsToRemove.length > 0) {
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
        setDocuments([]);
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
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-2 border-gray-200 bg-gray-100 flex items-center justify-center overflow-hidden shadow-sm">
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
                <div className="space-y-4">
                  {/* Documents List */}
                  {documents.length > 0 && (
                    <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                      {documents.map((doc, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 hover:bg-gray-50"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{doc.fileName}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(doc.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {doc.fileId && (
                              <a
                                href={`/api/download-file/${doc.fileId}`}
                                download={doc.fileName}
                                className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                              >
                                Download
                              </a>
                            )}
                            {isEditing && !isHistorical && (
                              <button
                                onClick={() => removeDocument(index)}
                                className="text-red-600 hover:text-red-700 font-medium transition-colors"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload Documents */}
                  {isEditing && !isHistorical && (
                    <>
                      <input
                        type="file"
                        ref={documentInputRef}
                        multiple
                        onChange={handleDocumentChange}
                        className="hidden"
                      />
                      <button
                        onClick={() => documentInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <Upload size={24} className="mx-auto mb-2 text-gray-400" />
                        <p className="text-sm font-medium text-gray-700">Upload Documents</p>
                        <p className="text-xs text-gray-500">
                          Drag and drop or click to select files
                        </p>
                      </button>
                    </>
                  )}

                  {documents.length === 0 && !isEditing && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No documents uploaded yet
                    </p>
                  )}
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
