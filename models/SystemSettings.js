import mongoose from 'mongoose';

const BreakdownItemSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const SystemSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'tuition-breakdown' },
    title: { type: String, required: true, default: 'Sample Tuition Fee Breakdown (Kindergarten to Grade 6)' },
    currency: { type: String, required: true, default: 'PHP' },
    breakdown: { type: [BreakdownItemSchema], default: [] },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

export const DEFAULT_TUITION_BREAKDOWN = [
  { label: 'Tuition Fee', amount: 8000 },
  { label: 'Miscellaneous Fees', amount: 2000 },
  { label: 'Books & Modules', amount: 1500 },
  { label: 'Uniforms', amount: 1200 },
  { label: 'School Supplies', amount: 1000 },
  { label: 'PTA/Activity Fees', amount: 500 },
  { label: 'ID & School Forms', amount: 300 },
  { label: 'Exam Fees', amount: 500 },
];

export const DEFAULT_SETTINGS_PAYLOAD = {
  key: 'tuition-breakdown',
  title: 'Sample Tuition Fee Breakdown (Kindergarten to Grade 6)',
  currency: 'PHP',
  breakdown: DEFAULT_TUITION_BREAKDOWN,
};

export const calculateTotalFromBreakdown = (breakdown = []) => {
  return breakdown.reduce((total, item) => total + Number(item.amount || 0), 0);
};

const SystemSettings =
  mongoose.models.SystemSettings || mongoose.model('SystemSettings', SystemSettingsSchema, 'system_settings');

export default SystemSettings;
