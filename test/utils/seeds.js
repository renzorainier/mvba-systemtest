import Account from '@/models/Account';
import Curriculum from '@/models/Curriculum';
import Enrollment from '@/models/Enrollment';
import Financial from '@/models/Financial';
import GradeLevelCurriculum from '@/models/GradeLevelCurriculum';
import Schedule from '@/models/Schedule';
import Section from '@/models/Section';
import Student from '@/models/Student';
import SystemSettings from '@/models/SystemSettings';
import Teacher from '@/models/Teachers';
import { hashPassword } from '@/lib/passwords';
import { createDefaultTuitionPlans } from '@/lib/tuition-settings';

export async function seedSettings(overrides = {}) {
  return SystemSettings.create({
    key: 'tuition-breakdown',
    title: 'Test Tuition',
    currency: 'PHP',
    currentSchoolYear: '2025-2026',
    tuitionPlans: createDefaultTuitionPlans(),
    breakdown: [],
    curriculums: [],
    gradeLevelCurriculums: [],
    ...overrides,
  });
}

export async function seedAccount(overrides = {}) {
  return Account.create({
    username: `user-${Date.now()}-${Math.random()}`,
    password: hashPassword('password123'),
    fullName: 'Test Admin',
    role: 'Admin',
    isActive: true,
    ...overrides,
  });
}

export async function seedStudent(overrides = {}) {
  return Student.create({
    firstName: 'Ada',
    lastName: 'Lovelace',
    gender: 'Female',
    gradeLevel: 'Grade 1',
    dateOfBirth: '2018-01-01',
    address: 'Test Address',
    admissionDate: '2025-06-01',
    learnersReferenceNumber: `1${Math.floor(10000000000 + Math.random() * 89999999999)}`,
    totalEstimatedCost: 36000,
    remainingBalance: 36000,
    ...overrides,
  });
}

export async function seedCurriculum(overrides = {}) {
  return Curriculum.create({
    curriculum_id: `CUR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    schoolYear: '2025-2026',
    curriculum_name: 'Grade 1 Curriculum',
    effective_start_date: '2025-06-01',
    effective_end_date: '2026-03-31',
    subjects: [{ subject_id: 'SUB-1', subject_name: 'Reading' }],
    ...overrides,
  });
}

export async function seedGradeLevelCurriculum(overrides = {}) {
  const curriculum = overrides.curriculum || await seedCurriculum(overrides.curriculumOverrides || {});

  return GradeLevelCurriculum.create({
    gl_curriculum_id: `GLC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    school_year_id: '2025-2026',
    grade_level: 'Grade 1',
    curriculum_id: curriculum._id,
    is_default: true,
    ...overrides,
    curriculum: undefined,
    curriculumOverrides: undefined,
  });
}

export async function seedSection(overrides = {}) {
  const gradeLevelCurriculum = overrides.gradeLevelCurriculum || await seedGradeLevelCurriculum();

  return Section.create({
    sectionName: 'Faith',
    gradeLevel: 'Grade 1',
    schoolYear: '2025-2026',
    glCurriculumId: String(gradeLevelCurriculum._id),
    roomNumber: '101',
    sectionId: `SEC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ...overrides,
    gradeLevelCurriculum: undefined,
  });
}

export async function seedEnrollment(overrides = {}) {
  const student = overrides.student || await seedStudent();
  const section = overrides.section || await seedSection();

  return Enrollment.create({
    enrollmentId: `E-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    learnersReferenceNumber: student.learnersReferenceNumber,
    studentId: String(student._id),
    sectionId: section.sectionId,
    enrollmentDate: '2025-06-15',
    schoolYear: '2025-2026',
    status: 'Pending',
    ...overrides,
    student: undefined,
    section: undefined,
  });
}

export async function seedPayment(overrides = {}) {
  const student = overrides.student || await seedStudent();

  return Financial.create({
    paymentId: `P-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    studentId: String(student._id),
    amountPaid: 1000,
    dateOfPayment: '2025-07-01',
    paymentMethod: 'Cash',
    referenceNumber: `REF-${Date.now()}`,
    status: 'Pending',
    receivedBy: 'Cashier',
    remarks: '',
    documents: [],
    ...overrides,
    student: undefined,
  });
}

export async function seedTeacher(overrides = {}) {
  return Teacher.create({
    firstName: 'Maria',
    lastName: 'Santos',
    phoneNumber: '09170000000',
    email: `teacher-${Date.now()}@example.com`,
    hireDate: '2025-01-01',
    teacherId: `T-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ...overrides,
  });
}

export async function seedSchedule(overrides = {}) {
  return Schedule.create({
    scheduleId: `SCH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: 'Grade 1 Morning',
    gradeLevel: 'Grade 1',
    totalSubjects: 1,
    items: [{ subject: 'Reading', day: 'Monday', startTime: '08:00', endTime: '09:00', type: 'class' }],
    ...overrides,
  });
}
