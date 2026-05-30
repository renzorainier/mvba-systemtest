import dbConnect from '@/lib/mongodb';
import Financial from '@/models/Financial';
import Student from '@/models/Student';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { isResolvableLrn } from '@/lib/student-identifiers';

const findStudentByIdentifier = async (studentId) => {
  const studentSearchFilters = [];

  if (isResolvableLrn(studentId)) {
    studentSearchFilters.push({ learnersReferenceNumber: studentId });
  }

  if (mongoose.Types.ObjectId.isValid(studentId)) {
    studentSearchFilters.push({ _id: studentId });
  }

  if (studentSearchFilters.length === 0) {
    return null;
  }

  return Student.findOne({ $or: studentSearchFilters });
};

export async function PATCH(request, { params }) {
  try {
    await dbConnect();

    const { id } = await params;
    const body = await request.json();
    const nextStatus = String(body.status || '').trim();

    if (!nextStatus) {
      return NextResponse.json({ success: false, error: 'Status is required.' }, { status: 400 });
    }

    const financial = await Financial.findById(id);

    if (!financial) {
      return NextResponse.json({ success: false, error: 'Payment record not found.' }, { status: 404 });
    }

    const previousStatus = String(financial.status || '').toLowerCase();
    const normalizedNextStatus = nextStatus.toLowerCase();
    const amountPaid = Number(financial.amountPaid || 0);

    if (previousStatus !== normalizedNextStatus && amountPaid > 0) {
      const student = await findStudentByIdentifier(financial.studentId);

      if (student) {
        const currentBalance = Number(student.remainingBalance || 0);

        if (previousStatus !== 'completed' && normalizedNextStatus === 'completed') {
          if (amountPaid > currentBalance) {
            return NextResponse.json(
              { success: false, error: `Payment amount cannot exceed the student's remaining balance of ${currentBalance}` },
              { status: 400 }
            );
          }

          student.remainingBalance = Math.max(0, currentBalance - amountPaid);
          await student.save();
        }

        if (previousStatus === 'completed' && normalizedNextStatus !== 'completed') {
          student.remainingBalance = Math.min(
            Number(student.totalEstimatedCost),
            currentBalance + amountPaid
          );
          await student.save();
        }
      }
    }

    financial.status = nextStatus;
    await financial.save();

    return NextResponse.json({ success: true, data: financial }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
