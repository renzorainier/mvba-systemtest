import { beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import Financial from '@/models/Financial';
import Student from '@/models/Student';
import dbConnect from '@/lib/mongodb';
import { createMockRequest, params, readJsonResponse } from '../utils/http';
import { seedPayment, seedSettings, seedStudent } from '../utils/seeds';

const financialsRoute = await import('@/app/api/financials/route');
const financialByIdRoute = await import('@/app/api/financials/[id]/route');

const currentRequest = (body = {}) => createMockRequest({ body });
const historicalRequest = (body = {}) => createMockRequest({
  body,
  cookies: { selected_school_year: '2024-2025' },
});

const paymentPayload = (student, overrides = {}) => ({
  studentId: String(student._id),
  amountPaid: 1000,
  dateOfPayment: '2025-07-01',
  paymentMethod: 'Cash',
  referenceNumber: `REF-${Date.now()}`,
  status: 'Completed',
  receivedBy: 'Cashier',
  remarks: '',
  ...overrides,
});

describe('financial routes', () => {
  beforeEach(async () => {
    await dbConnect();
    await seedSettings();
  });

  it('GET enriches payment records with student names', async () => {
    const student = await seedStudent({ firstName: 'Paying', lastName: 'Student' });
    await seedPayment({ student, status: 'Pending' });

    const response = await readJsonResponse(await financialsRoute.GET(currentRequest()));

    expect(response.status).toBe(200);
    expect(response.body.data[0].studentName).toBe('Paying Student');
  });

  it('POST rejects invalid, missing, and nonexistent student IDs', async () => {
    const missing = await readJsonResponse(await financialsRoute.POST(currentRequest({ amountPaid: 100 })));
    const invalid = await readJsonResponse(await financialsRoute.POST(currentRequest({ studentId: 'not-an-object-id' })));
    const nonexistent = await readJsonResponse(await financialsRoute.POST(currentRequest({
      ...paymentPayload({ _id: new mongoose.Types.ObjectId() }),
      studentId: new mongoose.Types.ObjectId().toString(),
    })));

    expect(missing.status).toBe(400);
    expect(invalid.status).toBe(400);
    expect(nonexistent.status).toBe(400);
  });

  it('POST creates completed payments and reduces remaining balance without going below zero', async () => {
    const student = await seedStudent({ remainingBalance: 500, totalEstimatedCost: 36000 });

    const response = await readJsonResponse(await financialsRoute.POST(currentRequest(paymentPayload(student, {
      amountPaid: 1000,
      status: 'Completed',
    }))));
    const updatedStudent = await Student.findById(student._id).lean();

    expect(response.status).toBe(201);
    expect(updatedStudent.remainingBalance).toBe(0);
  });

  it('POST with non-completed status does not change balance', async () => {
    const student = await seedStudent({ remainingBalance: 5000 });

    const response = await readJsonResponse(await financialsRoute.POST(currentRequest(paymentPayload(student, {
      amountPaid: 1000,
      status: 'Pending',
    }))));
    const updatedStudent = await Student.findById(student._id).lean();

    expect(response.status).toBe(201);
    expect(updatedStudent.remainingBalance).toBe(5000);
  });

  it('POST attaches proof-of-payment metadata and rejects historical writes', async () => {
    const student = await seedStudent();
    const fileId = new mongoose.Types.ObjectId().toString();

    const created = await readJsonResponse(await financialsRoute.POST(currentRequest(paymentPayload(student, {
      proofOfPayment: {
        fileId,
        fileName: 'proof.pdf',
        fileType: 'application/pdf',
        fileSize: 1234,
      },
    }))));
    const historical = await readJsonResponse(await financialsRoute.POST(historicalRequest(paymentPayload(student))));

    expect(created.status).toBe(201);
    expect(created.body.data.documents[0]).toMatchObject({
      fileName: 'proof.pdf',
      fileType: 'application/pdf',
      fileSize: 1234,
    });
    expect(historical.status).toBe(403);
  });

  it('PATCH status applies balance changes and rejects invalid updates', async () => {
    const student = await seedStudent({ remainingBalance: 5000, totalEstimatedCost: 36000 });
    const payment = await seedPayment({ student, amountPaid: 1000, status: 'Pending' });

    const missing = await readJsonResponse(await financialByIdRoute.PATCH(
      currentRequest({}),
      params({ id: payment._id.toString() })
    ));
    const completed = await readJsonResponse(await financialByIdRoute.PATCH(
      currentRequest({ status: 'Completed' }),
      params({ id: payment._id.toString() })
    ));
    const afterCompleted = await Student.findById(student._id).lean();
    const reverted = await readJsonResponse(await financialByIdRoute.PATCH(
      currentRequest({ status: 'Pending' }),
      params({ id: payment._id.toString() })
    ));
    const afterReverted = await Student.findById(student._id).lean();

    expect(missing.status).toBe(400);
    expect(completed.status).toBe(200);
    expect(afterCompleted.remainingBalance).toBe(4000);
    expect(reverted.status).toBe(200);
    expect(afterReverted.remainingBalance).toBe(5000);
  });
});
