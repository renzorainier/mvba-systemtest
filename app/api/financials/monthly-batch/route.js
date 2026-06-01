import dbConnect from '@/lib/mongodb';
import Financial from '@/models/Financial';
import Student from '@/models/Student';
import ArchivedPayment from '@/models/ArchivedPayment';
import ArchivedStudent from '@/models/ArchivedStudent';
import SystemSettings from '@/models/SystemSettings';
import { getTuitionPlanForGrade, normalizeTuitionPlans } from '@/lib/tuition-settings';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { getSchoolYearContext, buildLiveYearFilter } from '@/lib/school-year';
import { isResolvableLrn } from '@/lib/student-identifiers';

const MONTH_NAMES = [
  'January','February','March','April','May','June','July','August','September','October','November','December',
];

const toCents = (value) => Math.round(Number(value || 0) * 100);
const fromCents = (valueInCents) => Number((Number(valueInCents || 0) / 100).toFixed(2));

const parseStartMonth = (text) => {
  if (!text || typeof text !== 'string') return null;
  const first = text.split(/\s+|,|until|-|\/|–/).filter(Boolean)[0]?.trim();
  if (!first) return null;
  const idx = MONTH_NAMES.findIndex((m) => m.toLowerCase() === first.toLowerCase());
  return idx >= 0 ? idx : null;
};

const buildMonthlyEntries = (plan, schoolYearStart) => {
  const entries = [];
  const monthlyCount = Math.max(0, Number(plan?.monthlyPaymentCount || 0));
  const configuredMonthlyAmount = Math.max(0, Number(plan?.monthlyPaymentAmount || 0));
  const configuredRemainingBalanceDue = Math.max(0, Number(plan?.remainingBalanceDue || 0));
  const startMonthName = String(plan?.monthlyPaymentMonths || '').split('until')[0];
  const startMonthIdx = parseStartMonth(startMonthName) ?? 6;
  const scheduledTotal = configuredRemainingBalanceDue > 0
    ? configuredRemainingBalanceDue
    : configuredMonthlyAmount * monthlyCount;

  const totalInCents = Math.round(scheduledTotal * 100);
  const baseAmountInCents = monthlyCount > 0 ? Math.floor(totalInCents / monthlyCount) : 0;
  const remainderInCents = monthlyCount > 0 ? totalInCents % monthlyCount : 0;

  for (let i = 0; i < monthlyCount; i++) {
    const monthIndex = (startMonthIdx + i) % 12;
    const yearOffset = Math.floor((startMonthIdx + i) / 12);
    entries.push({
      key: `month-${i}`,
      type: 'monthly',
      label: `${MONTH_NAMES[monthIndex]} ${schoolYearStart + yearOffset}`,
      monthIndex,
      year: schoolYearStart + yearOffset,
      expectedAmount: fromCents(baseAmountInCents + (i < remainderInCents ? 1 : 0)),
    });
  }
  return entries;
};

const createPaymentBuckets = (payments = []) =>
  payments
    .map((p) => ({
      _id: p._id,
      amount: Number(p.amountPaid || 0),
      remaining: Number(p.amountPaid || 0),
      dateOfPayment: p.dateOfPayment,
      referenceNumber: p.referenceNumber,
      paymentId: p.paymentId,
      status: String(p.status || '').toLowerCase(),
    }))
    .filter((p) => p.amount > 0 && p.status === 'completed');

const allocateFromBuckets = (targetAmount, buckets = []) => {
  let remaining = Math.max(0, Number(targetAmount || 0));
  const allocations = [];
  for (const bucket of buckets) {
    if (remaining <= 0) break;
    if (bucket.remaining <= 0) continue;
    const applied = Math.min(bucket.remaining, remaining);
    bucket.remaining -= applied;
    remaining -= applied;
    allocations.push({ paymentId: bucket.paymentId, sourceRecordId: bucket._id, amount: applied, dateOfPayment: bucket.dateOfPayment, referenceNumber: bucket.referenceNumber });
  }
  return { appliedAmount: Math.max(0, Number(targetAmount || 0) - remaining), allocations };
};

const computeBreakdown = (student, isArchived, plan, paymentsForStudent, schoolYearStart) => {
  const discountRatio = student.discountApplied ? 0.95 : 1;
  const planTotal = Number(plan?.totalBaseCost || 0);
  const monthlyEntries = plan ? buildMonthlyEntries(plan, schoolYearStart) : [];

  const planBreakdown = [];
  if (plan && Number(plan.amountDueBeforeSchool || 0) > 0) {
    planBreakdown.push({ key: 'before-school', type: 'before-school', label: 'Amount due before school start', expectedAmount: Number(plan.amountDueBeforeSchool || 0) });
  }
  planBreakdown.push(...monthlyEntries);
  if (planBreakdown.length === 0) {
    planBreakdown.push({ key: 'unconfigured-plan', type: 'unconfigured', label: 'No tuition plan configured', expectedAmount: 0 });
  }

  if (discountRatio < 1) {
    for (const item of planBreakdown) {
      item.expectedAmount = fromCents(Math.round(toCents(item.expectedAmount) * discountRatio));
    }
  }

  const effectivePlanTotal = discountRatio < 1 ? fromCents(Math.round(toCents(planTotal) * discountRatio)) : planTotal;
  const paymentBuckets = createPaymentBuckets(paymentsForStudent);
  const completedPaymentsTotal = paymentBuckets.reduce((sum, p) => sum + p.amount, 0);
  const allocatableTotal = Math.min(effectivePlanTotal, completedPaymentsTotal);

  let remainingToAllocate = allocatableTotal;
  const breakdownItems = planBreakdown.map((item) => ({ ...item, paidAmount: 0, status: 'unpaid', allocations: [] }));

  for (const item of breakdownItems) {
    if (remainingToAllocate <= 0) break;
    const allocation = allocateFromBuckets(Math.min(item.expectedAmount, remainingToAllocate), paymentBuckets);
    item.paidAmount = fromCents(toCents(allocation.appliedAmount));
    item.allocations = allocation.allocations;
    remainingToAllocate -= allocation.appliedAmount;

    if (item.expectedAmount <= 0) {
      item.status = item.paidAmount > 0 ? 'paid' : 'no-plan';
    } else if (toCents(item.paidAmount) >= toCents(item.expectedAmount)) {
      item.status = 'paid';
    } else if (item.paidAmount > 0) {
      item.status = 'partial';
    } else {
      item.status = 'unpaid';
    }
  }

  const usedIds = new Set(
    breakdownItems.flatMap((item) => item.allocations.flatMap((a) => [String(a.paymentId || ''), String(a.sourceRecordId || '')])).filter(Boolean)
  );
  for (const p of paymentBuckets.filter((p) => !usedIds.has(String(p._id)) && p.amount > 0)) {
    const dt = p.dateOfPayment ? new Date(p.dateOfPayment) : null;
    if (!dt || isNaN(dt.getTime())) continue;
    breakdownItems.push({ key: `overflow-${p._id}`, type: 'overflow', label: `${MONTH_NAMES[dt.getMonth()]} ${dt.getFullYear()}`, expectedAmount: 0, paidAmount: p.amount, status: p.amount > 0 ? 'paid' : 'unpaid', allocations: [{ paymentId: p.paymentId, sourceRecordId: p._id, amount: p.amount, dateOfPayment: p.dateOfPayment, referenceNumber: p.referenceNumber }] });
  }

  return { breakdownItems };
};

// POST body: { students: [{ _id, learnersReferenceNumber }] }
// Returns: { [studentId]: { breakdownItems } }
export async function POST(request) {
  try {
    await dbConnect();
    const context = await getSchoolYearContext(request);
    const { selectedSchoolYear, isHistorical } = context;

    const { students: studentList = [] } = await request.json();
    if (!Array.isArray(studentList) || studentList.length === 0) {
      return NextResponse.json({ success: true, data: {} });
    }

    // Fetch settings once
    const settings = await SystemSettings.findOne({ key: 'tuition-breakdown' });
    const tuitionPlans = normalizeTuitionPlans(settings?.tuitionPlans || []);

    const schoolYear = settings?.currentSchoolYear || '';
    let schoolYearStart = new Date().getFullYear();
    if (typeof schoolYear === 'string' && schoolYear.includes('-')) {
      const parts = schoolYear.split('-').map((s) => Number(s));
      if (parts.length === 2 && !isNaN(parts[0])) schoolYearStart = parts[0];
    }

    // Build lookup: identifier -> dashboardStudentId
    // identifier can be _id or LRN
    const idToKey = new Map(); // db _id or lrn string -> dashboard student._id
    const objectIds = [];
    const lrns = [];

    for (const s of studentList) {
      const dashId = String(s._id);
      const lrn = String(s.learnersReferenceNumber || '').trim();
      const useLrn = lrn && lrn.toUpperCase() !== 'TBA';

      if (useLrn) {
        lrns.push(lrn);
        idToKey.set(lrn, dashId);
      }
      if (mongoose.Types.ObjectId.isValid(dashId)) {
        objectIds.push(dashId);
        idToKey.set(dashId, dashId);
      }
    }

    // Fetch all matching students in two queries
    const orFilters = [];
    if (objectIds.length > 0) orFilters.push({ _id: { $in: objectIds } });
    if (lrns.length > 0) orFilters.push({ learnersReferenceNumber: { $in: lrns } });

    const [activeStudents, archivedStudents] = orFilters.length > 0
      ? await Promise.all([
          Student.find({ $or: orFilters }).lean(),
          ArchivedStudent.find({ $or: [...orFilters, ...(objectIds.length > 0 ? [{ sourceStudentId: { $in: objectIds } }] : [])] }).lean(),
        ])
      : [[], []];

    // Map each dashboard student._id -> resolved student record
    const resolvedMap = new Map(); // dashId -> { student, isArchived }

    for (const s of activeStudents) {
      const lrn = String(s.learnersReferenceNumber || '').trim();
      const sid = String(s._id);
      const dashId = idToKey.get(lrn) || idToKey.get(sid);
      if (dashId && !resolvedMap.has(dashId)) {
        resolvedMap.set(dashId, { student: s, isArchived: false });
      }
    }
    for (const s of archivedStudents) {
      const lrn = String(s.learnersReferenceNumber || '').trim();
      const sid = String(s._id);
      const srcId = String(s.sourceStudentId || '');
      const dashId = idToKey.get(lrn) || idToKey.get(sid) || idToKey.get(srcId);
      if (dashId && !resolvedMap.has(dashId)) {
        resolvedMap.set(dashId, { student: s, isArchived: true });
      }
    }

    // Collect all payment identifiers for a single payments query
    const allPaymentIds = [];
    for (const { student, isArchived } of resolvedMap.values()) {
      const lrn = String(student.learnersReferenceNumber || '').trim();
      if (isResolvableLrn(lrn)) allPaymentIds.push(lrn);
      if (isArchived) {
        allPaymentIds.push(String(student.sourceStudentId || student._id));
      } else {
        allPaymentIds.push(String(student._id));
      }
    }

    const paymentQuery = allPaymentIds.length > 0
      ? { $or: allPaymentIds.map((id) => ({ studentId: id })) }
      : null;

    const allPayments = paymentQuery
      ? (isHistorical
          ? await ArchivedPayment.find({ ...paymentQuery, schoolYear: selectedSchoolYear }).sort({ dateOfPayment: 1 }).lean()
          : await Financial.find({ $and: [paymentQuery, buildLiveYearFilter(context)] }).sort({ dateOfPayment: 1 }).lean())
      : [];

    // Group payments by studentId for fast lookup
    const paymentsByStudentId = new Map();
    for (const p of allPayments) {
      const key = String(p.studentId || '');
      if (!paymentsByStudentId.has(key)) paymentsByStudentId.set(key, []);
      paymentsByStudentId.get(key).push(p);
    }

    // Compute breakdown per student
    const result = {};
    for (const [dashId, { student, isArchived }] of resolvedMap.entries()) {
      const lrn = String(student.learnersReferenceNumber || '').trim();
      const dbId = isArchived ? String(student.sourceStudentId || student._id) : String(student._id);

      const paymentsForStudent = [
        ...(isResolvableLrn(lrn) ? (paymentsByStudentId.get(lrn) || []) : []),
        ...(paymentsByStudentId.get(dbId) || []),
      ].sort((a, b) => new Date(a.dateOfPayment || 0) - new Date(b.dateOfPayment || 0));

      const plan = getTuitionPlanForGrade(tuitionPlans, student.gradeLevel || '') || null;
      result[dashId] = computeBreakdown(student, isArchived, plan, paymentsForStudent, schoolYearStart);
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
