import mongoose from 'mongoose';

const ArchivedSectionSchema = new mongoose.Schema(
  {
    sectionId: { type: String, required: true },
    sectionName: { type: String, required: [true, 'Section name is required'] },
    gradeLevel: { type: String, required: [true, 'Grade level is required'] },
    schoolYear: { type: String, required: [true, 'School year is required'] },
    glCurriculumId: { type: mongoose.Schema.Types.Mixed, required: false, default: null },
    roomNumber: { type: String, required: [true, 'Room number is required'] },
    archivedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.ArchivedSection || mongoose.model('ArchivedSection', ArchivedSectionSchema, 'archived_sections');
