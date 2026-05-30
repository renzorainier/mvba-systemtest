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

      await GradeLevelCurriculum.deleteMany({ school_year_id: normalizedCurrentYear }).session(session);

      if (archivedCurriculums.length > 0) {
        await ArchivedCurriculum.insertMany(archivedCurriculums, { session });
      }

      await Curriculum.deleteMany({ schoolYear: normalizedCurrentYear }).session(session);

      if (nextYearCurriculums.length > 0) {
        await Curriculum.insertMany(nextYearCurriculums, { session });
      }

      const nextYearGradeLevelCurriculums = gradeLevelAssignments.map((assignment) => ({
        _id: new mongoose.Types.ObjectId(),
        gl_curriculum_id: String(assignment.gl_curriculum_id || 'GLC').trim(),
        school_year_id: normalizedNextYear,
        grade_level: assignment.grade_level,
        curriculum_id: curriculumIdMap.get(String(assignment.curriculum_id)) || assignment.curriculum_id,
        is_default: Boolean(assignment.is_default),
        createdAt: archivedAt,
        updatedAt: archivedAt,
      }));

      const gradeLevelCurriculumIdMap = new Map(
        nextYearGradeLevelCurriculums.map((assignment, index) => {
          const sourceAssignment = gradeLevelAssignments[index] || {};
          const sourceKey = String(sourceAssignment._id || sourceAssignment.gl_curriculum_id || '').trim();
          return [sourceKey, assignment._id];
        }).filter(([sourceKey]) => Boolean(sourceKey))
      );

      const sectionIdMap = new Map();
      const nextYearSections = activeSections.map((section) => {
        const nextSectionId = new mongoose.Types.ObjectId();
        const sourceSectionObjectId = String(section._id || '').trim();

        if (sourceSectionObjectId) {
          sectionIdMap.set(sourceSectionObjectId, nextSectionId);
        }

        const sourceGlCurriculumId = String(section.glCurriculumId || '').trim();

        return {
          ...section,
          _id: nextSectionId,
          schoolYear: normalizedNextYear,
          glCurriculumId: gradeLevelCurriculumIdMap.get(sourceGlCurriculumId) || section.glCurriculumId,
        };
      });

      const scheduleIdMap = new Map();
      const nextYearSchedules = activeSchedules.map((schedule) => {
        const nextScheduleId = new mongoose.Types.ObjectId();
        const sourceScheduleObjectId = String(schedule._id || '').trim();

        if (sourceScheduleObjectId) {
          scheduleIdMap.set(sourceScheduleObjectId, nextScheduleId);
        }

        return {
          ...schedule,
          _id: nextScheduleId,
          createdAt: archivedAt,
        };
      });

      const nextYearClassAssignments = activeAssignments.map((assignment) => {
        const assignmentData = assignment.toObject ? assignment.toObject() : assignment;
        const sourceSectionObjectId = String(assignmentData.section?._id || assignmentData.section || '').trim();
        const sourceScheduleObjectId = String(assignmentData.schedule?._id || assignmentData.schedule || '').trim();

        return {
          _id: new mongoose.Types.ObjectId(),
          assignmentId: assignmentData.assignmentId,
          section: sectionIdMap.get(sourceSectionObjectId) || assignmentData.section?._id || assignmentData.section,
          teacher: assignmentData.teacher?._id || assignmentData.teacher,
          schedule: scheduleIdMap.get(sourceScheduleObjectId) || assignmentData.schedule?._id || assignmentData.schedule,
          createdAt: archivedAt,
          updatedAt: archivedAt,
        };
      });

      if (nextYearGradeLevelCurriculums.length > 0) {
        await GradeLevelCurriculum.insertMany(nextYearGradeLevelCurriculums, { session });
      }

      await Enrollment.deleteMany({ schoolYear: normalizedCurrentYear }).session(session);
      await Financial.deleteMany({}).session(session);
      await ClassAssignment.deleteMany({ section: { $in: sectionIds } }).session(session);
      await Schedule.deleteMany({ _id: { $in: activeAssignments.map((assignment) => assignment.schedule?._id).filter(Boolean) } }).session(session);
      await Section.deleteMany({ schoolYear: normalizedCurrentYear }).session(session);

      if (nextYearSections.length > 0) {
        await Section.insertMany(nextYearSections, { session });
      }

      if (nextYearSchedules.length > 0) {
        await Schedule.insertMany(nextYearSchedules, { session });
      }

      if (nextYearClassAssignments.length > 0) {
        await ClassAssignment.insertMany(nextYearClassAssignments, { session });
      }

      const tuitionPlans = normalizeTuitionPlans(settings.tuitionPlans || []);
      const defaultTotal = calculateTotalFromTuitionPlans(tuitionPlans);

      const promotedStudents = activeStudents.filter((student) => {
        const nextGradeLevel = getNextGradeLevel(student.gradeLevel);
        return Boolean(nextGradeLevel) && isPassingGwa(student.gwa);
      });
      const failedStudents = activeStudents.filter((student) => !isPassingGwa(student.gwa));
      const nextYearEnrollments = [];
      const graduatedStudentIds = [];

      for (const student of promotedStudents) {
        const nextGradeLevel = getNextGradeLevel(student.gradeLevel);
        const nextLearnersReferenceNumber = nextGradeLevel === 'Kinder 2'
          ? 'TBA'
          : String(student.learnersReferenceNumber || '');

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
            learnersReferenceNumber: nextLearnersReferenceNumber,
            totalEstimatedCost: nextEstimatedCost,
            remainingBalance: nextEstimatedCost,
            sectionId: null,
          },
          { session, new: false }
        );

        const enrollmentReferenceSeed = nextLearnersReferenceNumber === 'TBA'
          ? String(student._id)
          : String(student.learnersReferenceNumber || student._id);

        nextYearEnrollments.push({
          enrollmentId: `E-${nextYearId.replace(/[^\d]/g, '')}-${enrollmentReferenceSeed.replace(/\D/g, '').slice(-6) || Date.now()}`,
          learnersReferenceNumber: nextLearnersReferenceNumber,
          studentId: String(student._id),
          sectionId: 'TBA',
          enrollmentDate: archivedAt,
          schoolYear: normalizedNextYear,
          status: 'Pending',
        });
      }

      for (const student of failedStudents) {
        const failedGradeLevel = String(student.gradeLevel || '').trim();

        if (!failedGradeLevel) {
          continue;
        }

        const failedEstimatedCost = getDefaultTuitionAmount(settings, failedGradeLevel) || defaultTotal;

        await Student.findByIdAndUpdate(
          student._id,
          {
            gradeLevel: failedGradeLevel,
            gwa: null,
            learnersReferenceNumber: String(student.learnersReferenceNumber || ''),
            totalEstimatedCost: failedEstimatedCost,
            remainingBalance: failedEstimatedCost,
            sectionId: null,
          },
          { session, new: false }
        );

        const enrollmentReferenceSeed = String(student.learnersReferenceNumber || student._id);

        nextYearEnrollments.push({
          enrollmentId: `E-${nextYearId.replace(/[^\d]/g, '')}-${enrollmentReferenceSeed.replace(/\D/g, '').slice(-6) || Date.now()}`,
          learnersReferenceNumber: String(student.learnersReferenceNumber || ''),
          studentId: String(student._id),
          sectionId: 'TBA',
          enrollmentDate: archivedAt,
          schoolYear: normalizedNextYear,
          status: 'Failed',
        });
      }

      settings.currentSchoolYear = normalizedNextYear;
      settings.curriculums = nextYearCurriculums;
      settings.gradeLevelCurriculums = nextYearGradeLevelCurriculums;
      await settings.save({ session });

      if (nextYearEnrollments.length > 0) {
        await Enrollment.insertMany(nextYearEnrollments, { session });
      }

      const studentIdsToRemove = [...graduatedStudentIds];

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
        nextYearSectionCount: nextYearSections.length,
        nextYearScheduleCount: nextYearSchedules.length,
        nextYearClassAssignmentCount: nextYearClassAssignments.length,
      };
    });

    return result;
  } finally {
    session.endSession();
  }
}

// Activate a prepared draft school year ("Execute Roll Over"):
//   1. Archive the active (current) year into the Archived* collections (read-only history).
//   2. Migrate student progression into the draft: passing students advance a grade, failing
//      students repeat, Grade 6 passers graduate (archived + removed). Migrated students are
//      re-tagged to the draft year and given a fresh enrollment unless the draft already has one.
//   3. Drop the active year's live ancillary data (enrollments, financials, sections, schedules,
//      class assignments, curricula). The draft's own pre-configured data — already tagged with
//      the draft year — becomes the new active data once the pointers are flipped.
//   4. Set currentSchoolYear = draft year and clear draftSchoolYear.
export async function activateDraftSchoolYear() {
  await dbConnect();
  await ensureArchivedStudentIndexes();

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

      const currentYear = String(settings.currentSchoolYear || '').trim();
      const draftRaw = settings.draftSchoolYear ? String(settings.draftSchoolYear).trim() : '';
      const draftYear = draftRaw && draftRaw !== currentYear && isValidSchoolYear(draftRaw) ? draftRaw : '';

      if (!draftYear) {
        const error = new Error('There is no valid draft school year to activate.');
        error.statusCode = 400;
        throw error;
      }

      if (!isValidSchoolYear(currentYear)) {
        const error = new Error('The current school year is invalid.');
        error.statusCode = 400;
        throw error;
      }

      const archivedAt = new Date();
      // Active-year live rows include legacy untagged rows for the collections that gained a
      // schoolYear field later (Student, Financial, Schedule, ClassAssignment).
      const activeLiveFilter = { $or: [{ schoolYear: currentYear }, { schoolYear: { $exists: false } }, { schoolYear: null }] };

      // ---- Gather the active (ending) year ----
      const activeStudents = await Student.find(activeLiveFilter).session(session).lean();
      const activeEnrollments = await Enrollment.find({ schoolYear: currentYear }).session(session).lean();
      const activeFinancials = await Financial.find(activeLiveFilter).session(session).lean();
      const activeSections = await Section.find({ schoolYear: currentYear }).session(session).lean();
      const sectionIds = activeSections.map((section) => String(section._id));
      const activeAssignmentFilter = { $or: [{ section: { $in: sectionIds } }, { schoolYear: currentYear }] };
      const activeAssignments = await ClassAssignment.find(activeAssignmentFilter)
        .populate('section')
        .populate('teacher')
        .populate('schedule')
        .session(session);
      const activeSchedules = await Schedule.find(activeLiveFilter).session(session).lean();
      const activeCurriculums = await Curriculum.find({ schoolYear: currentYear }).session(session).lean();
      const activeGradeLevelCurriculums = await GradeLevelCurriculum.find({ school_year_id: currentYear }).session(session).lean();

      // ---- Archive the active year ----
      const archivedStudents = archiveLeanDocs(activeStudents, currentYear, archivedAt, 'rollover').map((student) => {
        const archivedStudent = { ...student, sourceStudentId: student._id };
        delete archivedStudent._id;
        return archivedStudent;
      });
      const archivedEnrollments = archiveLeanDocs(activeEnrollments, currentYear, archivedAt);
      const archivedPayments = buildArchivedPaymentDocs(activeFinancials, activeStudents, currentYear, archivedAt);
      const archivedReceipts = buildArchivedReceiptDocs(activeFinancials, currentYear, archivedAt);
      const archivedSections = archiveSectionDocs(activeSections, currentYear, archivedAt);
      const archivedSchedules = archiveScheduleDocs(activeSchedules, currentYear, archivedAt);
      const archivedAssignments = archiveClassAssignmentDocs(
        activeAssignments.map((assignment) => (assignment.toObject ? assignment.toObject() : assignment)),
        currentYear,
        archivedAt
      );
      const archivedCurriculums = archiveCurriculumDocs(activeCurriculums, currentYear, archivedAt);
      const archivedGradeLevelCurriculums = archiveGradeLevelCurriculumDocs(activeGradeLevelCurriculums, currentYear, archivedAt);

      if (archivedStudents.length > 0) await ArchivedStudent.insertMany(archivedStudents, { session });
      if (archivedEnrollments.length > 0) await ArchivedEnrollment.insertMany(archivedEnrollments, { session });
      if (archivedPayments.length > 0) await ArchivedPayment.insertMany(archivedPayments, { session });
      if (archivedReceipts.length > 0) await ArchivedReceipt.insertMany(archivedReceipts, { session });
      if (archivedSections.length > 0) await ArchivedSection.insertMany(archivedSections, { session });
      if (archivedSchedules.length > 0) await ArchivedSchedule.insertMany(archivedSchedules, { session });
      if (archivedAssignments.length > 0) await ArchivedClassAssignment.insertMany(archivedAssignments, { session });
      if (archivedCurriculums.length > 0) await ArchivedCurriculum.insertMany(archivedCurriculums, { session });
      if (archivedGradeLevelCurriculums.length > 0) await ArchivedGradeLevelCurriculum.insertMany(archivedGradeLevelCurriculums, { session });

      // ---- Migrate student progression into the draft year ----
      const tuitionPlans = normalizeTuitionPlans(settings.tuitionPlans || []);
      const defaultTotal = calculateTotalFromTuitionPlans(tuitionPlans);

      const draftStudents = await Student.find({ schoolYear: draftYear }).session(session).lean();
      const draftLrns = new Set(
        draftStudents.map((student) => String(student.learnersReferenceNumber || '')).filter((lrn) => lrn && lrn !== 'TBA')
      );
      const draftEnrolledStudentIds = new Set(
        (await Enrollment.find({ schoolYear: draftYear }, { studentId: 1 }).session(session).lean()).map((enrollment) => String(enrollment.studentId || ''))
      );

      const continuingUpdates = [];
      const newEnrollments = [];
      const removeStudentIds = [];
      let promotedCount = 0;
      let failedCount = 0;
      let graduatedCount = 0;
      let conflictCount = 0;

      for (const student of activeStudents) {
        const passing = isPassingGwa(student.gwa);
        const nextGrade = getNextGradeLevel(student.gradeLevel);
        const lrn = String(student.learnersReferenceNumber || '');

        // Grade 6 (or top-level) passer: graduate — archived above, removed from live.
        if (passing && !nextGrade) {
          removeStudentIds.push(student._id);
          graduatedCount += 1;
          continue;
        }

        // Conflict: the draft already has a student with this LRN (pre-configured). The draft
        // version wins; the active record is kept only as history (already archived).
        if (lrn && lrn !== 'TBA' && draftLrns.has(lrn)) {
          removeStudentIds.push(student._id);
          conflictCount += 1;
          continue;
        }

        const targetGrade = passing ? nextGrade : String(student.gradeLevel || '').trim();

        if (!targetGrade) {
          // No grade to place the student in — leave the archived copy and remove the live row.
          removeStudentIds.push(student._id);
          continue;
        }

        const estimatedCost = getDefaultTuitionAmount(settings, targetGrade) || defaultTotal;
        const nextLrn = targetGrade === 'Kinder 2' ? 'TBA' : lrn;

        continuingUpdates.push({
          updateOne: {
            filter: { _id: student._id },
            update: {
              $set: {
                gradeLevel: targetGrade,
                gwa: null,
                learnersReferenceNumber: nextLrn,
                totalEstimatedCost: estimatedCost,
                remainingBalance: estimatedCost,
                sectionId: null,
                schoolYear: draftYear,
              },
            },
          },
        });

        if (passing) {
          promotedCount += 1;
        } else {
          failedCount += 1;
        }

        if (!draftEnrolledStudentIds.has(String(student._id))) {
          const enrollmentSeed = nextLrn === 'TBA' ? String(student._id) : lrn || String(student._id);
          newEnrollments.push({
            enrollmentId: `E-${draftYear.replace(/[^\d]/g, '')}-${enrollmentSeed.replace(/\D/g, '').slice(-6) || Date.now()}`,
            learnersReferenceNumber: nextLrn,
            studentId: String(student._id),
            sectionId: 'TBA',
            enrollmentDate: archivedAt,
            schoolYear: draftYear,
            status: passing ? 'Pending' : 'Failed',
          });
        }
      }

      if (continuingUpdates.length > 0) await Student.bulkWrite(continuingUpdates, { session });
      if (removeStudentIds.length > 0) await Student.deleteMany({ _id: { $in: removeStudentIds } }).session(session);
      if (newEnrollments.length > 0) await Enrollment.insertMany(newEnrollments, { session });

      // ---- Remove the active year's live ancillary data (now archived) ----
      await Enrollment.deleteMany({ schoolYear: currentYear }).session(session);
      await Financial.deleteMany(activeLiveFilter).session(session);
      await ClassAssignment.deleteMany(activeAssignmentFilter).session(session);
      await Schedule.deleteMany(activeLiveFilter).session(session);
      await Section.deleteMany({ schoolYear: currentYear }).session(session);
      await Curriculum.deleteMany({ schoolYear: currentYear }).session(session);
      await GradeLevelCurriculum.deleteMany({ school_year_id: currentYear }).session(session);

      // ---- Flip the pointers: the draft is now the active year ----
      const draftCurriculums = await Curriculum.find({ schoolYear: draftYear }).session(session).lean();
      const draftGradeLevelCurriculums = await GradeLevelCurriculum.find({ school_year_id: draftYear }).session(session).lean();

      settings.currentSchoolYear = draftYear;
      settings.draftSchoolYear = null;
      // Keep the legacy settings arrays in sync with the new active year's DB curricula so
      // stale active-year curricula can't leak through the settings fallback.
      settings.curriculums = draftCurriculums;
      settings.gradeLevelCurriculums = draftGradeLevelCurriculums;
      await settings.save({ session });

      result = {
        previousSchoolYear: currentYear,
        activatedSchoolYear: draftYear,
        archivedStudentCount: archivedStudents.length,
        archivedEnrollmentCount: archivedEnrollments.length,
        archivedPaymentCount: archivedPayments.length,
        archivedSectionCount: archivedSections.length,
        archivedScheduleCount: archivedSchedules.length,
        archivedClassAssignmentCount: archivedAssignments.length,
        archivedCurriculumCount: archivedCurriculums.length,
        promotedCount,
        failedCount,
        graduatedCount,
        conflictCount,
        migratedEnrollmentCount: newEnrollments.length,
        draftStudentCount: draftStudents.length,
      };
    });

    return result;
  } finally {
    session.endSession();
  }
}
