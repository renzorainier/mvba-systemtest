import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';
import SystemSettings, { DEFAULT_SETTINGS_PAYLOAD } from '@/models/SystemSettings';
import Curriculum from '@/models/Curriculum';
import ArchivedCurriculum from '@/models/ArchivedCurriculum';
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
  return settings;
};

export async function GET(request) {
  try {
    await dbConnect();
    const { selectedSchoolYear, isHistorical } = await getSchoolYearContext(request);

    if (isHistorical) {
      const archivedCurriculums = await ArchivedCurriculum.find({ schoolYear: selectedSchoolYear }).sort({ createdAt: -1 }).lean();
      if (Array.isArray(archivedCurriculums) && archivedCurriculums.length > 0) {
        return NextResponse.json({ success: true, data: archivedCurriculums }, { status: 200 });
      }
    }

    const fromCollection = await Curriculum.find({ schoolYear: selectedSchoolYear }).sort({ createdAt: -1 }).lean();
    if (Array.isArray(fromCollection) && fromCollection.length > 0) {
      return NextResponse.json({ success: true, data: fromCollection }, { status: 200 });
    }

    const legacyCollection = await Curriculum.find({ schoolYear: { $exists: false } }).sort({ createdAt: -1 }).lean();
    if (Array.isArray(legacyCollection) && legacyCollection.length > 0) {
      return NextResponse.json({ success: true, data: legacyCollection }, { status: 200 });
    }

    const settings = await ensureSettings();
    const settingsCurriculums = Array.isArray(settings?.curriculums) ? [...settings.curriculums] : [];
    const yearScopedSettings = settingsCurriculums.filter((curriculum) => String(curriculum.schoolYear || '').trim() === String(selectedSchoolYear).trim());
    const legacySettings = settingsCurriculums.filter((curriculum) => !curriculum.schoolYear);
    const curriculums = (yearScopedSettings.length > 0 ? yearScopedSettings : legacySettings).reverse();
    return NextResponse.json({ success: true, data: curriculums }, { status: 200 });
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
    const { context } = schoolYearAccess;
    const selectedSchoolYear = context?.selectedSchoolYear || '';

    // Create curriculum in dedicated collection
    if (!body.curriculum_name || !body.effective_start_date || !body.effective_end_date) {
      return NextResponse.json({ success: false, error: 'Curriculum name and effective dates are required' }, { status: 400 });
    }

    const curriculum_id = String(body.curriculum_id || `CUR-${Date.now()}`).trim();
    const exists = await Curriculum.findOne({ curriculum_id, schoolYear: selectedSchoolYear }).lean();
    if (exists) {
      return NextResponse.json({ success: false, error: 'Curriculum code already exists' }, { status: 409 });
    }

    const subjects = Array.isArray(body.subjects) ? body.subjects.map(s => ({
      subject_id: s.subject_id || `SUB-${Date.now()}`,
      subject_name: s.subject_name,
      code: s.code || '',
      description: s.description || '',
      default_class_hours: Number(s.default_class_hours || 0),
    })) : [];

    const payload = {
      curriculum_id,
      schoolYear: selectedSchoolYear,
      curriculum_name: body.curriculum_name,
      description: body.description || '',
      effective_start_date: new Date(body.effective_start_date),
      effective_end_date: new Date(body.effective_end_date),
      subjects,
    };

    const created = await Curriculum.create(payload);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}