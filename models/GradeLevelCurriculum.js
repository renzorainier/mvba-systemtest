import mongoose from 'mongoose';

const GradeLevelCurriculumSchema = new mongoose.Schema(
  {
    gl_curriculum_id: { type: String, required: true, unique: true },
    school_year_id: { type: String, required: [true, 'School year is required'] },
    grade_level: { type: String, required: [true, 'Grade level is required'] },
    curriculum_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Curriculum', required: true },
    is_default: { type: Boolean, default: false },
  },
  { timestamps: true }
);

GradeLevelCurriculumSchema.index({ school_year_id: 1, grade_level: 1, curriculum_id: 1 }, { unique: true });

export default mongoose.models.GradeLevelCurriculum || mongoose.model('GradeLevelCurriculum', GradeLevelCurriculumSchema, 'grade_level_curriculums');