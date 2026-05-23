import mongoose from 'mongoose';

const CurriculumSchema = new mongoose.Schema(
  {
    curriculum_id: { type: String, required: true },
    schoolYear: { type: String, required: true },
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

CurriculumSchema.index({ curriculum_id: 1, schoolYear: 1 }, { unique: true });

export default mongoose.models.Curriculum || mongoose.model('Curriculum', CurriculumSchema, 'curriculums');

const ensureCurriculumIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    if (!db) return;

    const coll = db.collection('curriculums');
    const indexes = await coll.indexes().catch(() => []);

    if (indexes.some((index) => index.name === 'curriculum_id_1')) {
      await coll.dropIndex('curriculum_id_1').catch(() => {});
    }

    await coll.createIndex(
      { curriculum_id: 1, schoolYear: 1 },
      {
        unique: true,
        name: 'curriculum_id_1_schoolYear_1',
      }
    ).catch(() => {});
  } catch (error) {
    // ignore index setup issues in environments where the db is unavailable
  }
};

if (mongoose.connection && mongoose.connection.readyState === 1) {
  ensureCurriculumIndexes();
} else {
  mongoose.connection.once('open', ensureCurriculumIndexes);
}