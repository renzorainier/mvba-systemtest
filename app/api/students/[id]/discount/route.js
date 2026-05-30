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

    // Atomic: only matches when discountApplied is not yet true, preventing double-application.
    const student = await Student.findOneAndUpdate(
      { _id: id, discountApplied: { $ne: true } },
      [
        {
          $set: {
            discountApplied: true,
            totalEstimatedCost: { $round: [{ $multiply: ['$totalEstimatedCost', 0.95] }, 0] },
            remainingBalance: {
              $max: [
                0,
                {
                  $round: [
                    {
                      $subtract: [
                        { $round: [{ $multiply: ['$totalEstimatedCost', 0.95] }, 0] },
                        { $subtract: ['$totalEstimatedCost', '$remainingBalance'] },
                      ],
                    },
                    0,
                  ],
                },
              ],
            },
          },
        },
      ],
      { new: true, runValidators: true }
    );

    if (!student) {
      const exists = await Student.exists({ _id: id });
      if (!exists) {
        return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
      }
      return NextResponse.json({ success: false, error: 'Discount has already been applied to this student.' }, { status: 409 });
    }

    return NextResponse.json({ success: true, data: student }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
