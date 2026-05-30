import dbConnect from '@/lib/mongodb';
import Schedule from '@/models/Schedule';
import ClassAssignment from '@/models/ClassAssignment';
import { NextResponse } from 'next/server';
import { ensureWriteAllowedForSchoolYear } from '@/lib/school-year';

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const schoolYearAccess = await ensureWriteAllowedForSchoolYear(request);

    if (!schoolYearAccess.allowed) {
      return NextResponse.json(schoolYearAccess.response, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existingSchedule = await Schedule.findById(id);
    if (!existingSchedule) {
      return NextResponse.json({ success: false, error: 'Schedule not found' }, { status: 404 });
    }

    const nextScheduleId = String(body.scheduleId || existingSchedule.scheduleId || '').trim();

    if (!nextScheduleId) {
      return NextResponse.json({ success: false, error: 'Schedule ID is required' }, { status: 400 });
    }

    if (!body.name && !existingSchedule.name) {
      return NextResponse.json({ success: false, error: 'Schedule name is required' }, { status: 400 });
    }

    if (!body.gradeLevel && !existingSchedule.gradeLevel) {
      return NextResponse.json({ success: false, error: 'Grade level is required' }, { status: 400 });
    }

    const duplicateSchedule = await Schedule.findOne({
      scheduleId: nextScheduleId,
      _id: { $ne: id },
    });

    if (duplicateSchedule) {
      return NextResponse.json({ success: false, error: 'Schedule ID already exists' }, { status: 409 });
    }

    const nextItems = Array.isArray(body.items) ? body.items : existingSchedule.items;

    const updatedSchedule = await Schedule.findByIdAndUpdate(
      id,
      {
        scheduleId: nextScheduleId,
        name: body.name ?? existingSchedule.name,
        gradeLevel: body.gradeLevel ?? existingSchedule.gradeLevel,
        totalSubjects: Number.isFinite(Number(body.totalSubjects))
          ? Number(body.totalSubjects)
          : Array.isArray(nextItems)
            ? nextItems.filter((item) => item?.type === 'class').length
            : Number(existingSchedule.totalSubjects || 0),
        items: nextItems,
      },
      { new: true, runValidators: true }
    );

    return NextResponse.json({ success: true, data: updatedSchedule }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const schoolYearAccess = await ensureWriteAllowedForSchoolYear(request);

    if (!schoolYearAccess.allowed) {
      return NextResponse.json(schoolYearAccess.response, { status: 403 });
    }

    const { id } = await params;
    const existingSchedule = await Schedule.findById(id).lean();

    if (!existingSchedule) {
      return NextResponse.json({ success: false, error: 'Schedule not found' }, { status: 404 });
    }

    const classAssignmentCount = await ClassAssignment.countDocuments({ schedule: id });
    if (classAssignmentCount > 0) {
      return NextResponse.json({ success: false, error: 'Schedule is used by a class assignment and cannot be deleted' }, { status: 409 });
    }

    await Schedule.findByIdAndDelete(id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}