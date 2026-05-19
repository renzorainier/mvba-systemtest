import dbConnect from '@/lib/mongodb';
import Teachers from '@/models/Teachers';
import { ensureWriteAllowedForSchoolYear } from '@/lib/school-year';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const schoolYearAccess = await ensureWriteAllowedForSchoolYear(request);

    if (!schoolYearAccess.allowed) {
      return NextResponse.json(schoolYearAccess.response, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    
    // Map form field names to database field names
    const teacherData = {
      firstName: body.firstName,
      lastName: body.lastName,
      middleName: body.middleName,
      phoneNumber: body.phoneNumber,
      email: body.email,
      hireDate: body.hireDate,
      teacherId: body.teacherId,
    };
    
    const teacher = await Teachers.findByIdAndUpdate(id, teacherData, { new: true });
    
    if (!teacher) {
      return NextResponse.json({ success: false, error: 'Teacher not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: teacher }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
