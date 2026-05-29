import dbConnect from '@/lib/mongodb';
import GradeLevelCurriculum from '@/models/GradeLevelCurriculum';
import Curriculum from '@/models/Curriculum';
import ArchivedCurriculum from '@/models/ArchivedCurriculum';
import { NextResponse } from 'next/server';
import { ensureWriteAllowedForSchoolYear } from '@/lib/school-year';

const findCurriculumsForSchoolYear = async (schoolYear) => {
  const yearScoped = await Curriculum.find({ schoolYear }).lean();
  if (Array.isArray(yearScoped) && yearScoped.length > 0) {
    return yearScoped;
  }

  const archived = await ArchivedCurriculum.find({ schoolYear }).lean();
  if (Array.isArray(archived) && archived.length > 0) {
    return archived;
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

    const dbExisting = await GradeLevelCurriculum.findById(id).lean();

    if (dbExisting) {
      if (nextGlCurriculumId !== String(dbExisting.gl_curriculum_id || '').trim()) {
        const duplicateCode = await GradeLevelCurriculum.findOne({
          school_year_id: String(dbExisting.school_year_id || selectedSchoolYear || '').trim(),
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

    return NextResponse.json({ success: false, error: 'Grade level curriculum not found' }, { status: 404 });
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

    return NextResponse.json({ success: false, error: 'Grade level curriculum not found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}