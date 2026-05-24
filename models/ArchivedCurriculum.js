import mongoose from 'mongoose';

const ArchivedCurriculumSchema = new mongoose.Schema(
  {
    curriculum_id: { type: String, required: true },
    schoolYear: { type: String, required: [true, 'School year is required'] },
    curriculum_name: { type: String, required: [true, 'Curriculum name is required'] },
    description: { type: String, default: '' },
    effective_start_date: { type: Date, required: [true, 'Effective start date is required'] },
    effective_end_date: { type: Date, required: [true, 'Effective end date is required'] },
    subjects: {
      type: [
        {
          subject_id: { type: String, required: true },
          subject_name: { type: String, required: true },
          code: { type: String, default: '' },
          description: { type: String, default: '' },
          default_class_hours: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
    archivedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ArchivedCurriculumSchema.index({ curriculum_id: 1, schoolYear: 1 }, { unique: true });

export default mongoose.models.ArchivedCurriculum || mongoose.model('ArchivedCurriculum', ArchivedCurriculumSchema, 'archived_curriculums');