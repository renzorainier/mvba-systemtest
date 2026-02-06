import mongoose from 'mongoose';

// ⚠️ SIMPLE TEST SCHEMA (Matches your current frontend)
const StudentSchema = new mongoose.Schema({
  name: { type: String, required: true },      // Matches "name" from frontend
  studentId: { type: String, required: true }, // Matches "studentId" from frontend
  dateEnrolled: { type: Date, default: Date.now }
});

// Check if model exists before compiling to prevent overwrite errors in dev mode
export default mongoose.models.Student || mongoose.model('Student', StudentSchema);
