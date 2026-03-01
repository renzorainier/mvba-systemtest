import mongoose from 'mongoose';

const EnrollmentSchema = new mongoose.Schema({
     enrollmentId: { type: String, required: [true, "Enrollment ID is required"], unique: true },
     studentId: { type: String, required: [true, "Student ID is required"] },
     SectionId: { type: String, required: [true, "Section ID is required"] },
     enrollmentDate: { type: Date, required: [true, "Enrollment date is required"] },
     schoolYear: { type: String, required: [true, "School year is required"] },
     status: { type: String, required: [true, "Status is required"] }, 
})

export default mongoose.models.Enrollment || mongoose.model('Enrollment', EnrollmentSchema, 'enrollments');