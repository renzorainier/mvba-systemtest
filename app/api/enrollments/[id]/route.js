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
    // If learnersReferenceNumber is being changed (or set), ensure no other enrollment uses it
    if (enrollmentData.learnersReferenceNumber) {
      const other = await Enrollment.findOne({ learnersReferenceNumber: enrollmentData.learnersReferenceNumber, _id: { $ne: id } }).lean();
      if (other) {
        return NextResponse.json({ success: false, error: 'Another enrollment already exists for this student' }, { status: 400 });
      }
    }

    // If sectionId is being changed, ensure target section is not full (max 15)
    if (enrollmentData.sectionId) {
      // get current enrollment to compare
      const current = await Enrollment.findById(id).lean();
      const isChangingSection = current && current.sectionId !== enrollmentData.sectionId;
      if (isChangingSection) {
        const count = await Enrollment.countDocuments({ sectionId: enrollmentData.sectionId, _id: { $ne: id } });
        if (count >= 15) {
          return NextResponse.json({ success: false, error: 'Selected section is full (15 students)' }, { status: 400 });
        }
      }
    }

    const enrollment = await Enrollment.findByIdAndUpdate(id, enrollmentData, { new: true });
    
    if (!enrollment) {
      return NextResponse.json({ success: false, error: 'Enrollment not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: enrollment }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    if (!body || typeof body.status !== 'string') {
      return NextResponse.json({ success: false, error: 'Status is required' }, { status: 400 });
    }

    const enrollment = await Enrollment.findByIdAndUpdate(id, { status: body.status }, { new: true });
    if (!enrollment) {
      return NextResponse.json({ success: false, error: 'Enrollment not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: enrollment }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
