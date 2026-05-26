import mongoose from 'mongoose';

const ClassAssignmentSchema = new mongoose.Schema(
  {
    assignmentId: { type: String, required: true, unique: true },
    section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true, unique: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true, unique: true },
    schedule: { type: mongoose.Schema.Types.ObjectId, ref: 'Schedule', required: true, unique: true },
  },
  { timestamps: true }
);

export default mongoose.models.ClassAssignment || mongoose.model('ClassAssignment', ClassAssignmentSchema, 'class_assignments');