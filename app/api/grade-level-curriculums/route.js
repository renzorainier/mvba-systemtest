import dbConnect from '@/lib/mongodb';
import ArchivedGradeLevelCurriculum from '@/models/ArchivedGradeLevelCurriculum';
import GradeLevelCurriculum from '@/models/GradeLevelCurriculum';
import Curriculum from '@/models/Curriculum';
import { NextResponse } from 'next/server';
import { ensureWriteAllowedForSchoolYear, getSchoolYearContext } from '@/lib/school-year';

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
      sourceAssignments = await GradeLevelCurriculum.find(dbFilter).lean();
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

    const dbCurriculum = await Curriculum.findOne({
      $and: [
        { $or: [{ _id: body.curriculum_id }, { curriculum_id: body.curriculum_id }] },
        { $or: [{ schoolYear: selectedSchoolYear }, { schoolYear: { $exists: false } }] },
      ],
    }).lean();

    let curriculum = null;

    if (dbCurriculum) {
      curriculum = dbCurriculum;
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

    const existing = await GradeLevelCurriculum.findOne({
      school_year_id: String(selectedSchoolYear).trim(),
      grade_level: String(body.grade_level).trim(),
      curriculum_id: String(curriculum._id),
    }).lean();

    if (existing) {
      return NextResponse.json({ success: false, error: 'This grade level curriculum assignment already exists' }, { status: 409 });
    }

    const duplicateCode = await GradeLevelCurriculum.findOne({
      school_year_id: String(selectedSchoolYear).trim(),
      gl_curriculum_id: String(body.gl_curriculum_id || '').trim(),
    }).lean();

    if (duplicateCode) {
      return NextResponse.json({ success: false, error: 'Assignment code already exists' }, { status: 409 });
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
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
