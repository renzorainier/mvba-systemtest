import dbConnect from '@/lib/mongodb';
import Student from '@/models/Student';
import { NextResponse } from 'next/server';
import { ensureWriteAllowedForSchoolYear } from '@/lib/school-year';

export async function POST(request, { params }) {
  try {
    await dbConnect();

    const schoolYearAccess = await ensureWriteAllowedForSchoolYear(request);
    if (!schoolYearAccess.allowed) {
      return NextResponse.json(schoolYearAccess.response, { status: 403 });
    }

    const { id } = await params;
    const student = await Student.findById(id);

    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    if (student.discountApplied) {
      return NextResponse.json({ success: false, error: 'Discount has already been applied to this student.' }, { status: 409 });
    }

    const discountAmount = Math.round(Number(student.totalEstimatedCost) * 0.05);
    const newTotal = Number(student.totalEstimatedCost) - discountAmount;
    const newBalance = Math.max(0, Number(student.remainingBalance) - discountAmount);

    const updated = await Student.findByIdAndUpdate(
      id,
      { $set: { totalEstimatedCost: newTotal, remainingBalance: newBalance, discountApplied: true } },
      { new: true, runValidators: true }
    );

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
