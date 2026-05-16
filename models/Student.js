import mongoose from 'mongoose';

const StudentSchema = new mongoose.Schema({
   // Everything should match the front end
  firstName: { type: String, required: [true, "First name is required"]},
  lastName: { type: String, required: [true, "Last name is required"] },
  middleName: { type: String, required: false },
  gender: {type: String, required: [true, "Gender is required"] },
  gradeLevel: {
    type: String,
    required: false,
    enum: ['Kinder 1', 'Kinder 2', 'Kinder 3', 'Kinder 4', 'Kinder 5', 'Kinder 6'],
  },
  dateOfBirth: { type: Date, required: [true, "Date of birth is required"] },
  address: { type: String, required: [true, "Address is required"] },
  admissionDate: { type: Date, required: [true, "Admission date is required"] },
  learnersReferenceNumber: { type: String, required: [true, "LRN is required"], unique: true, sparse: true },
  totalEstimatedCost: { type: Number, default: 15000, min: 0 },
  remainingBalance: { type: Number, default: 15000, min: 0 },
});


// Check if model exists before compiling to prevent overwrite errors in dev mode
export default mongoose.models.Student || mongoose.model('Student', StudentSchema, 'students');
