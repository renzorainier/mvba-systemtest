import mongoose from 'mongoose';

const GradeLevelCurriculumSchema = new mongoose.Schema(
  {
    gl_curriculum_id: { type: String, required: true },
    school_year_id: { type: String, required: [true, 'School year is required'] },
    grade_level: { type: String, required: [true, 'Grade level is required'] },
    curriculum_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Curriculum', required: true },
    is_default: { type: Boolean, default: false },
  },
  { timestamps: true }
);

GradeLevelCurriculumSchema.index({ school_year_id: 1, grade_level: 1, curriculum_id: 1 }, { unique: true });
GradeLevelCurriculumSchema.index({ school_year_id: 1, gl_curriculum_id: 1 }, { unique: true });

const ensureGradeLevelCurriculumIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    if (!db) return;

    const coll = db.collection('grade_level_curriculums');
    const indexes = await coll.indexes().catch(() => []);

    if (indexes.some((index) => index.name === 'gl_curriculum_id_1')) {
      await coll.dropIndex('gl_curriculum_id_1').catch(() => {});
    }

    await coll.createIndex(
      { school_year_id: 1, gl_curriculum_id: 1 },
      { unique: true, name: 'school_year_id_1_gl_curriculum_id_1' }
    ).catch(() => {});
  } catch {
    // ignore index migration issues in environments without a live DB
  }
};

if (mongoose.connection && mongoose.connection.readyState === 1) {
  ensureGradeLevelCurriculumIndexes();
} else {
  mongoose.connection.once('open', ensureGradeLevelCurriculumIndexes);
}

export default mongoose.models.GradeLevelCurriculum || mongoose.model('GradeLevelCurriculum', GradeLevelCurriculumSchema, 'grade_level_curriculums');