import mongoose from 'mongoose';

const TeacherSchema = new mongoose.Schema({
firstName: { type: String, required: [true, "First name is required"]},
lastName: { type: String, required: [true, "Last name is required"] },
middleName: { type: String, required: false },
phoneNumber: { type: String, required: [true, "Phone number is required"] },
email: { type: String, required: [true, "Email is required"] },
hireDate: { type: Date, required: [true, "Hire date is required"] },
teacherId: { type: String, required: [true, "Teacher ID is required"], unique: true },
});

export default mongoose.models.Teacher || mongoose.model('Teacher', TeacherSchema, 'teachers');