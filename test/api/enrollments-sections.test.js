import { beforeEach, describe, expect, it } from 'vitest';
import Enrollment from '@/models/Enrollment';
import dbConnect from '@/lib/mongodb';
import { createMockRequest, params, readJsonResponse } from '../utils/http';
import {
  seedEnrollment,
  seedGradeLevelCurriculum,
  seedSection,
  seedSettings,
  seedStudent,
} from '../utils/seeds';

const enrollmentsRoute = await import('@/app/api/enrollments/route');
const enrollmentByIdRoute = await import('@/app/api/enrollments/[id]/route');
const sectionsRoute = await import('@/app/api/sections/route');
const sectionByIdRoute = await import('@/app/api/sections/[id]/route');

const currentRequest = (body = {}) => createMockRequest({ body });
const historicalRequest = (body = {}) => createMockRequest({
  body,
  cookies: { selected_school_year: '2024-2025' },
});

const enrollmentPayload = (student, section, overrides = {}) => ({
  learnersReferenceNumber: student.learnersReferenceNumber,
  studentId: String(student._id),
  sectionId: section.sectionId,
  enrollmentDate: '2025-06-15',
  status: 'Pending',
  ...overrides,
});

describe('enrollment and section routes', () => {
  beforeEach(async () => {
    await dbConnect();
    await seedSettings({ currentSchoolYear: '2025-2026' });
  });

  it('creates enrollment with explicit valid student ID and enriches GET output', async () => {
    const student = await seedStudent({ firstName: 'Enroll' });
    const section = await seedSection({ sectionName: 'Faith' });

    const created = await readJsonResponse(await enrollmentsRoute.POST(currentRequest(enrollmentPayload(student, section))));
    const listed = await readJsonResponse(await enrollmentsRoute.GET(currentRequest()));

    expect(created.status).toBe(201);
    expect(created.body.data.studentId).toBe(String(student._id));
    expect(listed.body.data[0]).toMatchObject({
      studentName: 'Enroll Lovelace',
      sectionName: 'Faith',
      studentGradeLevel: 'Grade 1',
    });
  });

  it('rejects missing LRN, ambiguous TBA, mismatched studentId/LRN, duplicates, and full sections', async () => {
    const section = await seedSection({ sectionId: 'SEC-FULL' });
    const student = await seedStudent({ learnersReferenceNumber: '777777777777' });
    const otherStudent = await seedStudent({ learnersReferenceNumber: '888888888888', firstName: 'Other' });

    const missingLrn = await readJsonResponse(await enrollmentsRoute.POST(currentRequest({
      studentId: String(student._id),
      sectionId: section.sectionId,
      enrollmentDate: '2025-06-15',
      status: 'Pending',
    })));

    await seedStudent({ learnersReferenceNumber: 'TBA', firstName: 'TbaOne' });
    await seedStudent({ learnersReferenceNumber: 'TBA', firstName: 'TbaTwo' });
    const ambiguous = await readJsonResponse(await enrollmentsRoute.POST(currentRequest({
      learnersReferenceNumber: 'TBA',
      sectionId: section.sectionId,
      enrollmentDate: '2025-06-15',
      status: 'Pending',
    })));

    const mismatch = await readJsonResponse(await enrollmentsRoute.POST(currentRequest(enrollmentPayload(student, section, {
      learnersReferenceNumber: otherStudent.learnersReferenceNumber,
    }))));

    await seedEnrollment({ student, section });
    const duplicate = await readJsonResponse(await enrollmentsRoute.POST(currentRequest(enrollmentPayload(student, section, {
      enrollmentId: 'DUPLICATE',
    }))));

    for (let index = 0; index < 15; index += 1) {
      await Enrollment.create({
        enrollmentId: `FULL-${index}`,
        learnersReferenceNumber: `9000000000${String(index).padStart(2, '0')}`,
        studentId: String((await seedStudent({ learnersReferenceNumber: `9100000000${String(index).padStart(2, '0')}` }))._id),
        sectionId: 'SEC-FULL',
        enrollmentDate: '2025-06-15',
        schoolYear: '2025-2026',
        status: 'Pending',
      });
    }
    const fullStudent = await seedStudent({ learnersReferenceNumber: '999999999991' });
    const full = await readJsonResponse(await enrollmentsRoute.POST(currentRequest(enrollmentPayload(fullStudent, section))));

    expect(missingLrn.status).toBe(400);
    expect(ambiguous.status).toBe(400);
    expect(mismatch.status).toBe(400);
    expect(duplicate.status).toBe(400);
    expect(full.status).toBe(400);
  });

  it('updates enrollment status and section, and rejects historical writes', async () => {
    const student = await seedStudent({ learnersReferenceNumber: '121212121212' });
    const section = await seedSection({ sectionId: 'SEC-A' });
    const nextSection = await seedSection({ sectionId: 'SEC-B', sectionName: 'Hope' });
    const enrollment = await seedEnrollment({ student, section, status: 'Pending' });

    const patched = await readJsonResponse(await enrollmentByIdRoute.PATCH(
      currentRequest({ status: 'Enrolled' }),
      params({ id: enrollment._id.toString() })
    ));
    const moved = await readJsonResponse(await enrollmentByIdRoute.PUT(
      currentRequest({
        learnersReferenceNumber: student.learnersReferenceNumber,
        sectionId: nextSection.sectionId,
        enrollmentDate: '2025-06-16',
        status: 'Enrolled',
      }),
      params({ id: enrollment._id.toString() })
    ));
    const historical = await readJsonResponse(await enrollmentByIdRoute.PATCH(
      historicalRequest({ status: 'Cancelled' }),
      params({ id: enrollment._id.toString() })
    ));

    expect(patched.status).toBe(200);
    expect(patched.body.data.status).toBe('Enrolled');
    expect(moved.status).toBe(200);
    expect(moved.body.data.sectionId).toBe('SEC-B');
    expect(historical.status).toBe(403);
  });

  it('creates, validates, updates, and enriches sections', async () => {
    const gl = await seedGradeLevelCurriculum({ grade_level: 'Grade 1', school_year_id: '2025-2026' });

    const missing = await readJsonResponse(await sectionsRoute.POST(currentRequest({ sectionName: 'Missing' })));
    const created = await readJsonResponse(await sectionsRoute.POST(currentRequest({
      sectionName: 'Courage',
      gradeLevel: 'Grade 1',
      glCurriculumId: String(gl._id),
      roomNumber: '202',
      sectionId: 'SEC-COURAGE',
    })));
    const listed = await readJsonResponse(await sectionsRoute.GET(currentRequest()));
    const updated = await readJsonResponse(await sectionByIdRoute.PUT(
      currentRequest({
        sectionName: 'Courage Updated',
        gradeLevel: 'Grade 1',
        glCurriculumId: String(gl._id),
        roomNumber: '303',
        sectionId: 'SEC-COURAGE',
      }),
      params({ id: created.body.data._id })
    ));

    expect(missing.status).toBe(400);
    expect(created.status).toBe(201);
    expect(listed.body.data[0].glCurriculumId.curriculum_id.curriculum_name).toBe('Grade 1 Curriculum');
    expect(updated.status).toBe(200);
    expect(updated.body.data.roomNumber).toBe('303');
  });

  it('rejects section curriculum assignment grade/year mismatch and historical writes', async () => {
    const mismatchedGl = await seedGradeLevelCurriculum({ grade_level: 'Grade 2', school_year_id: '2025-2026' });
    const goodSection = await seedSection();

    const mismatch = await readJsonResponse(await sectionsRoute.POST(currentRequest({
      sectionName: 'Mismatch',
      gradeLevel: 'Grade 1',
      glCurriculumId: String(mismatchedGl._id),
      roomNumber: '404',
      sectionId: 'SEC-MISMATCH',
    })));
    const historical = await readJsonResponse(await sectionByIdRoute.PUT(
      historicalRequest({
        sectionName: 'Historical',
        gradeLevel: 'Grade 1',
        glCurriculumId: goodSection.glCurriculumId,
        roomNumber: '505',
        sectionId: goodSection.sectionId,
      }),
      params({ id: goodSection._id.toString() })
    ));

    expect(mismatch.status).toBe(400);
    expect(historical.status).toBe(403);
  });
});
