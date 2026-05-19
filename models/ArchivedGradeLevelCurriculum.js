import mongoose from 'mongoose';

const ArchivedGradeLevelCurriculumSchema = new mongoose.Schema(
  {
    gl_curriculum_id: { type: String, required: true },
    schoolYear: { type: String, required: [true, 'School year is required'] },
    school_year_id: { type: String, required: [true, 'School year is required'] },
    grade_level: { type: String, required: [true, 'Grade level is required'] },
    curriculum_id: { type: mongoose.Schema.Types.Mixed, required: false, default: null },
    is_default: { type: Boolean, default: false },
    archivedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.ArchivedGradeLevelCurriculum || mongoose.model('ArchivedGradeLevelCurriculum', ArchivedGradeLevelCurriculumSchema, 'archived_grade_level_curriculums');
