import mongoose from 'mongoose';

const CurriculumSchema = new mongoose.Schema(
  {
    curriculum_id: { type: String, required: true, unique: true },
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
  },
  { timestamps: true }
);

export default mongoose.models.Curriculum || mongoose.model('Curriculum', CurriculumSchema, 'curriculums');