import dbConnect from '@/lib/mongodb';
import SystemSettings, { DEFAULT_SETTINGS_PAYLOAD } from '@/models/SystemSettings';
import Section from '@/models/Section';
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

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    
    // Map form field names to database field names
    const sectionData = {
      sectionName: body.sectionName,
      gradeLevel: body.gradeLevel,
      schoolYear: body.schoolYear,
        glCurriculumId: body.glCurriculumId || body.gl_curriculum_id,
      roomNumber: body.roomNumber,
      sectionId: body.sectionId,
    };

      if (!sectionData.sectionName || !sectionData.gradeLevel || !sectionData.schoolYear || !sectionData.glCurriculumId || !sectionData.roomNumber) {
        return NextResponse.json({ success: false, error: 'Section name, grade level, school year, curriculum, and room number are required' }, { status: 400 });
      }

      const settings = await ensureSettings();
      const gradeLevelCurriculum = (settings.gradeLevelCurriculums || []).find((item) => String(item._id) === String(sectionData.glCurriculumId));
    if (!gradeLevelCurriculum) {
      return NextResponse.json({ success: false, error: 'Selected grade-level curriculum not found' }, { status: 404 });
    }

    if (String(gradeLevelCurriculum.school_year_id || '').trim() !== String(sectionData.schoolYear || '').trim() || String(gradeLevelCurriculum.grade_level || '').trim() !== String(sectionData.gradeLevel || '').trim()) {
      return NextResponse.json({ success: false, error: 'Selected curriculum does not match the section school year and grade level' }, { status: 400 });
    }
    
      const section = await Section.findByIdAndUpdate(id, sectionData, { new: true });
    
    if (!section) {
      return NextResponse.json({ success: false, error: 'Section not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: section }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
