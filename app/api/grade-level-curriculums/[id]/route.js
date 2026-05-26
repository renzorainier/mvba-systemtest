import dbConnect from '@/lib/mongodb';
import SystemSettings, { DEFAULT_SETTINGS_PAYLOAD } from '@/models/SystemSettings';
import GradeLevelCurriculum from '@/models/GradeLevelCurriculum';
import Curriculum from '@/models/Curriculum';
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

const findCurriculumsForSchoolYear = async (schoolYear) => {
  const yearScoped = await Curriculum.find({ schoolYear }).lean();
  if (Array.isArray(yearScoped) && yearScoped.length > 0) {
    return yearScoped;
  }

  const legacy = await Curriculum.find({ schoolYear: { $exists: false } }).lean();
  return Array.isArray(legacy) ? legacy : [];
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
    const { context } = schoolYearAccess;
    const selectedSchoolYear = context?.selectedSchoolYear || '';
    const nextGlCurriculumId = String(body.gl_curriculum_id || body.glCurriculumId || '').trim();

    if (!nextGlCurriculumId) {
      return NextResponse.json({ success: false, error: 'Assignment code is required' }, { status: 400 });
    }

    // prefer DB collection
    const dbExisting = await GradeLevelCurriculum.findById(id).lean();
    const settings = await ensureSettings();

    if (dbExisting) {
      if (nextGlCurriculumId !== String(dbExisting.gl_curriculum_id || '').trim()) {
        const duplicateCode = await GradeLevelCurriculum.findOne({
          gl_curriculum_id: nextGlCurriculumId,
          _id: { $ne: id },
        }).lean();

        if (duplicateCode) {
          return NextResponse.json({ success: false, error: 'Assignment code already exists' }, { status: 409 });
        }
      }

      // resolve curriculum in DB first
      const dbCurriculum = await Curriculum.findById(body.curriculum_id || dbExisting.curriculum_id).lean();
      let curriculum = dbCurriculum;
      if (!curriculum) {
        const curriculums = await findCurriculumsForSchoolYear(selectedSchoolYear);
        curriculum = curriculums.find(
          (item) =>
            (String(item._id) === String(body.curriculum_id) || String(item.curriculum_id) === String(body.curriculum_id)) &&
            (!item.schoolYear || String(item.schoolYear || '').trim() === String(selectedSchoolYear || '').trim())
        );
        if (!curriculum) return NextResponse.json({ success: false, error: 'Curriculum not found' }, { status: 404 });
      }

      const updated = await GradeLevelCurriculum.findByIdAndUpdate(
        id,
        {
          gl_curriculum_id: nextGlCurriculumId,
          // enforce the server-selected school year for assignments
          school_year_id: selectedSchoolYear || dbExisting.school_year_id,
          grade_level: body.grade_level || dbExisting.grade_level,
          curriculum_id: String(curriculum._id || curriculum._id),
          is_default: typeof body.is_default === 'boolean' ? body.is_default : dbExisting.is_default,
        },
        { new: true, runValidators: true }
      ).lean();

      const allCurriculums = await findCurriculumsForSchoolYear(selectedSchoolYear);
      return NextResponse.json({ success: true, data: buildAssignmentPayload(updated, allCurriculums) }, { status: 200 });
    }

    // fallback to settings array
    const existing = settings.gradeLevelCurriculums.find((item) => String(item._id) === String(id) || String(item.gl_curriculum_id) === String(id));

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Grade level curriculum not found' }, { status: 404 });
    }

    const curriculumId = body.curriculum_id || existing.curriculum_id?.toString();
    const curriculum = (await findCurriculumsForSchoolYear(selectedSchoolYear)).find(
      (item) =>
        (String(item._id) === String(curriculumId) || String(item.curriculum_id) === String(curriculumId)) &&
        (!item.schoolYear || String(item.schoolYear || '').trim() === String(selectedSchoolYear || '').trim())
    );
    if (!curriculum) {
      return NextResponse.json({ success: false, error: 'Curriculum not found' }, { status: 404 });
    }

    if (nextGlCurriculumId !== String(existing.gl_curriculum_id || '').trim()) {
      const duplicateCode = settings.gradeLevelCurriculums.find(
        (item) => String(item.gl_curriculum_id || '').trim() === nextGlCurriculumId && String(item._id) !== String(existing._id)
      );

      if (duplicateCode) {
        return NextResponse.json({ success: false, error: 'Assignment code already exists' }, { status: 409 });
      }
    }

    existing.gl_curriculum_id = nextGlCurriculumId;
    existing.school_year_id = selectedSchoolYear || existing.school_year_id;
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

    // prefer DB collection
    const dbExisting = await GradeLevelCurriculum.findById(id).lean();
    if (dbExisting) {
      const linkedSections = (await import('@/models/Section')).default;
      const sectionCount = await linkedSections.countDocuments({ glCurriculumId: String(dbExisting._id) });
      if (sectionCount > 0) {
        return NextResponse.json({ success: false, error: 'Grade level curriculum is used by sections and cannot be deleted' }, { status: 409 });
      }

      await GradeLevelCurriculum.findByIdAndDelete(id);
      return NextResponse.json({ success: true, data: dbExisting }, { status: 200 });
    }

    // fallback to settings
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

    return NextResponse.json({ success: true, data: buildAssignmentPayload(existing, await findCurriculumsForSchoolYear(selectedSchoolYear)) }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}