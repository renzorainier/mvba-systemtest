import dbConnect from '@/lib/mongodb';
import ClassAssignment from '@/models/ClassAssignment';
import SystemSettings, { DEFAULT_SETTINGS_PAYLOAD } from '@/models/SystemSettings';
import Section from '@/models/Section';
import Teacher from '@/models/Teachers';
import Schedule from '@/models/Schedule';
import { NextResponse } from 'next/server';

const SETTINGS_KEY = 'tuition-breakdown';

const ensureSettings = async () => {
  const collection = SystemSettings.collection;
  let settings = await collection.findOne({ key: SETTINGS_KEY });
  if (!settings) {
    await collection.updateOne(
      { key: SETTINGS_KEY },
      { $setOnInsert: { ...DEFAULT_SETTINGS_PAYLOAD, curriculums: [], gradeLevelCurriculums: [] } },
      { upsert: true }
    );
    settings = await collection.findOne({ key: SETTINGS_KEY });
  }

  settings.curriculums = Array.isArray(settings.curriculums) ? settings.curriculums : [];
  settings.gradeLevelCurriculums = Array.isArray(settings.gradeLevelCurriculums) ? settings.gradeLevelCurriculums : [];
  return settings;
};

const resolveCurriculumAssignmentId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    if (value._id) return String(value._id);
    if (typeof value.toHexString === 'function') return String(value.toHexString());
    if (value.gl_curriculum_id) return String(value.gl_curriculum_id);
    if (value.curriculum_id && typeof value.curriculum_id === 'string') return value.curriculum_id;
    if (value.curriculum_id && value.curriculum_id._id) return String(value.curriculum_id._id);
    try {
      const asStr = String(value);
      if (asStr && asStr !== '[object Object]') return asStr;
    } catch (e) {}
    return '';
  }
  return String(value);
};

const enrichAssignment = (assignment, settings) => {
  const section = assignment.section?.toObject ? assignment.section.toObject() : assignment.section;
  const assignmentLink = section?.glCurriculumId
    ? (settings.gradeLevelCurriculums || []).find((item) => String(item._id) === String(section.glCurriculumId))
    : null;
  const curriculum = assignmentLink
    ? (settings.curriculums || []).find((item) => String(item._id) === String(assignmentLink.curriculum_id))
    : null;

  return {
    ...assignment.toObject(),
    section: section
      ? {
          ...section,
          glCurriculumId: assignmentLink
            ? {
                ...(assignmentLink?.toObject ? assignmentLink.toObject() : assignmentLink),
                curriculum_id: curriculum
                  ? {
                      _id: curriculum._id,
                      curriculum_id: curriculum.curriculum_id,
                      curriculum_name: curriculum.curriculum_name,
                      description: curriculum.description,
                      effective_start_date: curriculum.effective_start_date,
                      effective_end_date: curriculum.effective_end_date,
                    }
                  : null,
              }
            : null,
        }
      : null,
  };
};

const getPopulatedAssignment = (id) => (
  ClassAssignment.findById(id)
    .populate('section')
    .populate('teacher')
    .populate('schedule')
);

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
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

    const settings = await ensureSettings();
    const sectionCurriculumId = resolveCurriculumAssignmentId(section.glCurriculumId);
    const sectionCurriculum = (settings.gradeLevelCurriculums || []).find((item) => String(item._id) === sectionCurriculumId);

    if (!sectionCurriculum) {
      return NextResponse.json({ success: false, error: 'Section must be linked to a grade-level curriculum before creating a class assignment' }, { status: 400 });
    }

    if (String(sectionCurriculum.grade_level || '').trim() !== String(section.gradeLevel || '').trim()) {
      return NextResponse.json({ success: false, error: 'Section curriculum grade level does not match the section' }, { status: 400 });
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
    return NextResponse.json({ success: true, data: enrichAssignment(populatedAssignment, settings) }, { status: 200 });
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
    const { id } = await params;
    const assignment = await ClassAssignment.findByIdAndDelete(id);

    if (!assignment) {
      return NextResponse.json({ success: false, error: 'Class assignment not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: assignment }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}