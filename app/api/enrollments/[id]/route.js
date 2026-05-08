import dbConnect from '@/lib/mongodb';
import Enrollment from '@/models/Enrollment';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    
    // Map form field names to database field names
    const enrollmentData = {
      learnersReferenceNumber: body.learnersReferenceNumber,
      sectionId: body.sectionId,
      schoolYear: body.schoolYear,
      enrollmentDate: body.enrollmentDate,
      status: body.status,
    };
    
    const enrollment = await Enrollment.findByIdAndUpdate(id, enrollmentData, { new: true });
    
    if (!enrollment) {
      return NextResponse.json({ success: false, error: 'Enrollment not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: enrollment }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
