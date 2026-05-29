import { beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import ArchivedClassAssignment from '@/models/ArchivedClassAssignment';
import ArchivedEnrollment from '@/models/ArchivedEnrollment';
import ArchivedGradeLevelCurriculum from '@/models/ArchivedGradeLevelCurriculum';
import ArchivedPayment from '@/models/ArchivedPayment';
import ArchivedReceipt from '@/models/ArchivedReceipt';
import ArchivedSchedule from '@/models/ArchivedSchedule';
import ArchivedSection from '@/models/ArchivedSection';
import ArchivedStudent from '@/models/ArchivedStudent';
import ClassAssignment from '@/models/ClassAssignment';
import Enrollment from '@/models/Enrollment';
import Financial from '@/models/Financial';
import GradeLevelCurriculum from '@/models/GradeLevelCurriculum';
import Section from '@/models/Section';
import Student from '@/models/Student';
import SystemSettings from '@/models/SystemSettings';
import dbConnect from '@/lib/mongodb';
import { archiveStudent, listArchivedStudents, restoreStudent } from '@/lib/student-archive';
import { rolloverSchoolYear } from '@/lib/rollover-school-year';
import {
  seedEnrollment,
  seedGradeLevelCurriculum,
  seedPayment,
  seedSchedule,
  seedSection,
  seedSettings,
  seedStudent,
  seedTeacher,
} from '../utils/seeds';

describe('student archive and school-year rollover', () => {
  beforeEach(async () => {
    await dbConnect();
    await seedSettings({ currentSchoolYear: '2025-2026' });
  });

  it('archives a student with related enrollment, payment, and receipt records', async () => {
    const student = await seedStudent({ learnersReferenceNumber: '141414141414' });
    await seedEnrollment({ student });
    await seedPayment({
      student,
      documents: [{
        fileId: new mongoose.Types.ObjectId(),
        fileName: 'receipt.pdf',
        fileType: 'application/pdf',
        fileSize: 123,
      }],
    });

    const result = await archiveStudent(student._id.toString());

    expect(result).toMatchObject({
      enrollmentsArchived: 1,
      paymentsArchived: 1,
      receiptsArchived: 1,
    });
    expect(await Student.countDocuments()).toBe(0);
    expect(await Enrollment.countDocuments()).toBe(0);
    expect(await Financial.countDocuments()).toBe(0);
    expect(await ArchivedStudent.countDocuments({ schoolYear: '2025-2026', archiveType: 'manual' })).toBe(1);
    expect(await ArchivedEnrollment.countDocuments()).toBe(1);
    expect(await ArchivedPayment.countDocuments()).toBe(1);
    expect(await ArchivedReceipt.countDocuments()).toBe(1);
  });

  it('blocks duplicate archive attempts and restores archived students', async () => {
    const student = await seedStudent({ learnersReferenceNumber: '151515151515' });

    await archiveStudent(student._id.toString());
    await expect(archiveStudent(student._id.toString())).rejects.toMatchObject({ statusCode: 404 });

    const archived = await ArchivedStudent.findOne({ learnersReferenceNumber: '151515151515' }).lean();
    const restored = await restoreStudent(archived._id.toString());

    expect(restored.student.learnersReferenceNumber).toBe('151515151515');
    expect(await Student.countDocuments({ learnersReferenceNumber: '151515151515' })).toBe(1);
    expect(await ArchivedStudent.countDocuments({ learnersReferenceNumber: '151515151515' })).toBe(0);
  });

  it('lists archived students by school year and archive type', async () => {
    await ArchivedStudent.create({
      firstName: 'Manual',
      lastName: 'Archive',
      gender: 'Female',
      gradeLevel: 'Grade 1',
      dateOfBirth: '2018-01-01',
      address: 'Address',
      admissionDate: '2025-06-01',
      learnersReferenceNumber: '161616161616',
      schoolYear: '2025-2026',
      archiveType: 'manual',
    });
    await ArchivedStudent.create({
      firstName: 'Rollover',
      lastName: 'Archive',
      gender: 'Female',
      gradeLevel: 'Grade 1',
      dateOfBirth: '2018-01-01',
      address: 'Address',
      admissionDate: '2025-06-01',
      learnersReferenceNumber: '171717171717',
      schoolYear: '2025-2026',
      archiveType: 'rollover',
    });

    const currentArchiveList = await listArchivedStudents('2025-2026');
    const historicalArchiveList = await listArchivedStudents('2025-2026', { isHistorical: true });

    expect(currentArchiveList.map((student) => student.archiveType).sort()).toEqual(['manual']);
    expect(historicalArchiveList.map((student) => student.archiveType)).toEqual(['manual']);
  });

  it('rejects invalid rollover inputs', async () => {
    await expect(rolloverSchoolYear('2025-2027', '2026-2027')).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('rolls over current-year records, promotes passing students, and preserves archive metadata', async () => {
    const settings = await SystemSettings.findOne({ key: 'tuition-breakdown' });
    const passingStudent = await seedStudent({
      firstName: 'Passing',
      learnersReferenceNumber: '181818181818',
      gradeLevel: 'Grade 1',
      gwa: 90,
    });
    const failingStudent = await seedStudent({
      firstName: 'Failing',
      learnersReferenceNumber: '191919191919',
      gradeLevel: 'Grade 1',
      gwa: 70,
    });
    const gl = await seedGradeLevelCurriculum({ school_year_id: '2025-2026', grade_level: 'Grade 1' });
    const section = await seedSection({ gradeLevelCurriculum: gl, schoolYear: '2025-2026' });
    const teacher = await seedTeacher();
    const schedule = await seedSchedule({ gradeLevel: 'Grade 1' });
    await ClassAssignment.create({
      assignmentId: 'CA-ROLLOVER',
      section: section._id,
      teacher: teacher._id,
      schedule: schedule._id,
    });
    await seedEnrollment({ student: passingStudent, section, status: 'Enrolled' });
    await seedEnrollment({ student: failingStudent, section, status: 'Enrolled' });
    await seedPayment({
      student: passingStudent,
      documents: [{
        fileId: new mongoose.Types.ObjectId(),
        fileName: 'receipt.pdf',
        fileType: 'application/pdf',
        fileSize: 123,
      }],
    });
    settings.currentSchoolYear = '2025-2026';
    await settings.save();

    const result = await rolloverSchoolYear('2025-2026', '2026-2027', [passingStudent._id.toString()]);
    const promoted = await Student.findById(passingStudent._id).lean();
    const retained = await Student.findById(failingStudent._id).lean();
    const updatedSettings = await SystemSettings.findOne({ key: 'tuition-breakdown' }).lean();

    expect(result).toMatchObject({
      archivedStudentCount: 2,
      archivedEnrollmentCount: 2,
      archivedPaymentCount: 1,
      archivedReceiptCount: 1,
      archivedSectionCount: 1,
      archivedScheduleCount: 1,
      archivedClassAssignmentCount: 1,
      archivedGradeLevelCurriculumCount: 1,
      nextYearEnrollmentCount: 2,
    });
    expect(promoted.gradeLevel).toBe('Grade 2');
    expect(retained.gradeLevel).toBe('Grade 1');
    expect(updatedSettings.currentSchoolYear).toBe('2026-2027');
    expect(await ArchivedStudent.countDocuments({ schoolYear: '2025-2026', archiveType: 'rollover' })).toBe(2);
    expect(await ArchivedSection.countDocuments({ schoolYear: '2025-2026' })).toBe(1);
    expect(await ArchivedSchedule.countDocuments({ schoolYear: '2025-2026' })).toBe(1);
    expect(await ArchivedClassAssignment.countDocuments({ schoolYear: '2025-2026' })).toBe(1);
    expect(await ArchivedGradeLevelCurriculum.countDocuments({ schoolYear: '2025-2026' })).toBe(1);
    expect(await Section.countDocuments({ schoolYear: '2026-2027' })).toBe(1);
    expect(await GradeLevelCurriculum.countDocuments({ school_year_id: '2026-2027' })).toBe(1);
    expect(await Enrollment.countDocuments({ schoolYear: '2026-2027' })).toBe(2);
  });
});
