import dbConnect from '@/lib/mongodb';
import Schedule from '@/models/Schedule';
import ArchivedSchedule from '@/models/ArchivedSchedule';
import { NextResponse } from 'next/server';
import { ensureWriteAllowedForSchoolYear, getSchoolYearContext } from '@/lib/school-year';

export async function GET(request) {
  try {
    await dbConnect();
    const { selectedSchoolYear, isHistorical } = await getSchoolYearContext(request);
    const schedules = isHistorical
      ? await ArchivedSchedule.find({ schoolYear: selectedSchoolYear }).sort({ createdAt: -1 })
      : await Schedule.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: schedules }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const schoolYearAccess = await ensureWriteAllowedForSchoolYear(request);

    if (!schoolYearAccess.allowed) {
      return NextResponse.json(schoolYearAccess.response, { status: 403 });
    }

    const body = await request.json();
    
    // Map form data to database fields
    const scheduleData = {
      scheduleId: body.scheduleId || `SCH-${Math.floor(1000 + Math.random() * 9000)}`,
      name: body.name,
      gradeLevel: body.gradeLevel,
      totalSubjects: body.totalSubjects,
      items: body.items,
    };
    
    const schedule = await Schedule.create(scheduleData);
    return NextResponse.json({ success: true, data: schedule }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}