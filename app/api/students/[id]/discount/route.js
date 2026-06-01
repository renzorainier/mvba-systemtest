import dbConnect from '@/lib/mongodb';
import Student from '@/models/Student';
import { NextResponse } from 'next/server';
import { ensureWriteAllowedForSchoolYear } from '@/lib/school-year';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(request, { params }) {
  try {
    await dbConnect();

    const user = getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const schoolYearAccess = await ensureWriteAllowedForSchoolYear(request);
    if (!schoolYearAccess.allowed) {
      return NextResponse.json(schoolYearAccess.response, { status: 403 });
    }

    const { id } = await params;

    const existing = await Student.findOne({ _id: id, discountApplied: { $ne: true } }).lean();

    if (!existing) {
      const exists = await Student.exists({ _id: id });
      if (!exists) {
        return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
      }
      return NextResponse.json({ success: false, error: 'Discount has already been applied to this student.' }, { status: 409 });
    }

    const originalCost = existing.totalEstimatedCost ?? 0;
    const amountPaid = Math.max(0, originalCost - (existing.remainingBalance ?? 0));
    const discountedCost = Math.round(originalCost * 0.95);
    const newBalance = Math.max(0, discountedCost - amountPaid);

    const student = await Student.findByIdAndUpdate(
      id,
      { $set: { discountApplied: true, totalEstimatedCost: discountedCost, remainingBalance: newBalance } },
      { new: true }
    );

    return NextResponse.json({ success: true, data: student }, { status: 200 });
  } catch (error) {
    console.error('[discount] unexpected error:', error);
    return NextResponse.json({ success: false, error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
