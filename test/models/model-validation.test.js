import { beforeEach, describe, expect, it } from 'vitest';
import Account from '@/models/Account';
import Enrollment from '@/models/Enrollment';
import Financial from '@/models/Financial';
import Section from '@/models/Section';
import Student from '@/models/Student';
import dbConnect from '@/lib/mongodb';
import {
  seedEnrollment,
  seedPayment,
  seedSection,
  seedSettings,
  seedStudent,
} from '../utils/seeds';

describe('Mongoose model validation', () => {
  beforeEach(async () => {
    await dbConnect();
    await seedSettings();
  });

  it('validates Student required fields, grade enum, and GWA range', () => {
    const missingRequired = new Student({});
    const invalidGrade = new Student({
      firstName: 'A',
      lastName: 'B',
      gender: 'Female',
      gradeLevel: 'College',
      dateOfBirth: '2018-01-01',
      address: 'Address',
      admissionDate: '2025-06-01',
    });
    const invalidGwa = new Student({
      firstName: 'A',
      lastName: 'B',
      gender: 'Female',
      gradeLevel: 'Grade 1',
      dateOfBirth: '2018-01-01',
      address: 'Address',
      admissionDate: '2025-06-01',
      gwa: 101,
    });

    expect(missingRequired.validateSync().errors).toMatchObject({
      firstName: expect.any(Object),
      lastName: expect.any(Object),
      gender: expect.any(Object),
      dateOfBirth: expect.any(Object),
      address: expect.any(Object),
      admissionDate: expect.any(Object),
    });
    expect(invalidGrade.validateSync().errors.gradeLevel).toBeTruthy();
    expect(invalidGwa.validateSync().errors.gwa).toBeTruthy();
  });

  it('allows multiple TBA student LRNs but rejects duplicate concrete LRNs', async () => {
    await Student.init();

    await seedStudent({ learnersReferenceNumber: 'TBA', firstName: 'First' });
    await expect(seedStudent({ learnersReferenceNumber: 'TBA', firstName: 'Second' })).resolves.toBeTruthy();

    await seedStudent({ learnersReferenceNumber: '123456789012', firstName: 'Third' });
    await expect(seedStudent({ learnersReferenceNumber: '123456789012', firstName: 'Fourth' })).rejects.toMatchObject({
      code: 11000,
    });
  });

  it('validates Enrollment required fields', () => {
    const enrollment = new Enrollment({});
    const errors = enrollment.validateSync().errors;

    expect(errors.enrollmentId).toBeTruthy();
    expect(errors.learnersReferenceNumber).toBeTruthy();
    expect(errors.sectionId).toBeTruthy();
    expect(errors.enrollmentDate).toBeTruthy();
    expect(errors.schoolYear).toBeTruthy();
    expect(errors.status).toBeTruthy();
  });

  it('validates Section required fields and unique section ID', async () => {
    const section = new Section({});
    const errors = section.validateSync().errors;

    expect(errors.sectionName).toBeTruthy();
    expect(errors.gradeLevel).toBeTruthy();
    expect(errors.schoolYear).toBeTruthy();
    expect(errors.glCurriculumId).toBeTruthy();
    expect(errors.roomNumber).toBeTruthy();
    expect(errors.sectionId).toBeTruthy();

    await Section.init();
    await seedSection({ sectionId: 'SEC-UNIQUE' });
    await expect(seedSection({ sectionId: 'SEC-UNIQUE', sectionName: 'Duplicate' })).rejects.toMatchObject({
      code: 11000,
    });
  });

  it('validates Financial required fields and document schema', async () => {
    const financial = new Financial({});
    const errors = financial.validateSync().errors;

    expect(errors.amountPaid).toBeTruthy();
    expect(errors.dateOfPayment).toBeTruthy();
    expect(errors.paymentMethod).toBeTruthy();
    expect(errors.referenceNumber).toBeTruthy();
    expect(errors.status).toBeTruthy();
    expect(errors.receivedBy).toBeTruthy();
    expect(errors.paymentId).toBeTruthy();
    expect(errors.studentId).toBeTruthy();

    const payment = await seedPayment({
      documents: [{
        fileId: '507f1f77bcf86cd799439011',
        fileName: 'proof.pdf',
        fileType: 'application/pdf',
        fileSize: 123,
      }],
    });

    expect(payment.documents[0]).toMatchObject({
      fileName: 'proof.pdf',
      fileType: 'application/pdf',
      fileSize: 123,
    });
  });

  it('validates Account required fields and role enum', () => {
    const missingRequired = new Account({});
    const invalidRole = new Account({
      username: 'user',
      password: 'password',
      fullName: 'User',
      role: 'Teacher',
    });

    expect(missingRequired.validateSync().errors.username).toBeTruthy();
    expect(missingRequired.validateSync().errors.password).toBeTruthy();
    expect(missingRequired.validateSync().errors.fullName).toBeTruthy();
    expect(missingRequired.validateSync().errors.role).toBeTruthy();
    expect(invalidRole.validateSync().errors.role).toBeTruthy();
  });

  it('seed helpers create valid enrollment records', async () => {
    await expect(seedEnrollment()).resolves.toMatchObject({
      learnersReferenceNumber: expect.any(String),
      schoolYear: '2025-2026',
      status: 'Pending',
    });
  });
});
