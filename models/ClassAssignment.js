import mongoose from 'mongoose';

const ClassAssignmentSchema = new mongoose.Schema(
  {
    assignmentId: { type: String, required: true, unique: true },
    section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true, unique: true },
    // Teacher is a shared resource across school years, so uniqueness is enforced
    // per year (compound index below) rather than globally — this lets the same
    // teacher be scheduled in both the active year and a draft year.
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    schedule: { type: mongoose.Schema.Types.ObjectId, ref: 'Schedule', required: true, unique: true },
    schoolYear: { type: String, default: null, index: true },
  },
  { timestamps: true }
);

// One assignment per teacher per school year.
ClassAssignmentSchema.index({ teacher: 1, schoolYear: 1 }, { unique: true });

const ClassAssignment =
  mongoose.models.ClassAssignment || mongoose.model('ClassAssignment', ClassAssignmentSchema, 'class_assignments');

// Drop the legacy global unique index on `teacher` so the per-year compound index
// can take effect on existing deployments.
const ensureClassAssignmentIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    if (!db) return;

    const coll = db.collection('class_assignments');
    const indexes = await coll.indexes().catch(() => []);

    if (indexes.some((index) => index.name === 'teacher_1')) {
      await coll.dropIndex('teacher_1').catch(() => {});
    }

    await coll.createIndex({ teacher: 1, schoolYear: 1 }, { unique: true, name: 'teacher_1_schoolYear_1' }).catch(() => {});
  } catch {
    // ignore — index operations may fail in some environments
  }
};

if (mongoose.connection && mongoose.connection.readyState === 1) {
  ensureClassAssignmentIndexes();
} else {
  mongoose.connection.once('open', ensureClassAssignmentIndexes);
}

export default ClassAssignment;
