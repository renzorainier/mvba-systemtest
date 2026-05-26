import mongoose from 'mongoose';

const ArchivedClassAssignmentSchema = new mongoose.Schema(
  {
    assignmentId: { type: String, required: true },
    schoolYear: { type: String, required: [true, 'School year is required'] },
    section: { type: mongoose.Schema.Types.Mixed, required: false, default: null },
    teacher: { type: mongoose.Schema.Types.Mixed, required: false, default: null },
    schedule: { type: mongoose.Schema.Types.Mixed, required: false, default: null },
    archivedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.ArchivedClassAssignment || mongoose.model('ArchivedClassAssignment', ArchivedClassAssignmentSchema, 'archived_class_assignments');
