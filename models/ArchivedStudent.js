import mongoose from 'mongoose';

const ArchivedStudentSchema = new mongoose.Schema({
  firstName: { type: String, required: [true, 'First name is required'] },
  lastName: { type: String, required: [true, 'Last name is required'] },
  middleName: { type: String, required: false },
  gender: { type: String, required: [true, 'Gender is required'] },
  gradeLevel: {
    type: String,
    required: false,
    enum: ['Kinder 1', 'Kinder 2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'],
  },
  dateOfBirth: { type: Date, required: [true, 'Date of birth is required'] },
  address: { type: String, required: [true, 'Address is required'] },
  admissionDate: { type: Date, required: [true, 'Admission date is required'] },
  learnersReferenceNumber: { type: String, required: [true, 'LRN is required'] },
  parentGuardianName: { type: String, required: false, default: '' },
  parentGuardianRelationship: { type: String, required: false, default: '' },
  parentGuardianContactNumber: { type: String, required: false, default: '' },
  sectionId: { type: String, required: false, default: null },
  schoolYear: { type: String, required: [true, 'School year is required'] },
  totalEstimatedCost: { type: Number, default: 15000, min: 0 },
  remainingBalance: { type: Number, default: 15000, min: 0 },
  profilePicture: { type: String, required: false, default: null },
  documents: [
    {
      fileId: mongoose.Schema.Types.ObjectId,
      fileName: String,
      uploadedAt: { type: Date, default: Date.now },
    },
  ],
  archivedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.models.ArchivedStudent || mongoose.model('ArchivedStudent', ArchivedStudentSchema, 'archived_students');