import mongoose from 'mongoose';

const SectionSchema = new mongoose.Schema({
    sectionName: { type: String, required: [true, "Section name is required"] },
    gradeLevel: { type: String, required: [true, "Grade level is required"] },
    schoolYear: { type: String, required: [true, "School year is required"] },
    teacherId: { type: String, required: [true, "Teacher ID is required"] },
    roomNumber: { type: String, required: [true, "Room number is required"] },
    sectionId: { type: String, required: [true, "Section ID is required"], unique: true },
});

export default mongoose.models.Section || mongoose.model('Section', SectionSchema, 'sections');