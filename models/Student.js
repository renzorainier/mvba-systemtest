import mongoose from 'mongoose';

const StudentSchema = new mongoose.Schema({
  // Personal Details
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  middleName: String,
  dob: { type: Date, required: true },
  sex: { type: String, enum: ['Male', 'Female'], required: true },
  address: { type: String, required: true },

  // Academic Details
  studentId: { type: String, unique: true, required: true }, // The "2026-0001" format
  gradeLevel: { type: String, required: true }, // "Grade 7", "Grade 8"...
  section: { type: String, default: 'Unassigned' },
  status: { type: String, enum: ['Pending', 'Enrolled', 'Dropped', 'Graduated'], default: 'Pending' },

  // Requirement Tracking (Figure 10)
  requirements: {
    psa: { type: Boolean, default: false },
    reportCard: { type: Boolean, default: false },
    goodMoral: { type: Boolean, default: false }
  },

  // Metadata
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Student || mongoose.model('Student', StudentSchema);
