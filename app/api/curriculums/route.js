import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';
import SystemSettings, { DEFAULT_SETTINGS_PAYLOAD } from '@/models/SystemSettings';
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
  return settings;
};

export async function GET() {
  try {
    await dbConnect();
    const settings = await ensureSettings();
    const curriculums = Array.isArray(settings?.curriculums) ? [...settings.curriculums].reverse() : [];
    return NextResponse.json({ success: true, data: curriculums }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();

    const settings = await ensureSettings();
    const curriculums = Array.isArray(settings?.curriculums) ? settings.curriculums : [];
    const curriculum_id = String(body.curriculum_id || `CUR-${Date.now()}`).trim();

    if (!body.curriculum_name || !body.effective_start_date || !body.effective_end_date) {
      return NextResponse.json({ success: false, error: 'Curriculum name and effective dates are required' }, { status: 400 });
    }

    if (curriculums.some((curriculum) => String(curriculum.curriculum_id || '').trim() === curriculum_id)) {
      return NextResponse.json({ success: false, error: 'Curriculum code already exists' }, { status: 409 });
    }

    const createdCurriculum = {
      _id: new mongoose.Types.ObjectId(),
      curriculum_id,
      curriculum_name: body.curriculum_name,
      description: body.description || '',
      effective_start_date: body.effective_start_date,
      effective_end_date: body.effective_end_date,
      subjects: Array.isArray(body.subjects) ? body.subjects.map(s => ({
        _id: new mongoose.Types.ObjectId(),
        subject_id: s.subject_id || `SUB-${Date.now()}`,
        subject_name: s.subject_name,
        code: s.code || '',
        description: s.description || '',
        default_class_hours: Number(s.default_class_hours || 0),
      })) : [],
    };

    await SystemSettings.collection.updateOne(
      { key: SETTINGS_KEY },
      { $push: { curriculums: createdCurriculum } },
      { upsert: true }
    );

    return NextResponse.json({ success: true, data: createdCurriculum }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}