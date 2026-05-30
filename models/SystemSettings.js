import mongoose from 'mongoose';
import { createDefaultTuitionPlans } from '@/lib/tuition-settings';

const BreakdownItemSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const TuitionLineItemSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
  }
);

const TuitionCustomFieldSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const TuitionPlanSchema = new mongoose.Schema(
  {
    gradeLabel: { type: String, required: true, trim: true },
    applicableGrades: { type: [String], default: [] },
    totalBaseCost: { type: Number, required: true, min: 0 },
    lineItems: { type: [TuitionLineItemSchema], default: [] },
    amountDueBeforeSchool: { type: Number, default: 0, min: 0 },
    remainingBalanceDue: { type: Number, default: 0, min: 0 },
    monthlyPaymentCount: { type: Number, default: 0, min: 0 },
    monthlyPaymentAmount: { type: Number, default: 0, min: 0 },
    monthlyPaymentMonths: { type: String, default: '' },
    customFields: { type: [TuitionCustomFieldSchema], default: [] },
    notes: { type: String, default: '' },
  },
  { _id: true }
);

const SubjectSchema = new mongoose.Schema(
  {
    subject_id: { type: String, default: '' },
    subject_name: { type: String, required: true, trim: true },
    code: { type: String, default: '' },
    description: { type: String, default: '' },
    default_class_hours: { type: Number, default: 0 },
  },
  { _id: true }
);

const CurriculumSchema = new mongoose.Schema(
  {
    curriculum_id: { type: String, required: true },
    schoolYear: { type: String, required: true },
    curriculum_name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    effective_start_date: { type: Date },
    effective_end_date: { type: Date },
    subjects: { type: [SubjectSchema], default: [] },
  },
  { _id: true, timestamps: true }
);

const SystemSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'tuition-breakdown' },
    title: { type: String, required: true, default: 'Sample Tuition Fee Breakdown (Kindergarten to Grade 6)' },
    currency: { type: String, required: true, default: 'PHP' },
    currentSchoolYear: { type: String, required: true, default: '2025-2026' },
    schoolName: { type: String, default: 'Standard Academy Institute' },
    schoolAddress: { type: String, default: '123 Education Blvd, Metro Manila' },
    draftSchoolYear: { type: String, default: null },
      tuitionPlans: { type: [TuitionPlanSchema], default: createDefaultTuitionPlans },
      breakdown: { type: [BreakdownItemSchema], default: [] },
      curriculums: { type: [CurriculumSchema], default: [] },
      gradeLevelCurriculums: { type: Array, default: [] },
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
  currentSchoolYear: '2025-2026',
  draftSchoolYear: null,
  tuitionPlans: createDefaultTuitionPlans(),
  breakdown: DEFAULT_TUITION_BREAKDOWN,
  curriculums: [],
  gradeLevelCurriculums: [],
};

export const calculateTotalFromBreakdown = (breakdown = []) => {
  return breakdown.reduce((total, item) => {
    const amount = Number(item?.amount ?? item?.totalBaseCost ?? 0);

    if (amount > 0) {
      return total + amount;
    }

    if (Array.isArray(item?.lineItems)) {
      return total + item.lineItems.reduce((sum, lineItem) => sum + Number(lineItem?.amount || 0), 0);
    }

    return total;
  }, 0);
};

const SystemSettings =
  mongoose.models.SystemSettings || mongoose.model('SystemSettings', SystemSettingsSchema, 'system_settings');

export default SystemSettings;
