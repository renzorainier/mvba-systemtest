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

export async function archiveStudent(identifier) {
  await dbConnect();

  const session = await mongoose.startSession();

  try {
    let result = null;

    await session.withTransaction(async () => {
      const settings = await SystemSettings.findOne({ key: SETTINGS_KEY }).session(session).lean();
      const schoolYear = String(settings?.currentSchoolYear || '').trim() || '2025-2026';
      const student = await findStudent(identifier);

      if (!student) {
        const error = new Error('Student not found.');
        error.statusCode = 404;
        throw error;
      }

      const existingArchived = await findArchivedStudent(identifier);
      if (existingArchived) {
        const studentId = String(student._id);
        const learnersReferenceNumber = String(student.learnersReferenceNumber || '');

        await ArchivedReceipt.deleteMany({
          $or: [{ studentId }, { studentId: learnersReferenceNumber }],
        }).session(session);
        await ArchivedPayment.deleteMany({
          $or: [{ studentId }, { studentId: learnersReferenceNumber }],
        }).session(session);
        await ArchivedEnrollment.deleteMany({ learnersReferenceNumber }).session(session);
        await ArchivedStudent.deleteMany({
          $or: [{ _id: student._id }, { learnersReferenceNumber }],
        }).session(session);
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
        _id: student._id,
        schoolYear,
        archivedAt,
      };

      const archivedEnrollmentDocs = enrollments.map((enrollment) => ({
        ...enrollment,
        _id: enrollment._id,
        archivedAt,
      }));

      const archivedPaymentDocs = payments.map((payment) => ({
        ...payment,
        _id: payment._id,
        schoolYear,
        archivedAt,
      }));

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

      const studentId = String(archivedStudent._id);
      const learnersReferenceNumber = String(archivedStudent.learnersReferenceNumber || '');

      const conflict = await Student.findOne({ learnersReferenceNumber }).session(session);
      if (conflict) {
        const error = new Error('An active student already exists with the same LRN.');
        error.statusCode = 409;
        throw error;
      }

      const archivedEnrollments = await ArchivedEnrollment.find({ learnersReferenceNumber }).session(session).lean();
      const archivedPayments = await ArchivedPayment.find({
        $or: [{ studentId }, { studentId: learnersReferenceNumber }],
      }).session(session).lean();
      const archivedReceipts = await ArchivedReceipt.find({
        $or: [{ studentId }, { studentId: learnersReferenceNumber }],
      }).session(session).lean();

      const restoredStudent = {
        ...archivedStudent,
        _id: archivedStudent._id,
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

      await ArchivedReceipt.deleteMany({
        $or: [{ studentId }, { studentId: learnersReferenceNumber }],
      }).session(session);
      await ArchivedPayment.deleteMany({
        $or: [{ studentId }, { studentId: learnersReferenceNumber }],
      }).session(session);
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

export async function listArchivedStudents(schoolYear) {
  await dbConnect();

  const normalizedSchoolYear = String(schoolYear || '').trim();
  const schoolYearFilter = normalizedSchoolYear ? { schoolYear: normalizedSchoolYear } : {};
  const students = await ArchivedStudent.find(schoolYearFilter).sort({ archivedAt: -1 }).lean();

  const results = await Promise.all(
    students.map(async (student) => {
      const studentSchoolYear = String(student.schoolYear || normalizedSchoolYear || '').trim();
      const [enrollmentCount, paymentCount, receiptCount] = await Promise.all([
        ArchivedEnrollment.countDocuments({
          learnersReferenceNumber: student.learnersReferenceNumber,
          ...(studentSchoolYear ? { schoolYear: studentSchoolYear } : {}),
        }),
        ArchivedPayment.countDocuments({
          $or: [{ studentId: String(student._id) }, { studentId: student.learnersReferenceNumber }],
          ...(studentSchoolYear ? { schoolYear: studentSchoolYear } : {}),
        }),
        ArchivedReceipt.countDocuments({
          $or: [{ studentId: String(student._id) }, { studentId: student.learnersReferenceNumber }],
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