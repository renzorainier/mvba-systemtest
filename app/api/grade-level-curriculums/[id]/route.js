import dbConnect from '@/lib/mongodb';
import SystemSettings, { DEFAULT_SETTINGS_PAYLOAD } from '@/models/SystemSettings';
import { NextResponse } from 'next/server';
import { ensureWriteAllowedForSchoolYear } from '@/lib/school-year';

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

const buildAssignmentPayload = (assignment, curriculums = []) => {
  const assignmentData = assignment?.toObject ? assignment.toObject() : assignment;
  const curriculum = curriculums.find((item) => String(item._id) === String(assignment.curriculum_id)) || null;
  return {
    ...assignmentData,
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
  };
};

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const schoolYearAccess = await ensureWriteAllowedForSchoolYear(request);

    if (!schoolYearAccess.allowed) {
      return NextResponse.json(schoolYearAccess.response, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const settings = await ensureSettings();
    const existing = settings.gradeLevelCurriculums.find((item) => String(item._id) === String(id) || String(item.gl_curriculum_id) === String(id));

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Grade level curriculum not found' }, { status: 404 });
    }

    const curriculumId = body.curriculum_id || existing.curriculum_id?.toString();
    const curriculum = settings.curriculums.find((item) => String(item._id) === String(curriculumId) || String(item.curriculum_id) === String(curriculumId));
    if (!curriculum) {
      return NextResponse.json({ success: false, error: 'Curriculum not found' }, { status: 404 });
    }

    existing.school_year_id = body.school_year_id || existing.school_year_id;
    existing.grade_level = body.grade_level || existing.grade_level;
    existing.curriculum_id = String(curriculum._id);
    existing.is_default = typeof body.is_default === 'boolean' ? body.is_default : existing.is_default;

    await SystemSettings.collection.updateOne(
      { key: SETTINGS_KEY },
      { $set: { curriculums: settings.curriculums, gradeLevelCurriculums: settings.gradeLevelCurriculums } }
    );

    return NextResponse.json({ success: true, data: buildAssignmentPayload(existing, settings.curriculums || []) }, { status: 200 });
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

    const settings = await ensureSettings();
    const existing = settings.gradeLevelCurriculums.find((item) => String(item._id) === String(id) || String(item.gl_curriculum_id) === String(id));
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Grade level curriculum not found' }, { status: 404 });
    }

    const linkedSections = (await import('@/models/Section')).default;
    const sectionCount = await linkedSections.countDocuments({ glCurriculumId: existing._id.toString() });
    if (sectionCount > 0) {
      return NextResponse.json({ success: false, error: 'Grade level curriculum is used by sections and cannot be deleted' }, { status: 409 });
    }

    settings.gradeLevelCurriculums = settings.gradeLevelCurriculums.filter((item) => String(item._id) !== String(existing._id));
    await SystemSettings.collection.updateOne(
      { key: SETTINGS_KEY },
      { $set: { curriculums: settings.curriculums, gradeLevelCurriculums: settings.gradeLevelCurriculums } }
    );

    return NextResponse.json({ success: true, data: existing, }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}