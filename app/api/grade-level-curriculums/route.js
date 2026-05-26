import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';
import SystemSettings, { DEFAULT_SETTINGS_PAYLOAD } from '@/models/SystemSettings';
import ArchivedGradeLevelCurriculum from '@/models/ArchivedGradeLevelCurriculum';
import GradeLevelCurriculum from '@/models/GradeLevelCurriculum';
import Curriculum from '@/models/Curriculum';
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

const findCurriculumsForSchoolYear = async (schoolYear) => {
  const yearScoped = await Curriculum.find({ schoolYear }).lean();
  if (Array.isArray(yearScoped) && yearScoped.length > 0) {
    return yearScoped;
  }

  const legacy = await Curriculum.find({ schoolYear: { $exists: false } }).lean();
  if (Array.isArray(legacy) && legacy.length > 0) {
    return legacy;
  }

  return [];
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
    const schoolYearId = searchParams.get('schoolYearId') || searchParams.get('school_year_id') || selectedSchoolYear || '';
    const gradeLevel = searchParams.get('gradeLevel') || searchParams.get('grade_level') || '';

    let sourceAssignments = [];

    if (isHistorical) {
      sourceAssignments = await ArchivedGradeLevelCurriculum.find({ schoolYear: selectedSchoolYear }).lean();
    } else {
      const dbFilter = { school_year_id: selectedSchoolYear };
      if (schoolYearId) dbFilter.school_year_id = schoolYearId;
      if (gradeLevel) dbFilter.grade_level = gradeLevel;

      const dbAssignments = await GradeLevelCurriculum.find(dbFilter).lean();
      if (Array.isArray(dbAssignments) && dbAssignments.length > 0) {
        sourceAssignments = dbAssignments;
      } else {
        const yearScopedSettings = settings.gradeLevelCurriculums.filter(
          (assignment) => String(assignment.school_year_id || '').trim() === String(selectedSchoolYear || '').trim()
        );
        const legacySettings = settings.gradeLevelCurriculums.filter((assignment) => !assignment.school_year_id);
        sourceAssignments = yearScopedSettings.length > 0 ? yearScopedSettings : legacySettings;
      }
    }

    const curriculumsSource = await findCurriculumsForSchoolYear(selectedSchoolYear);

    const assignments = sourceAssignments
      .filter((assignment) => !schoolYearId || String(assignment.school_year_id || assignment.schoolYear || '').trim() === String(schoolYearId).trim())
      .filter((assignment) => !gradeLevel || String(assignment.grade_level || '').trim() === gradeLevel)
      .map((assignment) => buildAssignmentPayload(assignment, curriculumsSource))
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
    const selectedSchoolYear = schoolYearAccess.context?.selectedSchoolYear || '';
    const settings = await ensureSettings();

    const dbCurriculum = await Curriculum.findOne({
      $and: [
        { $or: [{ _id: body.curriculum_id }, { curriculum_id: body.curriculum_id }] },
        { $or: [{ schoolYear: selectedSchoolYear }, { schoolYear: { $exists: false } }] },
      ],
    }).lean();

    let curriculum = null;
    let useDb = false;

    if (dbCurriculum) {
      curriculum = dbCurriculum;
      useDb = true;
    } else {
      const curriculums = await findCurriculumsForSchoolYear(selectedSchoolYear);
      curriculum = curriculums.find(
        (item) =>
          (String(item._id) === String(body.curriculum_id) || String(item.curriculum_id) === String(body.curriculum_id)) &&
          (!item.schoolYear || String(item.schoolYear || '').trim() === String(selectedSchoolYear || '').trim())
      );
    }

    if (!curriculum) {
      return NextResponse.json({ success: false, error: 'Curriculum not found' }, { status: 404 });
    }

    if (!selectedSchoolYear || !body.grade_level) {
      return NextResponse.json({ success: false, error: 'Grade level is required' }, { status: 400 });
    }

    if (useDb) {
      const existing = await GradeLevelCurriculum.findOne({
        school_year_id: String(selectedSchoolYear).trim(),
        grade_level: String(body.grade_level).trim(),
        curriculum_id: String(curriculum._id),
      }).lean();

      if (existing) {
        return NextResponse.json({ success: false, error: 'This grade level curriculum assignment already exists' }, { status: 409 });
      }

      const glDoc = await GradeLevelCurriculum.create({
        gl_curriculum_id: body.gl_curriculum_id || `GLC-${Date.now()}`,
        school_year_id: selectedSchoolYear,
        grade_level: body.grade_level,
        curriculum_id: String(curriculum._id),
        is_default: Boolean(body.is_default),
      });

      const allCurriculums = await findCurriculumsForSchoolYear(selectedSchoolYear);
      return NextResponse.json({ success: true, data: buildAssignmentPayload(glDoc.toObject ? glDoc.toObject() : glDoc, allCurriculums) }, { status: 201 });
    }

    const duplicate = settings.gradeLevelCurriculums.find(
      (assignment) =>
        String(assignment.school_year_id || '').trim() === String(selectedSchoolYear || '').trim() &&
        String(assignment.grade_level || '').trim() === String(body.grade_level || '').trim() &&
        String(assignment.curriculum_id || '').trim() === String(curriculum._id).trim()
    );

    if (duplicate) {
      return NextResponse.json({ success: false, error: 'This grade level curriculum assignment already exists' }, { status: 409 });
    }

    const glCurriculum = {
      _id: new mongoose.Types.ObjectId(),
      gl_curriculum_id: body.gl_curriculum_id || `GLC-${Date.now()}`,
      school_year_id: selectedSchoolYear,
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

    return NextResponse.json({ success: true, data: buildAssignmentPayload(glCurriculum, await findCurriculumsForSchoolYear(selectedSchoolYear)) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
