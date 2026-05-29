import { beforeEach, describe, expect, it } from 'vitest';
import ArchivedStudent from '@/models/ArchivedStudent';
import Student from '@/models/Student';
import dbConnect from '@/lib/mongodb';
import { createMockRequest, params, readJsonResponse } from '../utils/http';
import { seedSettings, seedStudent } from '../utils/seeds';

const studentsRoute = await import('@/app/api/students/route');
const studentByIdRoute = await import('@/app/api/students/[id]/route');

const currentRequest = (body = {}) => createMockRequest({ body });
const historicalRequest = (body = {}) => createMockRequest({
  body,
  cookies: { selected_school_year: '2024-2025' },
});

const studentPayload = (overrides = {}) => ({
  firstName: 'Grace',
  lastName: 'Hopper',
  gender: 'Female',
  gradeLevel: 'Grade 1',
  dateOfBirth: '2018-01-01',
  address: 'Test Address',
  admissionDate: '2025-06-01',
  learnersReferenceNumber: '123456789012',
  ...overrides,
});

const studentForm = (overrides = {}) => {
  const form = new FormData();
  Object.entries(studentPayload(overrides)).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      form.set(key, String(value));
    }
  });
  return form;
};

describe('student routes', () => {
  beforeEach(async () => {
    await dbConnect();
    await seedSettings({ currentSchoolYear: '2025-2026' });
  });

  it('GET returns active students for current school year context', async () => {
    await seedStudent({ firstName: 'Active' });

    const response = await readJsonResponse(await studentsRoute.GET(currentRequest()));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].firstName).toBe('Active');
  });

  it('GET returns archived rollover students for historical context', async () => {
    await ArchivedStudent.create({
      firstName: 'Archived',
      lastName: 'Student',
      gender: 'Female',
      gradeLevel: 'Grade 1',
      dateOfBirth: '2018-01-01',
      address: 'Old Address',
      admissionDate: '2024-06-01',
      learnersReferenceNumber: '999999999999',
      schoolYear: '2024-2025',
      archiveType: 'rollover',
    });

    const response = await readJsonResponse(await studentsRoute.GET(historicalRequest()));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].firstName).toBe('Archived');
  });

  it('POST creates Kinder 1 students with generated 6-digit LRNs and grade tuition', async () => {
    const response = await readJsonResponse(await studentsRoute.POST(currentRequest(studentPayload({
      gradeLevel: 'Kinder 1',
      learnersReferenceNumber: '',
    }))));

    expect(response.status).toBe(201);
    expect(response.body.data.learnersReferenceNumber).toMatch(/^\d{6}$/);
    expect(response.body.data.totalEstimatedCost).toBe(26000);
    expect(response.body.data.remainingBalance).toBe(26000);
  });

  it('POST creates Grade 1+ students with valid 12-digit LRN or TBA fallback', async () => {
    const withLrn = await readJsonResponse(await studentsRoute.POST(currentRequest(studentPayload({
      learnersReferenceNumber: '222222222222',
    }))));
    const withTba = await readJsonResponse(await studentsRoute.POST(currentRequest(studentPayload({
      firstName: 'No',
      lastName: 'LRN',
      learnersReferenceNumber: '',
    }))));

    expect(withLrn.status).toBe(201);
    expect(withLrn.body.data.learnersReferenceNumber).toBe('222222222222');
    expect(withTba.status).toBe(201);
    expect(withTba.body.data.learnersReferenceNumber).toBe('TBA');
  });

  it('POST rejects invalid grade, invalid LRN, duplicate concrete LRN, and invalid GWA', async () => {
    await seedStudent({ learnersReferenceNumber: '333333333333' });

    const invalidGrade = await readJsonResponse(await studentsRoute.POST(currentRequest(studentPayload({ gradeLevel: 'College' }))));
    const invalidLrn = await readJsonResponse(await studentsRoute.POST(currentRequest(studentPayload({ learnersReferenceNumber: '123' }))));
    const duplicate = await readJsonResponse(await studentsRoute.POST(currentRequest(studentPayload({ learnersReferenceNumber: '333333333333' }))));
    const invalidGwa = await readJsonResponse(await studentsRoute.POST(currentRequest(studentPayload({ learnersReferenceNumber: '444444444444', gwa: 'abc' }))));

    expect(invalidGrade.status).toBe(400);
    expect(invalidLrn.status).toBe(400);
    expect(duplicate.status).toBe(409);
    expect(invalidGwa.status).toBe(400);
  });

  it('POST rejects writes in historical mode', async () => {
    const response = await readJsonResponse(await studentsRoute.POST(historicalRequest(studentPayload())));

    expect(response.status).toBe(403);
    expect(response.body.error).toContain('Historical school years are read-only');
  });

  it('PATCH updates student GWA and rejects invalid GWA', async () => {
    const student = await seedStudent({ gwa: 90 });

    const updated = await readJsonResponse(await studentByIdRoute.PATCH(
      currentRequest({ gwa: 95 }),
      params({ id: student._id.toString() })
    ));
    const invalid = await readJsonResponse(await studentByIdRoute.PATCH(
      currentRequest({ gwa: 'bad' }),
      params({ id: student._id.toString() })
    ));

    expect(updated.status).toBe(200);
    expect(updated.body.data.gwa).toBe(95);
    expect(invalid.status).toBe(400);
  });

  it('PUT updates profile fields and preserves existing balances', async () => {
    const student = await seedStudent({
      learnersReferenceNumber: '555555555555',
      remainingBalance: 1234,
      totalEstimatedCost: 36000,
    });

    const response = await readJsonResponse(await studentByIdRoute.PUT(
      createMockRequest({ formData: studentForm({ firstName: 'Updated', learnersReferenceNumber: '555555555555' }) }),
      params({ id: student._id.toString() })
    ));

    expect(response.status).toBe(200);
    expect(response.body.data.firstName).toBe('Updated');
    expect(response.body.data.remainingBalance).toBe(1234);
    expect(response.body.data.totalEstimatedCost).toBe(36000);
  });

  it('PUT rejects historical writes', async () => {
    const student = await seedStudent({ learnersReferenceNumber: '666666666666' });

    const response = await readJsonResponse(await studentByIdRoute.PUT(
      createMockRequest({
        formData: studentForm({ learnersReferenceNumber: '666666666666' }),
        cookies: { selected_school_year: '2024-2025' },
      }),
      params({ id: student._id.toString() })
    ));

    expect(response.status).toBe(403);
  });
});
