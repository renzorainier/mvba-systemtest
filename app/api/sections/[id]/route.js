import dbConnect from '@/lib/mongodb';
import SystemSettings, { DEFAULT_SETTINGS_PAYLOAD } from '@/models/SystemSettings';
import GradeLevelCurriculum from '@/models/GradeLevelCurriculum';
import Curriculum from '@/models/Curriculum';
import Section from '@/models/Section';
import Enrollment from '@/models/Enrollment';
import ClassAssignment from '@/models/ClassAssignment';
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

const serializeCurriculum = (curriculum) => {
  if (!curriculum) {
    return null;
  }

  return {
    _id: curriculum._id,
    curriculum_id: curriculum.curriculum_id,
    curriculum_name: curriculum.curriculum_name,
    description: curriculum.description,
    effective_start_date: curriculum.effective_start_date,
    effective_end_date: curriculum.effective_end_date,
  };
};

const buildSectionPayload = async (section, settings) => {
  const sectionData = section?.toObject ? section.toObject() : section;
  const sectionAssignmentId = String(sectionData.glCurriculumId || '').trim();

  let assignment = null;
  if (sectionAssignmentId) {
    try {
      assignment = await GradeLevelCurriculum.findById(sectionAssignmentId).lean();
    } catch (error) {
      assignment = null;
    }
  }

  if (!assignment) {
    assignment = (settings.gradeLevelCurriculums || []).find((item) => String(item._id) === sectionAssignmentId || String(item.gl_curriculum_id || '') === sectionAssignmentId) || null;
  }

  let curriculum = null;
  const assignmentCurriculumId = assignment ? String(assignment.curriculum_id || '').trim() : '';

  if (assignmentCurriculumId) {
    try {
      curriculum = await Curriculum.findById(assignmentCurriculumId).lean();
    } catch (error) {
      curriculum = null;
    }
  }

  if (!curriculum && assignmentCurriculumId) {
    curriculum = (settings.curriculums || []).find((item) => String(item._id) === assignmentCurriculumId || String(item.curriculum_id || '') === assignmentCurriculumId) || null;
  }

  const assignmentData = assignment?.toObject ? assignment.toObject() : assignment;
  const curriculumData = curriculum?.toObject ? curriculum.toObject() : curriculum;

  return {
    ...sectionData,
    glCurriculumId: assignmentData
      ? {
          ...assignmentData,
          curriculum_id: serializeCurriculum(curriculumData),
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

    // Map form field names to database field names. Use server-selected school year.
    const sectionData = {
      sectionName: body.sectionName,
      gradeLevel: body.gradeLevel,
      schoolYear: selectedSchoolYear,
      glCurriculumId: body.glCurriculumId || body.gl_curriculum_id,
      roomNumber: body.roomNumber,
      sectionId: body.sectionId,
    };

      if (!sectionData.sectionName || !sectionData.gradeLevel || !sectionData.schoolYear || !sectionData.glCurriculumId || !sectionData.roomNumber) {
        return NextResponse.json({ success: false, error: 'Section name, grade level, school year, curriculum, and room number are required' }, { status: 400 });
      }

      // Prefer grade-level assignments stored in the dedicated collection
      let gradeLevelCurriculum = null;
      if (sectionData.glCurriculumId) {
        try {
          gradeLevelCurriculum = await GradeLevelCurriculum.findById(sectionData.glCurriculumId).lean();
        } catch (e) {
          gradeLevelCurriculum = null;
        }
      }

      // Fallback to legacy SystemSettings entries
      if (!gradeLevelCurriculum) {
        const settings = await ensureSettings();
        gradeLevelCurriculum = (settings.gradeLevelCurriculums || []).find((item) => String(item._id) === String(sectionData.glCurriculumId));
      }

      if (!gradeLevelCurriculum) {
        return NextResponse.json({ success: false, error: 'Selected grade-level curriculum not found' }, { status: 404 });
      }

      const settings = await ensureSettings();

      if (String(gradeLevelCurriculum.school_year_id || '').trim() !== String(sectionData.schoolYear || '').trim() || String(gradeLevelCurriculum.grade_level || '').trim() !== String(sectionData.gradeLevel || '').trim()) {
        return NextResponse.json({ success: false, error: 'Selected curriculum does not match the section school year and grade level' }, { status: 400 });
      }
    
      const section = await Section.findByIdAndUpdate(id, sectionData, { new: true });
    
    if (!section) {
      return NextResponse.json({ success: false, error: 'Section not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: await buildSectionPayload(section, settings) }, { status: 200 });
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
    const section = await Section.findById(id).lean();

    if (!section) {
      return NextResponse.json({ success: false, error: 'Section not found' }, { status: 404 });
    }

    const [enrollmentCount, classAssignmentCount] = await Promise.all([
      Enrollment.countDocuments({ sectionId: section.sectionId }),
      ClassAssignment.countDocuments({ section: id }),
    ]);

    if (enrollmentCount > 0) {
      return NextResponse.json({ success: false, error: 'Section has enrolled students and cannot be deleted' }, { status: 409 });
    }

    if (classAssignmentCount > 0) {
      return NextResponse.json({ success: false, error: 'Section is used by a class assignment and cannot be deleted' }, { status: 409 });
    }

    await Section.findByIdAndDelete(id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
