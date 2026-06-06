import dbConnect from '@/lib/mongodb';
import Student from '@/models/Student';
import Enrollment from '@/models/Enrollment';
import Financial from '@/models/Financial';
import SystemSettings from '@/models/SystemSettings';
import ArchivedStudent from '@/models/ArchivedStudent';
import ArchivedEnrollment from '@/models/ArchivedEnrollment';
import ArchivedPayment from '@/models/ArchivedPayment';
import ArchivedReceipt from '@/models/ArchivedReceipt';
import mongoose from 'mongoose';

const SETTINGS_KEY = 'tuition-breakdown';

let archivedStudentIndexesEnsured = false;

export const ensureArchivedStudentIndexes = async () => {
  if (archivedStudentIndexesEnsured) {
    return;
  }

  const collection = ArchivedStudent.collection;
  const indexes = await collection.indexes().catch(() => []);

  if (indexes.some((index) => index.name === 'learnersReferenceNumber_1')) {
    await collection.dropIndex('learnersReferenceNumber_1').catch(() => {});
  }

  await collection.createIndex(
    { sourceStudentId: 1, schoolYear: 1 },
    {
      unique: true,
      partialFilterExpression: {
        sourceStudentId: { $exists: true, $ne: null },
        schoolYear: { $exists: true, $ne: null },
      },
      name: 'sourceStudentId_1_schoolYear_1',
    }
  ).catch(() => {});

  archivedStudentIndexesEnsured = true;
};

const findStudent = async (identifier) => {
  const query = [{ learnersReferenceNumber: String(identifier) }];

  if (mongoose.Types.ObjectId.isValid(identifier)) {
    query.push({ _id: identifier });
  }

  return Student.findOne({ $or: query }).lean();
};

const findArchivedStudent = async (identifier) => {
  const query = [{ learnersReferenceNumber: String(identifier) }];

  if (mongoose.Types.ObjectId.isValid(identifier)) {
    query.push({ _id: identifier });
    query.push({ sourceStudentId: identifier });
  }

  return ArchivedStudent.findOne({ $or: query }).sort({ archivedAt: -1 }).lean();
};

const buildArchivedReceipts = (payments = []) => {
  const receipts = [];

  for (const payment of payments) {
    for (const document of payment.documents || []) {
      if (!document?.fileId) {
        continue;
      }

      receipts.push({
        archivedPaymentId: String(payment._id),
        paymentId: String(payment.paymentId || ''),
        studentId: String(payment.studentId || ''),
        fileId: document.fileId,
        fileName: document.fileName,
        fileType: document.fileType,
        fileSize: document.fileSize,
        uploadedAt: document.uploadedAt || payment.dateOfPayment || new Date(),
        paymentDate: payment.dateOfPayment,
        archivedAt: new Date(),
      });
    }
  }

  return receipts;
};

const buildArchivedPayments = (payments = [], student, schoolYear, archivedAt) => {
  const studentName = `${student?.firstName || ''} ${student?.lastName || ''}`.trim();
  const learnersReferenceNumber = String(student?.learnersReferenceNumber || '');

  return payments.map((payment) => ({
    ...payment,
    _id: payment._id,
    schoolYear,
    studentName,
    learnersReferenceNumber,
    archivedAt,
  }));
};

const buildPaymentIdentityFilters = (archivedStudent) => {
  const filters = [];
  const archivedStudentId = String(archivedStudent?._id || '');
  const sourceStudentId = String(archivedStudent?.sourceStudentId || '');
  const learnersReferenceNumber = String(archivedStudent?.learnersReferenceNumber || '');

  if (archivedStudentId) {
    filters.push({ studentId: archivedStudentId });
  }

  if (sourceStudentId) {
    filters.push({ studentId: sourceStudentId });
  }

  if (learnersReferenceNumber) {
    filters.push({ studentId: learnersReferenceNumber });
  }

  return filters;
};

export async function archiveStudent(identifier, selectedSchoolYear) {
  await dbConnect();
  await ensureArchivedStudentIndexes();

  const settings = await SystemSettings.findOne({ key: SETTINGS_KEY }).lean();
  const activeSchoolYear = String(settings?.currentSchoolYear || '').trim() || '2025-2026';
  const schoolYear = String(selectedSchoolYear || '').trim() || activeSchoolYear;
  const student = await findStudent(identifier);

  if (!student) {
    const error = new Error('Student not found.');
    error.statusCode = 404;
    throw error;
  }

  const existingArchived = await ArchivedStudent.findOne({
    sourceStudentId: student._id,
    schoolYear,
    archiveType: 'manual',
  });
  if (existingArchived) {
    const error = new Error('Student is already archived.');
    error.statusCode = 409;
    throw error;
  }

  const studentId = String(student._id);
  const learnersReferenceNumber = String(student.learnersReferenceNumber || '');

  const enrollments = await Enrollment.find({ learnersReferenceNumber }).lean();
  const payments = await Financial.find({
    $or: [{ studentId }, { studentId: learnersReferenceNumber }],
  }).lean();

  const archivedAt = new Date();
  const archivedStudentDoc = {
    ...student,
    sourceStudentId: student._id,
    schoolYear,
    archiveType: 'manual',
    archivedAt,
  };

  delete archivedStudentDoc._id;

  const archivedEnrollmentDocs = enrollments.map((enrollment) => ({
    ...enrollment,
    _id: enrollment._id,
    archivedAt,
  }));

  const archivedPaymentDocs = buildArchivedPayments(payments, student, schoolYear, archivedAt);

  const archivedReceiptDocs = buildArchivedReceipts(archivedPaymentDocs).map((receipt) => ({
    ...receipt,
    schoolYear,
  }));

  // Writes first so a failure before the deletes never loses data.
  await ArchivedStudent.create([archivedStudentDoc]);

  if (archivedEnrollmentDocs.length > 0) {
    await ArchivedEnrollment.insertMany(archivedEnrollmentDocs);
  }

  if (archivedPaymentDocs.length > 0) {
    await ArchivedPayment.insertMany(archivedPaymentDocs);
  }

  if (archivedReceiptDocs.length > 0) {
    await ArchivedReceipt.insertMany(archivedReceiptDocs);
  }

  await Enrollment.deleteMany({ learnersReferenceNumber });
  // Keep financial records in the live collection even after the student is archived.
  // Stamp identifying fields so each payment still resolves a name once the Student
  // document is removed below.
  const studentName = `${student.firstName || ''} ${student.lastName || ''}`.trim();
  await Financial.updateMany(
    { $or: [{ studentId }, { studentId: learnersReferenceNumber }] },
    { $set: { studentName, learnersReferenceNumber } }
  );
  await Student.deleteOne({ _id: student._id });

  return {
    student: archivedStudentDoc,
    enrollmentsArchived: archivedEnrollmentDocs.length,
    paymentsArchived: archivedPaymentDocs.length,
    receiptsArchived: archivedReceiptDocs.length,
  };
}

export async function restoreStudent(identifier) {
  await dbConnect();
  await ensureArchivedStudentIndexes();

  const archivedStudent = await findArchivedStudent(identifier);

  if (!archivedStudent) {
    const error = new Error('Archived student not found.');
    error.statusCode = 404;
    throw error;
  }

  const learnersReferenceNumber = String(archivedStudent.learnersReferenceNumber || '');
  const paymentFilters = buildPaymentIdentityFilters(archivedStudent);

  const conflict = await Student.findOne({ learnersReferenceNumber });
  if (conflict) {
    const error = new Error('An active student already exists with the same LRN.');
    error.statusCode = 409;
    throw error;
  }

  const archivedEnrollments = await ArchivedEnrollment.find({ learnersReferenceNumber }).lean();
  const archivedPayments = paymentFilters.length > 0
    ? await ArchivedPayment.find({ $or: paymentFilters }).lean()
    : [];
  const archivedReceipts = paymentFilters.length > 0
    ? await ArchivedReceipt.find({ $or: paymentFilters }).lean()
    : [];

  const restoredStudent = {
    ...archivedStudent,
    _id: archivedStudent.sourceStudentId || archivedStudent._id,
  };

  const restoredEnrollments = archivedEnrollments.map((enrollment) => ({
    ...enrollment,
    _id: enrollment._id,
  }));

  const restoredPayments = archivedPayments.map((payment) => ({
    ...payment,
    _id: payment._id,
  }));

  // Writes first so a failure before the deletes never loses data.
  delete restoredStudent.archivedAt;
  await Student.create([restoredStudent]);

  if (restoredEnrollments.length > 0) {
    restoredEnrollments.forEach((enrollment) => delete enrollment.archivedAt);
    await Enrollment.insertMany(restoredEnrollments);
  }

  if (restoredPayments.length > 0) {
    // Financials are kept live through archiving, so the records normally already
    // exist. Only re-insert ones that are missing (e.g. students archived before
    // this behavior, whose financials were deleted) to avoid duplicate-key errors.
    const existing = await Financial.find(
      { _id: { $in: restoredPayments.map((payment) => payment._id) } },
      { _id: 1 }
    ).lean();
    const existingIds = new Set(existing.map((doc) => String(doc._id)));
    const toInsert = restoredPayments.filter((payment) => !existingIds.has(String(payment._id)));
    if (toInsert.length > 0) {
      toInsert.forEach((payment) => delete payment.archivedAt);
      await Financial.insertMany(toInsert);
    }
  }

  if (paymentFilters.length > 0) {
    await ArchivedReceipt.deleteMany({ $or: paymentFilters });
    await ArchivedPayment.deleteMany({ $or: paymentFilters });
  }
  await ArchivedEnrollment.deleteMany({ learnersReferenceNumber });
  await ArchivedStudent.deleteOne({ _id: archivedStudent._id });

  return {
    student: restoredStudent,
    enrollmentsRestored: restoredEnrollments.length,
    paymentsRestored: restoredPayments.length,
    receiptsRestored: archivedReceipts.length,
  };
}

export async function listArchivedStudents(schoolYear, options = {}) {
  await dbConnect();
  await ensureArchivedStudentIndexes();

  const { isHistorical = false } = options;
  const normalizedSchoolYear = String(schoolYear || '').trim();
  const schoolYearFilter = normalizedSchoolYear ? { schoolYear: normalizedSchoolYear } : {};
  const archiveTypeFilter = isHistorical
    ? { archiveType: 'manual' }
    : { $or: [{ archiveType: 'manual' }, { archiveType: { $exists: false } }] };
  const students = await ArchivedStudent.find({ ...schoolYearFilter, ...archiveTypeFilter }).sort({ archivedAt: -1 }).lean();

  const results = await Promise.all(
    students.map(async (student) => {
      const studentSchoolYear = String(student.schoolYear || normalizedSchoolYear || '').trim();
      const paymentFilters = buildPaymentIdentityFilters(student);
      const [enrollmentCount, paymentCount, receiptCount] = await Promise.all([
        ArchivedEnrollment.countDocuments({
          learnersReferenceNumber: student.learnersReferenceNumber,
          ...(studentSchoolYear ? { schoolYear: studentSchoolYear } : {}),
        }),
        ArchivedPayment.countDocuments({
          ...(paymentFilters.length > 0 ? { $or: paymentFilters } : {}),
          ...(studentSchoolYear ? { schoolYear: studentSchoolYear } : {}),
        }),
        ArchivedReceipt.countDocuments({
          ...(paymentFilters.length > 0 ? { $or: paymentFilters } : {}),
          ...(studentSchoolYear ? { schoolYear: studentSchoolYear } : {}),
        }),
      ]);

      return {
        ...student,
        enrollmentCount,
        paymentCount,
        receiptCount,
      };
    })
  );

  return results;
}