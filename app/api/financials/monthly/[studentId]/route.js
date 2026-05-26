import dbConnect from '@/lib/mongodb';
import Financial from '@/models/Financial';
import Student from '@/models/Student';
import ArchivedPayment from '@/models/ArchivedPayment';
import ArchivedStudent from '@/models/ArchivedStudent';
import SystemSettings from '@/models/SystemSettings';
import { getTuitionPlanForGrade, normalizeTuitionPlans } from '@/lib/tuition-settings';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

const MONTH_NAMES = [
  'January','February','March','April','May','June','July','August','September','October','November','December'
];

const findStudentByIdentifier = async (studentId) => {
  const studentSearchFilters = [{ learnersReferenceNumber: studentId }];

  if (mongoose.Types.ObjectId.isValid(studentId)) {
    studentSearchFilters.push({ _id: studentId });
  }

  const activeStudent = await Student.findOne({ $or: studentSearchFilters });
  if (activeStudent) {
    return { student: activeStudent, isArchived: false };
  }

  const archivedSearchFilters = [...studentSearchFilters];
  if (mongoose.Types.ObjectId.isValid(studentId)) {
    archivedSearchFilters.push({ sourceStudentId: studentId });
  }

  const archivedStudent = await ArchivedStudent.findOne({ $or: archivedSearchFilters });
  if (archivedStudent) {
    return { student: archivedStudent, isArchived: true };
  }

  return null;
};

const parseStartMonth = (text) => {
  if (!text || typeof text !== 'string') return null;
  const parts = text.split(/\s+|,|until|-|\/|–/).filter(Boolean);
  if (parts.length === 0) return null;
  const first = parts[0].trim();
  const idx = MONTH_NAMES.findIndex(m => m.toLowerCase() === first.toLowerCase());
  return idx >= 0 ? idx : null;
};

const createPaymentBuckets = (payments = []) => {
  return payments
    .map((payment) => ({
      _id: payment._id,
      amount: Number(payment.amountPaid || 0),
      remaining: Number(payment.amountPaid || 0),
      dateOfPayment: payment.dateOfPayment,
      referenceNumber: payment.referenceNumber,
      paymentId: payment.paymentId,
      status: String(payment.status || '').toLowerCase(),
    }))
    .filter((payment) => payment.amount > 0 && payment.status === 'completed');
};

const allocateFromBuckets = (targetAmount, buckets = []) => {
  let remaining = Math.max(0, Number(targetAmount || 0));
  const allocations = [];

  for (const bucket of buckets) {
    if (remaining <= 0) {
      break;
    }

    if (bucket.remaining <= 0) {
      continue;
    }

    const applied = Math.min(bucket.remaining, remaining);
    bucket.remaining -= applied;
    remaining -= applied;

    allocations.push({
      paymentId: bucket.paymentId,
      sourceRecordId: bucket._id,
      amount: applied,
      dateOfPayment: bucket.dateOfPayment,
      referenceNumber: bucket.referenceNumber,
    });
  }

  return {
    appliedAmount: Math.max(0, Number(targetAmount || 0) - remaining),
    remainingAmount: remaining,
    allocations,
  };
};

const buildMonthlyEntries = (plan, schoolYearStart) => {
  const entries = [];
  const monthlyCount = Math.max(0, Number(plan?.monthlyPaymentCount || 0));
  const monthlyAmount = Math.max(0, Number(plan?.monthlyPaymentAmount || 0));
  const startMonthName = String(plan?.monthlyPaymentMonths || '').split('until')[0];
  const startMonthIdx = parseStartMonth(startMonthName) ?? 6;

  for (let index = 0; index < monthlyCount; index += 1) {
    const monthIndex = (startMonthIdx + index) % 12;
    const yearOffset = Math.floor((startMonthIdx + index) / 12);
    const year = schoolYearStart + yearOffset;

    entries.push({
      key: `month-${index}`,
      type: 'monthly',
      label: `${MONTH_NAMES[monthIndex]} ${year}`,
      monthIndex,
      year,
      expectedAmount: monthlyAmount,
    });
  }

  return entries;
};

export async function GET(request, { params }) {
  try {
    await dbConnect();

    const { studentId } = await params;

    const resolvedStudent = await findStudentByIdentifier(studentId);

    if (!resolvedStudent) {
      return NextResponse.json({ success: false, error: 'Student not found.' }, { status: 404 });
    }

    const { student, isArchived } = resolvedStudent;

    const settings = await SystemSettings.findOne({ key: 'tuition-breakdown' });
    const tuitionPlans = normalizeTuitionPlans(settings?.tuitionPlans || []);

    const plan = getTuitionPlanForGrade(tuitionPlans, student.gradeLevel || '') || null;
    const planTotal = Number(plan?.totalBaseCost || 0);

    const schoolYear = settings?.currentSchoolYear || '';
    let schoolYearStart = new Date().getFullYear();
    if (typeof schoolYear === 'string' && schoolYear.includes('-')) {
      const parts = schoolYear.split('-').map(s => Number(s));
      if (parts.length === 2 && !Number.isNaN(parts[0])) schoolYearStart = parts[0];
    }

    const monthlyEntries = plan ? buildMonthlyEntries(plan, schoolYearStart) : [];
    const planBreakdown = [];

    if (plan && Number(plan.amountDueBeforeSchool || 0) > 0) {
      planBreakdown.push({
        key: 'before-school',
        type: 'before-school',
        label: 'Amount due before school start',
        expectedAmount: Number(plan.amountDueBeforeSchool || 0),
      });
    }

    planBreakdown.push(...monthlyEntries);

    if (planBreakdown.length === 0) {
      planBreakdown.push({
        key: 'unconfigured-plan',
        type: 'unconfigured',
        label: 'No tuition plan configured',
        expectedAmount: 0,
      });
    }

    // fetch payments for this student (completed payments are the only ones applied)
    const paymentIds = [String(student.learnersReferenceNumber || '')].filter(Boolean);

    if (isArchived) {
      paymentIds.push(String(student.sourceStudentId || student._id));
    } else {
      paymentIds.push(String(student._id));
    }

    const paymentQuery = { $or: paymentIds.map((value) => ({ studentId: value })) };

    const [activePayments, archivedPayments] = await Promise.all([
      Financial.find(paymentQuery).sort({ dateOfPayment: 1 }).lean(),
      ArchivedPayment.find(paymentQuery).sort({ dateOfPayment: 1 }).lean(),
    ]);

    const paymentsById = new Map();
    for (const payment of [...activePayments, ...archivedPayments]) {
      paymentsById.set(String(payment._id), payment);
    }

    const payments = [...paymentsById.values()].sort(
      (left, right) => new Date(left.dateOfPayment || 0) - new Date(right.dateOfPayment || 0)
    );

    const paymentBuckets = createPaymentBuckets(payments);
    const completedPaymentsTotal = paymentBuckets.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const allocatableTotal = Math.min(planTotal, completedPaymentsTotal);

    let remainingToAllocate = allocatableTotal;

    const breakdownItems = planBreakdown.map((item) => ({
      ...item,
      paidAmount: 0,
      status: 'unpaid',
      allocations: [],
    }));

    for (const item of breakdownItems) {
      if (remainingToAllocate <= 0) {
        break;
      }

      const allocation = allocateFromBuckets(Math.min(item.expectedAmount, remainingToAllocate), paymentBuckets);
      item.paidAmount = allocation.appliedAmount;
      item.allocations = allocation.allocations;
      remainingToAllocate -= allocation.appliedAmount;

      if (item.expectedAmount <= 0) {
        item.status = item.paidAmount > 0 ? 'paid' : 'no-plan';
      } else if (item.paidAmount >= item.expectedAmount) {
        item.status = 'paid';
      } else if (item.paidAmount > 0) {
        item.status = 'partial';
      } else {
        item.status = 'unpaid';
      }
    }

    // If a completed payment is outside the expected plan window, keep it visible by attaching leftovers to a matching payment month.
    const usedPaymentIds = new Set(
      breakdownItems.flatMap((item) =>
        item.allocations.flatMap((allocation) => [String(allocation.paymentId || ''), String(allocation.sourceRecordId || '')])
      ).filter(Boolean)
    );

    const overflowPayments = paymentBuckets.filter((payment) => !usedPaymentIds.has(String(payment._id)) && Number(payment.amount || 0) > 0);

    for (const payment of overflowPayments) {
      const dt = payment.dateOfPayment ? new Date(payment.dateOfPayment) : null;
      if (!dt || Number.isNaN(dt.getTime())) {
        continue;
      }

      const label = `${MONTH_NAMES[dt.getMonth()]} ${dt.getFullYear()}`;
      breakdownItems.push({
        key: `overflow-${payment._id}`,
        type: 'overflow',
        label,
        expectedAmount: 0,
        paidAmount: payment.amount,
        status: payment.amount > 0 ? 'paid' : 'unpaid',
        allocations: [
          {
            paymentId: payment.paymentId,
            sourceRecordId: payment._id,
            amount: payment.amount,
            dateOfPayment: payment.dateOfPayment,
            referenceNumber: payment.referenceNumber,
          },
        ],
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          student: {
            _id: student._id,
            firstName: student.firstName,
            lastName: student.lastName,
            learnersReferenceNumber: student.learnersReferenceNumber,
            gradeLevel: student.gradeLevel,
            remainingBalance: student.remainingBalance,
            archivedAt: isArchived ? student.archivedAt : undefined,
          },
          settings: {
            title: settings?.title || 'Tuition breakdown',
            amountDueBeforeSchool: Number(plan?.amountDueBeforeSchool || 0),
            monthlyPaymentCount: Number(plan?.monthlyPaymentCount || 0),
            monthlyPaymentAmount: Number(plan?.monthlyPaymentAmount || 0),
            monthlyPaymentMonths: String(plan?.monthlyPaymentMonths || '').trim(),
            totalEstimatedCost: planTotal,
            remainingBalanceDue: Number(plan?.remainingBalanceDue || 0),
          },
          breakdownItems,
          appliedFromBalance: allocatableTotal,
          completedPaymentsTotal,
          allocatableTotal,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
