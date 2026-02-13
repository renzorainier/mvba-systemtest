import mongoose from 'mongoose';

const StudentSchema = new mongoose.Schema({
   // Everything should match the front end
  firstName: { type: String, required: [true, "First name is required"]},
  lastName: { type: String, required: [true, "Last name is required"] },
  middleName: { type: String, required: false },
  gender: {type: String, required: [true, "Gender is required"] },
  dateOfBirth: { type: Date, required: [true, "Date of birth is required"] },
  address: { type: String, required: [true, "Address is required"] },
  admissionDate: { type: Date, required: [true, "Admission date is required"] },
  studentId: { type: String, required: [true, "Student ID is required"] },
});


// Check if model exists before compiling to prevent overwrite errors in dev mode
export default mongoose.models.Student || mongoose.model('Student', StudentSchema, 'students');
