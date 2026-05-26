import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';
import Student from '@/models/Student';
import Enrollment from '@/models/Enrollment';
import Financial from '@/models/Financial';
import Section from '@/models/Section';
import Schedule from '@/models/Schedule';
import ClassAssignment from '@/models/ClassAssignment';
import '@/models/Teachers';
import Curriculum from '@/models/Curriculum';
import ArchivedCurriculum from '@/models/ArchivedCurriculum';
import SystemSettings from '@/models/SystemSettings';
import ArchivedStudent from '@/models/ArchivedStudent';
import ArchivedEnrollment from '@/models/ArchivedEnrollment';
import ArchivedPayment from '@/models/ArchivedPayment';
import ArchivedReceipt from '@/models/ArchivedReceipt';
import ArchivedSection from '@/models/ArchivedSection';
import ArchivedSchedule from '@/models/ArchivedSchedule';
import ArchivedClassAssignment from '@/models/ArchivedClassAssignment';
import ArchivedGradeLevelCurriculum from '@/models/ArchivedGradeLevelCurriculum';
import GradeLevelCurriculum from '@/models/GradeLevelCurriculum';
import { calculateTotalFromTuitionPlans, getTuitionAmountForGrade, normalizeTuitionPlans } from '@/lib/tuition-settings';
import { getNextGradeLevel, isValidSchoolYear } from '@/lib/school-year';
import { ensureArchivedStudentIndexes } from '@/lib/student-archive';

const SETTINGS_KEY = 'tuition-breakdown';

const buildArchivedReceiptDocs = (payments = [], schoolYear, archivedAt) => {
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
        schoolYear,
        fileId: document.fileId,
        fileName: document.fileName,
        fileType: document.fileType,
        fileSize: document.fileSize,
        uploadedAt: document.uploadedAt || payment.dateOfPayment || new Date(),
        paymentDate: payment.dateOfPayment,
        archivedAt,
      });
    }
  }

  return receipts;
};

const buildArchivedPaymentDocs = (payments = [], students = [], schoolYear, archivedAt) => {
  const studentById = new Map();
  const studentByLrn = new Map();

  for (const student of students) {
    const studentName = `${student?.firstName || ''} ${student?.lastName || ''}`.trim();
    const studentId = String(student?._id || '');
    const learnersReferenceNumber = String(student?.learnersReferenceNumber || '');

    if (studentId) {
      studentById.set(studentId, { studentName, learnersReferenceNumber });
    }

    if (learnersReferenceNumber) {
      studentByLrn.set(learnersReferenceNumber, { studentName, learnersReferenceNumber });
    }
  }

  return payments.map((payment) => {
    const paymentStudentId = String(payment.studentId || '');
    const resolved = studentById.get(paymentStudentId) || studentByLrn.get(paymentStudentId) || { studentName: '', learnersReferenceNumber: '' };

    return {
      ...payment,
      schoolYear,
      studentName: resolved.studentName,
      learnersReferenceNumber: resolved.learnersReferenceNumber,
      archivedAt,
    };
  });
};

const archiveLeanDocs = (docs = [], schoolYear, archivedAt, archiveType) => docs.map((doc) => ({
  ...doc,
  schoolYear,
  ...(archiveType ? { archiveType } : {}),
  archivedAt,
}));

const archiveSectionDocs = (sections = [], schoolYear, archivedAt) => sections.map((section) => ({
  ...section,
  schoolYear,
  archivedAt,
}));

const archiveScheduleDocs = (schedules = [], schoolYear, archivedAt) => schedules.map((schedule) => ({
  ...schedule,
  schoolYear,
  archivedAt,
}));

const archiveClassAssignmentDocs = (assignments = [], schoolYear, archivedAt) => assignments.map((assignment) => ({
  ...assignment,
  schoolYear,
  archivedAt,
}));

const archiveGradeLevelCurriculumDocs = (assignments = [], schoolYear, archivedAt) => assignments.map((assignment) => ({
  ...assignment,
  schoolYear,
  school_year_id: String(assignment.school_year_id || schoolYear || '').trim(),
  archivedAt,
}));

const archiveCurriculumDocs = (curriculums = [], schoolYear, archivedAt) => curriculums.map((curriculum) => ({
  ...curriculum,
  schoolYear,
  archivedAt,
}));

const getDefaultTuitionAmount = (settings, gradeLevel) => {
  const tuitionPlans = normalizeTuitionPlans(settings.tuitionPlans || []);
  const defaultTotal = calculateTotalFromTuitionPlans(tuitionPlans);
  return getTuitionAmountForGrade(tuitionPlans, gradeLevel, defaultTotal);
};

const isPassingGwa = (gwa) => {
  const numericGwa = Number(gwa);
  return Number.isFinite(numericGwa) && numericGwa >= 75;
};

export async function rolloverSchoolYear(currentYearId, nextYearId, promotedStudentIds = []) {
  await dbConnect();
  await ensureArchivedStudentIndexes();

  const normalizedCurrentYear = String(currentYearId || '').trim();
  const normalizedNextYear = String(nextYearId || '').trim();

  if (!isValidSchoolYear(normalizedCurrentYear) || !isValidSchoolYear(normalizedNextYear)) {
    const error = new Error('School year must use YYYY-YYYY format with consecutive years.');
    error.statusCode = 400;
    throw error;
  }

  const session = await mongoose.startSession();

  try {
    let result = null;

    await session.withTransaction(async () => {
      const settings = await SystemSettings.findOne({ key: SETTINGS_KEY }).session(session);

      if (!settings) {
        const error = new Error('System settings not found.');
        error.statusCode = 404;
        throw error;
      }

      const archivedAt = new Date();
      const activeStudents = await Student.find({}).session(session).lean();
      const activeEnrollments = await Enrollment.find({ schoolYear: normalizedCurrentYear }).session(session).lean();
      const activeFinancials = await Financial.find({}).session(session).lean();
      const activeSections = await Section.find({ schoolYear: normalizedCurrentYear }).session(session).lean();

      const sectionIds = activeSections.map((section) => String(section._id));
      const activeAssignments = await ClassAssignment.find({ section: { $in: sectionIds } }).populate('section').populate('teacher').populate('schedule').session(session);
      const activeSchedules = await Schedule.find({ _id: { $in: activeAssignments.map((assignment) => assignment.schedule?._id).filter(Boolean) } }).session(session).lean();

      const activeGradeLevelCurriculums = await GradeLevelCurriculum.find({ school_year_id: normalizedCurrentYear }).session(session).lean();
      const gradeLevelAssignments = Array.isArray(activeGradeLevelCurriculums) && activeGradeLevelCurriculums.length > 0
        ? activeGradeLevelCurriculums
        : (Array.isArray(settings.gradeLevelCurriculums)
          ? settings.gradeLevelCurriculums.filter((assignment) => String(assignment.school_year_id || assignment.schoolYear || '').trim() === normalizedCurrentYear)
          : []);

      const archivedStudents = archiveLeanDocs(activeStudents, normalizedCurrentYear, archivedAt, 'rollover').map((student) => {
        const archivedStudent = {
          ...student,
          sourceStudentId: student._id,
        };

        delete archivedStudent._id;
        return archivedStudent;
      });
      const archivedEnrollments = archiveLeanDocs(activeEnrollments, normalizedCurrentYear, archivedAt);
      const archivedPayments = buildArchivedPaymentDocs(activeFinancials, activeStudents, normalizedCurrentYear, archivedAt);
      const archivedReceipts = buildArchivedReceiptDocs(activeFinancials, normalizedCurrentYear, archivedAt);
      const archivedSections = archiveSectionDocs(activeSections, normalizedCurrentYear, archivedAt);
      const archivedSchedules = archiveScheduleDocs(activeSchedules, normalizedCurrentYear, archivedAt);
      const archivedAssignments = archiveClassAssignmentDocs(activeAssignments.map((assignment) => assignment.toObject ? assignment.toObject() : assignment), normalizedCurrentYear, archivedAt);
      const archivedGradeLevelCurriculums = archiveGradeLevelCurriculumDocs(gradeLevelAssignments, normalizedCurrentYear, archivedAt);

      const activeCurriculums = await Curriculum.find({ schoolYear: normalizedCurrentYear }).session(session).lean();
      const legacyCurriculums = Array.isArray(settings.curriculums)
        ? settings.curriculums.filter((curriculum) => String(curriculum.schoolYear || '').trim() === normalizedCurrentYear)
        : [];
      const sourceCurriculums = activeCurriculums.length > 0 ? activeCurriculums : legacyCurriculums;
      const archivedCurriculums = archiveCurriculumDocs(sourceCurriculums, normalizedCurrentYear, archivedAt);
      const curriculumIdMap = new Map();
      const nextYearCurriculums = sourceCurriculums.map((curriculum) => {
        const nextCurriculumId = new mongoose.Types.ObjectId();
        curriculumIdMap.set(String(curriculum._id), nextCurriculumId);

        return {
          ...curriculum,
          _id: nextCurriculumId,
          schoolYear: normalizedNextYear,
          curriculum_id: String(curriculum.curriculum_id || `CUR-${Date.now()}`),
          createdAt: archivedAt,
          updatedAt: archivedAt,
        };
      });

      if (archivedStudents.length > 0) {
        await ArchivedStudent.insertMany(archivedStudents, { session });
      }

      if (archivedEnrollments.length > 0) {
        await ArchivedEnrollment.insertMany(archivedEnrollments, { session });
      }

      if (archivedPayments.length > 0) {
        await ArchivedPayment.insertMany(archivedPayments, { session });
      }

      if (archivedReceipts.length > 0) {
        await ArchivedReceipt.insertMany(archivedReceipts, { session });
      }

      if (archivedSections.length > 0) {
        await ArchivedSection.insertMany(archivedSections, { session });
      }

      if (archivedSchedules.length > 0) {
        await ArchivedSchedule.insertMany(archivedSchedules, { session });
      }

      if (archivedAssignments.length > 0) {
        await ArchivedClassAssignment.insertMany(archivedAssignments, { session });
      }

      if (archivedGradeLevelCurriculums.length > 0) {
        await ArchivedGradeLevelCurriculum.insertMany(archivedGradeLevelCurriculums, { session });
      }

      if (archivedCurriculums.length > 0) {
        await ArchivedCurriculum.insertMany(archivedCurriculums, { session });
      }

      if (nextYearCurriculums.length > 0) {
        await Curriculum.insertMany(nextYearCurriculums, { session });
      }

      const nextYearGradeLevelCurriculums = gradeLevelAssignments.map((assignment) => ({
        _id: new mongoose.Types.ObjectId(),
        gl_curriculum_id: `${String(assignment.gl_curriculum_id || 'GLC')}-${normalizedNextYear}`,
        school_year_id: normalizedNextYear,
        grade_level: assignment.grade_level,
        curriculum_id: curriculumIdMap.get(String(assignment.curriculum_id)) || assignment.curriculum_id,
        is_default: Boolean(assignment.is_default),
        createdAt: archivedAt,
        updatedAt: archivedAt,
      }));

      if (nextYearGradeLevelCurriculums.length > 0) {
        await GradeLevelCurriculum.insertMany(nextYearGradeLevelCurriculums, { session });
      }

      await Enrollment.deleteMany({ schoolYear: normalizedCurrentYear }).session(session);
      await Financial.deleteMany({}).session(session);
      await ClassAssignment.deleteMany({ section: { $in: sectionIds } }).session(session);
      await Schedule.deleteMany({ _id: { $in: activeAssignments.map((assignment) => assignment.schedule?._id).filter(Boolean) } }).session(session);
      await Section.deleteMany({ schoolYear: normalizedCurrentYear }).session(session);

      const tuitionPlans = normalizeTuitionPlans(settings.tuitionPlans || []);
      const defaultTotal = calculateTotalFromTuitionPlans(tuitionPlans);

      const promotedStudents = activeStudents.filter((student) => {
        const nextGradeLevel = getNextGradeLevel(student.gradeLevel);
        return Boolean(nextGradeLevel) && isPassingGwa(student.gwa);
      });
      const nextYearEnrollments = [];
      const graduatedStudentIds = [];

      for (const student of promotedStudents) {
        const nextGradeLevel = getNextGradeLevel(student.gradeLevel);

        if (!nextGradeLevel) {
          graduatedStudentIds.push(student._id);
          continue;
        }

        const nextEstimatedCost = getDefaultTuitionAmount(settings, nextGradeLevel) || defaultTotal;

        await Student.findByIdAndUpdate(
          student._id,
          {
            gradeLevel: nextGradeLevel,
            gwa: null,
            totalEstimatedCost: nextEstimatedCost,
            remainingBalance: nextEstimatedCost,
            sectionId: null,
          },
          { session, new: false }
        );

        nextYearEnrollments.push({
          enrollmentId: `E-${nextYearId.replace(/[^\d]/g, '')}-${String(student.learnersReferenceNumber || student._id).replace(/\D/g, '').slice(-6) || Date.now()}`,
          learnersReferenceNumber: String(student.learnersReferenceNumber || ''),
          sectionId: 'TBA',
          enrollmentDate: archivedAt,
          schoolYear: normalizedNextYear,
          status: 'Pending',
        });
      }

      settings.currentSchoolYear = normalizedNextYear;
      settings.curriculums = nextYearCurriculums;
      settings.gradeLevelCurriculums = nextYearGradeLevelCurriculums;
      await settings.save({ session });

      if (nextYearEnrollments.length > 0) {
        await Enrollment.insertMany(nextYearEnrollments, { session });
      }

      const nonPromotedStudentIds = activeStudents
        .filter((student) => !promotedStudents.some((promotedStudent) => String(promotedStudent._id) === String(student._id)))
        .map((student) => student._id);
      const studentIdsToRemove = [...nonPromotedStudentIds, ...graduatedStudentIds];

      if (studentIdsToRemove.length > 0) {
        await Student.deleteMany({ _id: { $in: studentIdsToRemove } }).session(session);
      }

      result = {
        currentYearId: normalizedCurrentYear,
        nextYearId: normalizedNextYear,
        promotedCount: promotedStudents.length,
        archivedStudentCount: archivedStudents.length,
        archivedEnrollmentCount: archivedEnrollments.length,
        archivedPaymentCount: archivedPayments.length,
        archivedReceiptCount: archivedReceipts.length,
        archivedSectionCount: archivedSections.length,
        archivedScheduleCount: archivedSchedules.length,
        archivedClassAssignmentCount: archivedAssignments.length,
        archivedCurriculumCount: archivedCurriculums.length,
        archivedGradeLevelCurriculumCount: archivedGradeLevelCurriculums.length,
        nextYearEnrollmentCount: nextYearEnrollments.length,
        nextYearCurriculumCount: nextYearCurriculums.length,
        nextYearGradeLevelCurriculumCount: nextYearGradeLevelCurriculums.length,
      };
    });

    return result;
  } finally {
    session.endSession();
  }
}
