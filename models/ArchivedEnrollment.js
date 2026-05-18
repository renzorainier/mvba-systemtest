import mongoose from 'mongoose';

const ArchivedEnrollmentSchema = new mongoose.Schema({
  enrollmentId: { type: String, required: [true, 'Enrollment ID is required'], unique: true },
  learnersReferenceNumber: { type: String, required: [true, "Learner's reference number is required"] },
  sectionId: { type: String, required: [true, 'Section ID is required'] },
  enrollmentDate: { type: Date, required: [true, 'Enrollment date is required'] },
  schoolYear: { type: String, required: [true, 'School year is required'] },
  status: { type: String, required: [true, 'Status is required'] },
  archivedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.models.ArchivedEnrollment || mongoose.model('ArchivedEnrollment', ArchivedEnrollmentSchema, 'archived_enrollments');