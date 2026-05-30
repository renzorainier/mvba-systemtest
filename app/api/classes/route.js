import dbConnect from '@/lib/mongodb';
import ClassAssignment from '@/models/ClassAssignment';
import SystemSettings, { DEFAULT_SETTINGS_PAYLOAD } from '@/models/SystemSettings';
import Section from '@/models/Section';
import Teacher from '@/models/Teachers';
import Schedule from '@/models/Schedule';
import GradeLevelCurriculum from '@/models/GradeLevelCurriculum';
import ArchivedClassAssignment from '@/models/ArchivedClassAssignment';
import Curriculum from '@/models/Curriculum';
import { NextResponse } from 'next/server';
import { ensureWriteAllowedForSchoolYear, getSchoolYearContext, buildLiveYearFilter, getStampYear } from '@/lib/school-year';

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
    // Mongoose ObjectId instances have toHexString / toString
    if (value._id) return String(value._id);
    if (typeof value.toHexString === 'function') return String(value.toHexString());
    if (value.gl_curriculum_id) return String(value.gl_curriculum_id);
    if (value.curriculum_id && typeof value.curriculum_id === 'string') return value.curriculum_id;
    if (value.curriculum_id && value.curriculum_id._id) return String(value.curriculum_id._id);
    // fallback to string conversion
    try {
      const asStr = String(value);
      if (asStr && asStr !== '[object Object]') return asStr;
    } catch (e) {
      /* ignore */
    }
    return '';
  }
  return String(value);
};

const enrichAssignment = async (assignment, settings, selectedSchoolYear) => {
  const section = assignment.section?.toObject ? assignment.section.toObject() : assignment.section;

  let assignmentLink = null;
  let curriculum = null;

  if (section?.glCurriculumId) {
    // Try DB year-scoped GradeLevelCurriculum first
    const dbGl = await GradeLevelCurriculum.findOne({
      $or: [{ _id: section.glCurriculumId }, { gl_curriculum_id: section.glCurriculumId }],
    }).lean();

    if (dbGl && String(dbGl.school_year_id || '').trim() === String(selectedSchoolYear || '').trim()) {
      assignmentLink = dbGl;
      if (dbGl.curriculum_id) {
        curriculum = await Curriculum.findById(dbGl.curriculum_id).lean();
      }
    }
  }

  if (!assignmentLink) {
    assignmentLink = section?.glCurriculumId
      ? (settings.gradeLevelCurriculums || []).find((item) => String(item._id) === String(section.glCurriculumId))
      : null;

    if (assignmentLink) {
      curriculum = (settings.curriculums || []).find((item) => String(item._id) === String(assignmentLink.curriculum_id)) || null;
    }
  }

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

const buildAssignmentQuery = (filter = {}) => (
  ClassAssignment.find(filter)
    .populate('section')
    .populate('teacher')
    .populate('schedule')
    .sort({ createdAt: -1 })
);

export async function GET(request) {
  try {
    await dbConnect();
    const context = await getSchoolYearContext(request);
    const { selectedSchoolYear, isHistorical } = context;
    const settings = await ensureSettings();
    if (isHistorical) {
      const assignments = await ArchivedClassAssignment.find({ schoolYear: selectedSchoolYear }).sort({ createdAt: -1 });
      return NextResponse.json({ success: true, data: assignments }, { status: 200 });
    }

    const assignments = await buildAssignmentQuery(buildLiveYearFilter(context));
    const enriched = await Promise.all(assignments.map((assignment) => enrichAssignment(assignment, settings, selectedSchoolYear)));
    return NextResponse.json({ success: true, data: enriched }, { status: 200 });
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

    const settings = await ensureSettings();
    const sectionCurriculumId = resolveCurriculumAssignmentId(section.glCurriculumId);

    // Prefer year-scoped grade-level curriculum documents in the DB, fallback to legacy settings
    const selectedSchoolYear = schoolYearAccess.context?.selectedSchoolYear || '';
    let sectionCurriculum = null;

    if (sectionCurriculumId) {
      const dbGl = await GradeLevelCurriculum.findOne({
        $and: [
          { $or: [{ _id: sectionCurriculumId }, { gl_curriculum_id: sectionCurriculumId }] },
          { school_year_id: selectedSchoolYear },
        ],
      }).lean();

      if (dbGl) {
        sectionCurriculum = dbGl;
      }
    }

    if (!sectionCurriculum) {
      sectionCurriculum = (settings.gradeLevelCurriculums || []).find((item) => String(item._id) === sectionCurriculumId);
    }

    if (!sectionCurriculum) {
      return NextResponse.json({ success: false, error: 'Section must be linked to a grade-level curriculum before creating a class assignment' }, { status: 400 });
    }

    if (String(sectionCurriculum.grade_level || '').trim() !== String(section.gradeLevel || '').trim()) {
      return NextResponse.json({ success: false, error: 'Section curriculum grade level does not match the section' }, { status: 400 });
    }

    const existingAssignment = await ClassAssignment.findOne({ section: sectionId });
    if (existingAssignment) {
      return NextResponse.json({ success: false, error: 'This section already has a class assignment' }, { status: 409 });
    }

    const existingTeacherAssignment = await ClassAssignment.findOne({
      teacher: teacherId,
      ...buildLiveYearFilter(schoolYearAccess.context),
    });
    if (existingTeacherAssignment) {
      return NextResponse.json({ success: false, error: 'This teacher already has a class assignment for this school year' }, { status: 409 });
    }

    const existingScheduleAssignment = await ClassAssignment.findOne({ schedule: scheduleId });
    if (existingScheduleAssignment) {
      return NextResponse.json({ success: false, error: 'This schedule already has a class assignment' }, { status: 409 });
    }

    const assignment = await ClassAssignment.create({
      assignmentId: body.assignmentId || `CA-${Date.now()}`,
      section: sectionId,
      teacher: teacherId,
      schedule: scheduleId,
      schoolYear: getStampYear(schoolYearAccess.context),
    });

    const populatedAssignment = await ClassAssignment.findById(assignment._id)
      .populate('section')
      .populate('teacher')
      .populate('schedule');

    return NextResponse.json({ success: true, data: enrichAssignment(populatedAssignment, settings) }, { status: 201 });
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json({ success: false, error: 'This section already has a class assignment' }, { status: 409 });
    }

    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}