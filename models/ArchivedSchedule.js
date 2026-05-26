import mongoose from 'mongoose';

const ArchivedScheduleItemSchema = new mongoose.Schema(
  {
    id: { type: String },
    subject: { type: String, required: true },
    day: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    type: { type: String, enum: ['class', 'recess', 'lunch'], required: true },
  },
  { _id: false }
);

const ArchivedScheduleSchema = new mongoose.Schema(
  {
    scheduleId: { type: String, required: true },
    name: { type: String, required: [true, 'Schedule name is required'] },
    gradeLevel: { type: String, required: [true, 'Grade level is required'] },
    schoolYear: { type: String, required: [true, 'School year is required'] },
    totalSubjects: { type: Number, default: 0 },
    items: { type: [ArchivedScheduleItemSchema], default: [] },
    archivedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.ArchivedSchedule || mongoose.model('ArchivedSchedule', ArchivedScheduleSchema, 'archived_schedules');
