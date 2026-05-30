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

  const session = await mongoose.startSession();

  try {
    let result = null;

    await session.withTransaction(async () => {
      const settings = await SystemSettings.findOne({ key: SETTINGS_KEY }).session(session).lean();
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
      }).session(session);
      if (existingArchived) {
        const error = new Error('Student is already archived.');
        error.statusCode = 409;
        throw error;
      }

      const studentId = String(student._id);
      const learnersReferenceNumber = String(student.learnersReferenceNumber || '');

      const enrollments = await Enrollment.find({ learnersReferenceNumber }).session(session).lean();
      const payments = await Financial.find({
        $or: [{ studentId }, { studentId: learnersReferenceNumber }],
      }).session(session).lean();

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

      if (archivedStudentDoc) {
        await ArchivedStudent.create([archivedStudentDoc], { session });
      }

      if (archivedEnrollmentDocs.length > 0) {
        await ArchivedEnrollment.insertMany(archivedEnrollmentDocs, { session });
      }

      if (archivedPaymentDocs.length > 0) {
        await ArchivedPayment.insertMany(archivedPaymentDocs, { session });
      }

      if (archivedReceiptDocs.length > 0) {
        await ArchivedReceipt.insertMany(archivedReceiptDocs, { session });
      }

      await Enrollment.deleteMany({ learnersReferenceNumber }).session(session);
      await Financial.deleteMany({ $or: [{ studentId }, { studentId: learnersReferenceNumber }] }).session(session);
      await Student.deleteOne({ _id: student._id }).session(session);

      result = {
        student: archivedStudentDoc,
        enrollmentsArchived: archivedEnrollmentDocs.length,
        paymentsArchived: archivedPaymentDocs.length,
        receiptsArchived: archivedReceiptDocs.length,
      };
    });

    return result;
  } finally {
    session.endSession();
  }
}

export async function restoreStudent(identifier) {
  await dbConnect();
  await ensureArchivedStudentIndexes();

  const session = await mongoose.startSession();

  try {
    let result = null;

    await session.withTransaction(async () => {
      const archivedStudent = await findArchivedStudent(identifier);

      if (!archivedStudent) {
        const error = new Error('Archived student not found.');
        error.statusCode = 404;
        throw error;
      }

      const learnersReferenceNumber = String(archivedStudent.learnersReferenceNumber || '');
      const paymentFilters = buildPaymentIdentityFilters(archivedStudent);

      const conflict = await Student.findOne({ learnersReferenceNumber }).session(session);
      if (conflict) {
        const error = new Error('An active student already exists with the same LRN.');
        error.statusCode = 409;
        throw error;
      }

      const archivedEnrollments = await ArchivedEnrollment.find({ learnersReferenceNumber }).session(session).lean();
      const archivedPayments = paymentFilters.length > 0
        ? await ArchivedPayment.find({ $or: paymentFilters }).session(session).lean()
        : [];
      const archivedReceipts = paymentFilters.length > 0
        ? await ArchivedReceipt.find({ $or: paymentFilters }).session(session).lean()
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

      if (restoredStudent) {
        delete restoredStudent.archivedAt;
        await Student.create([restoredStudent], { session });
      }

      if (restoredEnrollments.length > 0) {
        restoredEnrollments.forEach((enrollment) => delete enrollment.archivedAt);
        await Enrollment.insertMany(restoredEnrollments, { session });
      }

      if (restoredPayments.length > 0) {
        restoredPayments.forEach((payment) => delete payment.archivedAt);
        await Financial.insertMany(restoredPayments, { session });
      }

      if (paymentFilters.length > 0) {
        await ArchivedReceipt.deleteMany({ $or: paymentFilters }).session(session);
        await ArchivedPayment.deleteMany({ $or: paymentFilters }).session(session);
      }
      await ArchivedEnrollment.deleteMany({ learnersReferenceNumber }).session(session);
      await ArchivedStudent.deleteOne({ _id: archivedStudent._id }).session(session);

      result = {
        student: restoredStudent,
        enrollmentsRestored: restoredEnrollments.length,
        paymentsRestored: restoredPayments.length,
        receiptsRestored: archivedReceipts.length,
      };
    });

    return result;
  } finally {
    session.endSession();
  }
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