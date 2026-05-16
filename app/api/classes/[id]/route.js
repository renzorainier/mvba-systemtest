import dbConnect from '@/lib/mongodb';
import ClassAssignment from '@/models/ClassAssignment';
import Section from '@/models/Section';
import Teacher from '@/models/Teachers';
import Schedule from '@/models/Schedule';
import { NextResponse } from 'next/server';

const getPopulatedAssignment = (id) => (
  ClassAssignment.findById(id)
    .populate('section')
    .populate('teacher')
    .populate('schedule')
);

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const { id } = params;
    const body = await request.json();
    const existingAssignment = await ClassAssignment.findById(id);

    if (!existingAssignment) {
      return NextResponse.json({ success: false, error: 'Class assignment not found' }, { status: 404 });
    }

    const sectionId = body.sectionId || existingAssignment.section?.toString();
    const teacherId = body.teacherId || existingAssignment.teacher?.toString();
    const scheduleId = body.scheduleId || existingAssignment.schedule?.toString();

    if (!sectionId || !teacherId || !scheduleId) {
      return NextResponse.json({ success: false, error: 'Section, teacher, and schedule are required' }, { status: 400 });
    }

    const [section, teacher, schedule] = await Promise.all([
      Section.findById(sectionId),
      Teacher.findById(teacherId),
      Schedule.findById(scheduleId),
    ]);

    if (!section) {
      return NextResponse.json({ success: false, error: 'Section not found' }, { status: 404 });
    }

    if (!teacher) {
      return NextResponse.json({ success: false, error: 'Teacher not found' }, { status: 404 });
    }

    if (!schedule) {
      return NextResponse.json({ success: false, error: 'Schedule not found' }, { status: 404 });
    }

    if (String(section.gradeLevel || '').trim() !== String(schedule.gradeLevel || '').trim()) {
      return NextResponse.json({ success: false, error: 'Section and schedule must have the same grade level' }, { status: 400 });
    }

    const duplicateAssignment = await ClassAssignment.findOne({ section: sectionId, _id: { $ne: id } });
    if (duplicateAssignment) {
      return NextResponse.json({ success: false, error: 'This section already has a class assignment' }, { status: 409 });
    }

    const assignment = await ClassAssignment.findByIdAndUpdate(
      id,
      {
        section: sectionId,
        teacher: teacherId,
        schedule: scheduleId,
      },
      { new: true, runValidators: true }
    );

    const populatedAssignment = await getPopulatedAssignment(assignment._id);
    return NextResponse.json({ success: true, data: populatedAssignment }, { status: 200 });
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json({ success: false, error: 'This section already has a class assignment' }, { status: 409 });
    }

    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const { id } = params;
    const assignment = await ClassAssignment.findByIdAndDelete(id);

    if (!assignment) {
      return NextResponse.json({ success: false, error: 'Class assignment not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: assignment }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}