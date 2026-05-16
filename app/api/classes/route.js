import dbConnect from '@/lib/mongodb';
import ClassAssignment from '@/models/ClassAssignment';
import Section from '@/models/Section';
import Teacher from '@/models/Teachers';
import Schedule from '@/models/Schedule';
import { NextResponse } from 'next/server';

const buildAssignmentQuery = () => (
  ClassAssignment.find({})
    .populate('section')
    .populate('teacher')
    .populate('schedule')
    .sort({ createdAt: -1 })
);

export async function GET() {
  try {
    await dbConnect();
    const assignments = await buildAssignmentQuery();
    return NextResponse.json({ success: true, data: assignments }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { sectionId, teacherId, scheduleId } = body;

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

    const existingAssignment = await ClassAssignment.findOne({ section: sectionId });
    if (existingAssignment) {
      return NextResponse.json({ success: false, error: 'This section already has a class assignment' }, { status: 409 });
    }

    const assignment = await ClassAssignment.create({
      assignmentId: body.assignmentId || `CA-${Date.now()}`,
      section: sectionId,
      teacher: teacherId,
      schedule: scheduleId,
    });

    const populatedAssignment = await ClassAssignment.findById(assignment._id)
      .populate('section')
      .populate('teacher')
      .populate('schedule');

    return NextResponse.json({ success: true, data: populatedAssignment }, { status: 201 });
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json({ success: false, error: 'This section already has a class assignment' }, { status: 409 });
    }

    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}