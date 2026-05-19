import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';
import SystemSettings, { DEFAULT_SETTINGS_PAYLOAD } from '@/models/SystemSettings';
import ArchivedGradeLevelCurriculum from '@/models/ArchivedGradeLevelCurriculum';
import { NextResponse } from 'next/server';
import { ensureWriteAllowedForSchoolYear, getSchoolYearContext } from '@/lib/school-year';

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
          subjects: Array.isArray(curriculum.subjects) ? curriculum.subjects : [],
        }
      : null,
  };
};

export async function GET(request) {
  try {
    await dbConnect();
    const { selectedSchoolYear, isHistorical } = await getSchoolYearContext(request);
    const settings = await ensureSettings();
    const { searchParams } = new URL(request.url);
    const schoolYearId = searchParams.get('schoolYearId') || searchParams.get('school_year_id') || '';
    const gradeLevel = searchParams.get('gradeLevel') || searchParams.get('grade_level') || '';

    const sourceAssignments = isHistorical
      ? await ArchivedGradeLevelCurriculum.find({ schoolYear: selectedSchoolYear }).lean()
      : settings.gradeLevelCurriculums;

    const assignments = sourceAssignments
      .filter((assignment) => !schoolYearId || String(assignment.school_year_id || assignment.schoolYear || '').trim() === schoolYearId)
      .filter((assignment) => !gradeLevel || String(assignment.grade_level || '').trim() === gradeLevel)
      .map((assignment) => buildAssignmentPayload(assignment, settings.curriculums || []))
      .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));

    return NextResponse.json({ success: true, data: assignments }, { status: 200 });
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

    const settings = await ensureSettings();
    const curriculums = settings.curriculums;
    const curriculum = curriculums.find((item) => String(item._id) === String(body.curriculum_id) || String(item.curriculum_id) === String(body.curriculum_id));

    if (!curriculum) {
      return NextResponse.json({ success: false, error: 'Curriculum not found' }, { status: 404 });
    }

    if (!body.school_year_id || !body.grade_level) {
      return NextResponse.json({ success: false, error: 'School year and grade level are required' }, { status: 400 });
    }

    const duplicate = settings.gradeLevelCurriculums.find(
      (assignment) =>
        String(assignment.school_year_id || '').trim() === String(body.school_year_id || '').trim() &&
        String(assignment.grade_level || '').trim() === String(body.grade_level || '').trim() &&
        String(assignment.curriculum_id || '').trim() === String(curriculum._id).trim()
    );

    if (duplicate) {
      return NextResponse.json({ success: false, error: 'This grade level curriculum assignment already exists' }, { status: 409 });
    }

    const glCurriculum = {
      _id: new mongoose.Types.ObjectId(),
      gl_curriculum_id: body.gl_curriculum_id || `GLC-${Date.now()}`,
      school_year_id: body.school_year_id,
      grade_level: body.grade_level,
      curriculum_id: String(curriculum._id),
      is_default: Boolean(body.is_default),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    settings.gradeLevelCurriculums.push(glCurriculum);
    await SystemSettings.collection.updateOne(
      { key: SETTINGS_KEY },
      { $set: { curriculums: settings.curriculums, gradeLevelCurriculums: settings.gradeLevelCurriculums } }
    );

    return NextResponse.json({ success: true, data: buildAssignmentPayload(glCurriculum, settings.curriculums || []) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}