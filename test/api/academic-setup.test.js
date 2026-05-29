import { beforeEach, describe, expect, it } from 'vitest';
import ClassAssignment from '@/models/ClassAssignment';
import dbConnect from '@/lib/mongodb';
import { createMockRequest, params, readJsonResponse } from '../utils/http';
import {
  seedCurriculum,
  seedGradeLevelCurriculum,
  seedSchedule,
  seedSection,
  seedSettings,
  seedTeacher,
} from '../utils/seeds';

const teachersRoute = await import('@/app/api/teachers/route');
const teacherByIdRoute = await import('@/app/api/teachers/[id]/route');
const schedulesRoute = await import('@/app/api/schedules/route');
const scheduleByIdRoute = await import('@/app/api/schedules/[id]/route');
const curriculumsRoute = await import('@/app/api/curriculums/route');
const curriculumByIdRoute = await import('@/app/api/curriculums/[id]/route');
const glRoute = await import('@/app/api/grade-level-curriculums/route');
const classesRoute = await import('@/app/api/classes/route');
const classByIdRoute = await import('@/app/api/classes/[id]/route');

const currentRequest = (body = {}, url = 'http://localhost.test/api/test') => createMockRequest({ body, url });
const historicalRequest = (body = {}) => createMockRequest({
  body,
  cookies: { selected_school_year: '2024-2025' },
});

describe('academic setup routes', () => {
  beforeEach(async () => {
    await dbConnect();
    await seedSettings({ currentSchoolYear: '2025-2026' });
  });

  it('creates, lists, and updates teachers; rejects historical teacher writes', async () => {
    const created = await readJsonResponse(await teachersRoute.POST(currentRequest({
      firstName: 'Teacher',
      lastName: 'One',
      phoneNumber: '09170000000',
      email: 'teacher@example.com',
      hireDate: '2025-01-01',
      teacherId: 'T-ROUTE',
    })));
    const listed = await readJsonResponse(await teachersRoute.GET(currentRequest()));
    const updated = await readJsonResponse(await teacherByIdRoute.PUT(
      currentRequest({
        firstName: 'Teacher',
        lastName: 'Updated',
        phoneNumber: '09170000000',
        email: 'teacher@example.com',
        hireDate: '2025-01-01',
        teacherId: 'T-ROUTE',
      }),
      params({ id: created.body.data._id })
    ));
    const historical = await readJsonResponse(await teacherByIdRoute.PUT(
      historicalRequest({ firstName: 'Nope' }),
      params({ id: created.body.data._id })
    ));

    expect(created.status).toBe(201);
    expect(listed.body.data).toHaveLength(1);
    expect(updated.body.data.lastName).toBe('Updated');
    expect(historical.status).toBe(403);
  });

  it('creates schedules and rejects duplicate schedule IDs on update', async () => {
    const first = await readJsonResponse(await schedulesRoute.POST(currentRequest({
      scheduleId: 'SCH-A',
      name: 'A',
      gradeLevel: 'Grade 1',
      items: [{ subject: 'Reading', day: 'Monday', startTime: '08:00', endTime: '09:00', type: 'class' }],
    })));
    const second = await readJsonResponse(await schedulesRoute.POST(currentRequest({
      scheduleId: 'SCH-B',
      name: 'B',
      gradeLevel: 'Grade 1',
      items: [],
    })));
    const duplicate = await readJsonResponse(await scheduleByIdRoute.PUT(
      currentRequest({ scheduleId: 'SCH-A', name: 'B Updated', gradeLevel: 'Grade 1', items: [] }),
      params({ id: second.body.data._id })
    ));
    const historical = await readJsonResponse(await schedulesRoute.POST(historicalRequest({
      scheduleId: 'SCH-H',
      name: 'Historical',
      gradeLevel: 'Grade 1',
    })));

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(duplicate.status).toBe(409);
    expect(historical.status).toBe(403);
  });

  it('creates, lists, updates, and deletes curriculums; rejects duplicates and historical writes', async () => {
    const payload = {
      curriculum_id: 'CUR-A',
      curriculum_name: 'Curriculum A',
      effective_start_date: '2025-06-01',
      effective_end_date: '2026-03-31',
      subjects: [{ subject_id: 'SUB-A', subject_name: 'Reading' }],
    };

    const created = await readJsonResponse(await curriculumsRoute.POST(currentRequest(payload)));
    const duplicate = await readJsonResponse(await curriculumsRoute.POST(currentRequest(payload)));
    const listed = await readJsonResponse(await curriculumsRoute.GET(currentRequest()));
    const updated = await readJsonResponse(await curriculumByIdRoute.PUT(
      currentRequest({ ...payload, curriculum_name: 'Curriculum Updated' }),
      params({ id: created.body.data._id })
    ));
    const deleted = await readJsonResponse(await curriculumByIdRoute.DELETE(
      currentRequest(),
      params({ id: created.body.data._id })
    ));
    const historical = await readJsonResponse(await curriculumsRoute.POST(historicalRequest(payload)));

    expect(created.status).toBe(201);
    expect(duplicate.status).toBe(409);
    expect(listed.body.data[0].curriculum_name).toBe('Curriculum A');
    expect(updated.body.data.curriculum_name).toBe('Curriculum Updated');
    expect(deleted.status).toBe(200);
    expect(historical.status).toBe(403);
  });

  it('creates and lists grade-level curriculum assignments and rejects duplicates', async () => {
    const curriculum = await seedCurriculum({ curriculum_id: 'CUR-GL' });

    const created = await readJsonResponse(await glRoute.POST(currentRequest({
      curriculum_id: String(curriculum._id),
      grade_level: 'Grade 1',
    })));
    const duplicate = await readJsonResponse(await glRoute.POST(currentRequest({
      curriculum_id: String(curriculum._id),
      grade_level: 'Grade 1',
    })));
    const listed = await readJsonResponse(await glRoute.GET(currentRequest(
      {},
      'http://localhost.test/api/grade-level-curriculums?schoolYearId=2025-2026&gradeLevel=Grade%201'
    )));
    const historical = await readJsonResponse(await glRoute.POST(historicalRequest({
      curriculum_id: String(curriculum._id),
      grade_level: 'Grade 2',
    })));

    expect(created.status).toBe(201);
    expect(duplicate.status).toBe(409);
    expect(listed.body.data).toHaveLength(1);
    expect(listed.body.data[0].curriculum_id.curriculum_name).toBe('Grade 1 Curriculum');
    expect(historical.status).toBe(403);
  });

  it('creates, lists, updates, and deletes class assignments', async () => {
    const gl = await seedGradeLevelCurriculum();
    const section = await seedSection({ gradeLevelCurriculum: gl });
    const teacher = await seedTeacher();
    const schedule = await seedSchedule({ gradeLevel: 'Grade 1' });

    const created = await readJsonResponse(await classesRoute.POST(currentRequest({
      sectionId: String(section._id),
      teacherId: String(teacher._id),
      scheduleId: String(schedule._id),
    })));
    const listed = await readJsonResponse(await classesRoute.GET(currentRequest()));

    const nextTeacher = await seedTeacher({ teacherId: 'T-NEXT' });
    const nextSchedule = await seedSchedule({ scheduleId: 'SCH-NEXT', gradeLevel: 'Grade 1' });
    const updated = await readJsonResponse(await classByIdRoute.PUT(
      currentRequest({
        teacherId: String(nextTeacher._id),
        scheduleId: String(nextSchedule._id),
      }),
      params({ id: created.body.data._id })
    ));
    const deleted = await readJsonResponse(await classByIdRoute.DELETE(
      currentRequest(),
      params({ id: created.body.data._id })
    ));

    expect(created.status).toBe(201);
    expect(listed.body.data).toHaveLength(1);
    expect(updated.status).toBe(200);
    expect(updated.body.data.teacher.teacherId).toBe('T-NEXT');
    expect(deleted.status).toBe(200);
    expect(await ClassAssignment.countDocuments()).toBe(0);
  });

  it('rejects invalid class assignment inputs and historical writes', async () => {
    const missing = await readJsonResponse(await classesRoute.POST(currentRequest({})));
    const section = await seedSection();
    const teacher = await seedTeacher();
    const schedule = await seedSchedule({ gradeLevel: 'Grade 2' });
    const mismatch = await readJsonResponse(await classesRoute.POST(currentRequest({
      sectionId: String(section._id),
      teacherId: String(teacher._id),
      scheduleId: String(schedule._id),
    })));
    const historical = await readJsonResponse(await classesRoute.POST(historicalRequest({
      sectionId: String(section._id),
      teacherId: String(teacher._id),
      scheduleId: String(schedule._id),
    })));

    expect(missing.status).toBe(400);
    expect(mismatch.status).toBe(400);
    expect(historical.status).toBe(403);
  });
});
