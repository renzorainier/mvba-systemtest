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
import { isResolvableLrn } from '@/lib/student-identifiers';

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

    // 'TBA' is shared by many students, so it must not be a lookup key — match by id instead.
    if (isResolvableLrn(learnersReferenceNumber)) {
      studentByLrn.set(learnersReferenceNumber, { studentName, learnersReferenceNumber });
    }
  }

  return payments.map((payment) => {
    const paymentStudentId = String(payment.studentId || '');
    const resolved = studentById.get(paymentStudentId)
      || (isResolvableLrn(paymentStudentId) ? studentByLrn.get(paymentStudentId) : undefined)
      || { studentName: '', learnersReferenceNumber: '' };

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

  const settings = await SystemSettings.findOne({ key: SETTINGS_KEY });

  if (!settings) {
    const error = new Error('System settings not found.');
    error.statusCode = 404;
    throw error;
  }

  const archivedAt = new Date();
  const activeStudents = await Student.find({}).lean();
  const activeEnrollments = await Enrollment.find({ schoolYear: normalizedCurrentYear }).lean();
  const activeFinancials = await Financial.find({}).lean();
  const activeSections = await Section.find({ schoolYear: normalizedCurrentYear }).lean();

  const sectionIds = activeSections.map((section) => String(section._id));
  const activeAssignments = await ClassAssignment.find({ section: { $in: sectionIds } }).populate('section').populate('teacher').populate('schedule');
  const activeSchedules = await Schedule.find({ _id: { $in: activeAssignments.map((assignment) => assignment.schedule?._id).filter(Boolean) } }).lean();

  const gradeLevelAssignments = await GradeLevelCurriculum.find({ school_year_id: normalizedCurrentYear }).lean();

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

  const sourceCurriculums = await Curriculum.find({ schoolYear: normalizedCurrentYear }).lean();
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

  // Writes first — archived copies exist before any active data is deleted.
  if (archivedStudents.length > 0) await ArchivedStudent.insertMany(archivedStudents);
  if (archivedEnrollments.length > 0) await ArchivedEnrollment.insertMany(archivedEnrollments);
  if (archivedPayments.length > 0) await ArchivedPayment.insertMany(archivedPayments);
  if (archivedReceipts.length > 0) await ArchivedReceipt.insertMany(archivedReceipts);
  if (archivedSections.length > 0) await ArchivedSection.insertMany(archivedSections);
  if (archivedSchedules.length > 0) await ArchivedSchedule.insertMany(archivedSchedules);
  if (archivedAssignments.length > 0) await ArchivedClassAssignment.insertMany(archivedAssignments);
  if (archivedGradeLevelCurriculums.length > 0) await ArchivedGradeLevelCurriculum.insertMany(archivedGradeLevelCurriculums);
  if (archivedCurriculums.length > 0) await ArchivedCurriculum.insertMany(archivedCurriculums);

  await GradeLevelCurriculum.deleteMany({ school_year_id: normalizedCurrentYear });
  await Curriculum.deleteMany({ schoolYear: normalizedCurrentYear });

  if (nextYearCurriculums.length > 0) await Curriculum.insertMany(nextYearCurriculums);

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

  if (nextYearGradeLevelCurriculums.length > 0) await GradeLevelCurriculum.insertMany(nextYearGradeLevelCurriculums);

  await Enrollment.deleteMany({ schoolYear: normalizedCurrentYear });
  await Financial.deleteMany({});
  await ClassAssignment.deleteMany({ section: { $in: sectionIds } });
  await Schedule.deleteMany({ _id: { $in: activeAssignments.map((assignment) => assignment.schedule?._id).filter(Boolean) } });
  await Section.deleteMany({ schoolYear: normalizedCurrentYear });

  if (nextYearSections.length > 0) await Section.insertMany(nextYearSections);
  if (nextYearSchedules.length > 0) await Schedule.insertMany(nextYearSchedules);
  if (nextYearClassAssignments.length > 0) await ClassAssignment.insertMany(nextYearClassAssignments);

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
        discountApplied: false,
        sectionId: null,
      },
      { new: false }
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
      status: 'For payment',
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
        discountApplied: false,
        sectionId: null,
      },
      { new: false }
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
  await settings.save();

  if (nextYearEnrollments.length > 0) await Enrollment.insertMany(nextYearEnrollments);

  const studentIdsToRemove = [...graduatedStudentIds];
  if (studentIdsToRemove.length > 0) await Student.deleteMany({ _id: { $in: studentIdsToRemove } });

  return {
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
}

// Copy the active year's academic structure — curricula, grade-level curricula, sections, and
// schedules — into a freshly created draft year so the admin can tweak (e.g. edit one subject)
// instead of rebuilding everything. Student-level data (students, enrollments, financials) is
// intentionally NOT copied: each year starts with a fresh roster.
// References are remapped to the new copies, and the globally-unique sectionId/scheduleId get a
// year tag so they don't collide with the still-live active-year rows.
export async function seedDraftFromActiveYear(currentYear, draftYear) {
  const now = new Date();
  const tagId = (rawId, fallbackPrefix) => {
    const base = String(rawId || `${fallbackPrefix}-${Math.floor(1000 + Math.random() * 9000)}`).replace(/__\d{4}-\d{4}$/, '');
    return `${base}__${draftYear}`;
  };

  // 1. Curricula — keep curriculum_id (unique only per year), new _id.
  const sourceCurriculums = await Curriculum.find({ schoolYear: currentYear }).lean();
  const curriculumIdMap = new Map();
  const draftCurriculums = sourceCurriculums.map((curriculum) => {
    const newId = new mongoose.Types.ObjectId();
    curriculumIdMap.set(String(curriculum._id), newId);
    return { ...curriculum, _id: newId, schoolYear: draftYear, createdAt: now, updatedAt: now };
  });

  // 2. Grade-level curricula — remap curriculum_id to the new curriculum, keep gl_curriculum_id.
  const sourceGradeLevelCurriculums = await GradeLevelCurriculum.find({ school_year_id: currentYear }).lean();
  const gradeLevelIdMap = new Map();
  const draftGradeLevelCurriculums = sourceGradeLevelCurriculums.map((assignment) => {
    const newId = new mongoose.Types.ObjectId();
    // Sections may reference the assignment by either its _id or its gl_curriculum_id.
    gradeLevelIdMap.set(String(assignment._id), newId);
    if (assignment.gl_curriculum_id) {
      gradeLevelIdMap.set(String(assignment.gl_curriculum_id), newId);
    }
    return {
      ...assignment,
      _id: newId,
      school_year_id: draftYear,
      curriculum_id: curriculumIdMap.get(String(assignment.curriculum_id)) || assignment.curriculum_id,
      createdAt: now,
      updatedAt: now,
    };
  });

  // 3. Sections — remap glCurriculumId to the new grade-level curriculum, fresh sectionId.
  const sourceSections = await Section.find({ schoolYear: currentYear }).lean();
  const draftSections = sourceSections.map((section) => {
    const mappedGl = gradeLevelIdMap.get(String(section.glCurriculumId || ''));
    return {
      ...section,
      _id: new mongoose.Types.ObjectId(),
      schoolYear: draftYear,
      glCurriculumId: mappedGl ? String(mappedGl) : section.glCurriculumId,
      sectionId: tagId(section.sectionId, 'SEC'),
    };
  });

  // 4. Schedules — include legacy untagged rows, fresh scheduleId.
  const sourceSchedules = await Schedule.find({
    $or: [{ schoolYear: currentYear }, { schoolYear: { $exists: false } }, { schoolYear: null }],
  }).lean();
  const draftSchedules = sourceSchedules.map((schedule) => ({
    ...schedule,
    _id: new mongoose.Types.ObjectId(),
    schoolYear: draftYear,
    scheduleId: tagId(schedule.scheduleId, 'SCH'),
    createdAt: now,
  }));

  if (draftCurriculums.length > 0) await Curriculum.insertMany(draftCurriculums);
  if (draftGradeLevelCurriculums.length > 0) await GradeLevelCurriculum.insertMany(draftGradeLevelCurriculums);
  if (draftSections.length > 0) await Section.insertMany(draftSections);
  if (draftSchedules.length > 0) await Schedule.insertMany(draftSchedules);

  return {
    curriculumCount: draftCurriculums.length,
    gradeLevelCurriculumCount: draftGradeLevelCurriculums.length,
    sectionCount: draftSections.length,
    scheduleCount: draftSchedules.length,
  };
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

  const settings = await SystemSettings.findOne({ key: SETTINGS_KEY });

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
  const activeStudents = await Student.find(activeLiveFilter).lean();
  const activeEnrollments = await Enrollment.find({ schoolYear: currentYear }).lean();
  const activeFinancials = await Financial.find(activeLiveFilter).lean();
  const activeSections = await Section.find({ schoolYear: currentYear }).lean();
  const sectionIds = activeSections.map((section) => String(section._id));
  const activeAssignmentFilter = { $or: [{ section: { $in: sectionIds } }, { schoolYear: currentYear }] };
  const activeAssignments = await ClassAssignment.find(activeAssignmentFilter)
    .populate('section')
    .populate('teacher')
    .populate('schedule');
  const activeSchedules = await Schedule.find(activeLiveFilter).lean();
  const activeCurriculums = await Curriculum.find({ schoolYear: currentYear }).lean();
  const activeGradeLevelCurriculums = await GradeLevelCurriculum.find({ school_year_id: currentYear }).lean();

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

  // Writes first — archived copies exist before any active data is deleted.
  if (archivedStudents.length > 0) await ArchivedStudent.insertMany(archivedStudents);
  if (archivedEnrollments.length > 0) await ArchivedEnrollment.insertMany(archivedEnrollments);
  if (archivedPayments.length > 0) await ArchivedPayment.insertMany(archivedPayments);
  if (archivedReceipts.length > 0) await ArchivedReceipt.insertMany(archivedReceipts);
  if (archivedSections.length > 0) await ArchivedSection.insertMany(archivedSections);
  if (archivedSchedules.length > 0) await ArchivedSchedule.insertMany(archivedSchedules);
  if (archivedAssignments.length > 0) await ArchivedClassAssignment.insertMany(archivedAssignments);
  if (archivedCurriculums.length > 0) await ArchivedCurriculum.insertMany(archivedCurriculums);
  if (archivedGradeLevelCurriculums.length > 0) await ArchivedGradeLevelCurriculum.insertMany(archivedGradeLevelCurriculums);

  // ---- Migrate student progression into the draft year ----
  const tuitionPlans = normalizeTuitionPlans(settings.tuitionPlans || []);
  const defaultTotal = calculateTotalFromTuitionPlans(tuitionPlans);

  const draftStudents = await Student.find({ schoolYear: draftYear }).lean();
  const draftLrns = new Set(
    draftStudents.map((student) => String(student.learnersReferenceNumber || '')).filter((lrn) => lrn && lrn !== 'TBA')
  );
  const draftEnrolledStudentIds = new Set(
    (await Enrollment.find({ schoolYear: draftYear }, { studentId: 1 }).lean()).map((enrollment) => String(enrollment.studentId || ''))
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
            discountApplied: false,
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
        status: passing ? 'For payment' : 'Failed',
      });
    }
  }

  if (continuingUpdates.length > 0) await Student.bulkWrite(continuingUpdates);
  if (removeStudentIds.length > 0) await Student.deleteMany({ _id: { $in: removeStudentIds } });
  if (newEnrollments.length > 0) await Enrollment.insertMany(newEnrollments);

  // ---- Remove the active year's live ancillary data (now archived) ----
  await Enrollment.deleteMany({ schoolYear: currentYear });
  await Financial.deleteMany(activeLiveFilter);
  await ClassAssignment.deleteMany(activeAssignmentFilter);
  await Schedule.deleteMany(activeLiveFilter);
  await Section.deleteMany({ schoolYear: currentYear });
  await Curriculum.deleteMany({ schoolYear: currentYear });
  await GradeLevelCurriculum.deleteMany({ school_year_id: currentYear });

  // ---- Flip the pointers: the draft is now the active year ----
  settings.currentSchoolYear = draftYear;
  settings.draftSchoolYear = null;
  await settings.save();

  return {
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
}
