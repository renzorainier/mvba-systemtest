import mongoose from 'mongoose';

// Schema for individual time slots in the grid
const ScheduleItemSchema = new mongoose.Schema({
  id: { type: String }, // Temporary ID from frontend
  subject: { type: String, required: true },
  day: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  type: { type: String, enum: ['class', 'recess', 'lunch'], required: true }
});

const ScheduleSchema = new mongoose.Schema({
  scheduleId: { type: String, required: true, unique: true },
  name: { type: String, required: [true, "Schedule name is required"] },
  gradeLevel: { type: String, required: [true, "Grade level is required"] },
  totalSubjects: { type: Number, default: 0 },
  items: [ScheduleItemSchema], // Array of the time slots
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Schedule || mongoose.model('Schedule', ScheduleSchema, 'schedules');