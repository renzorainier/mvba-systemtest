import dbConnect from '@/lib/mongodb';
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

  settings.curriculums = Array.isArray(settings.curriculums) ? settings.curriculums : [];
  settings.gradeLevelCurriculums = Array.isArray(settings.gradeLevelCurriculums) ? settings.gradeLevelCurriculums : [];
  return settings;
};

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const settings = await ensureSettings();
    const curriculum = settings.curriculums.find((item) => String(item._id) === String(id) || String(item.curriculum_id) === String(id));
    if (!curriculum) {
      return NextResponse.json({ success: false, error: 'Curriculum not found' }, { status: 404 });
    }

    const updatedCurriculum = {
      ...curriculum,
      curriculum_id: body.curriculum_id ?? curriculum.curriculum_id,
      curriculum_name: body.curriculum_name ?? curriculum.curriculum_name,
      description: body.description ?? curriculum.description,
      effective_start_date: body.effective_start_date ?? curriculum.effective_start_date,
      effective_end_date: body.effective_end_date ?? curriculum.effective_end_date,
    };

    settings.curriculums = settings.curriculums.map((item) => (String(item._id) === String(curriculum._id) ? updatedCurriculum : item));
    await SystemSettings.collection.updateOne(
      { key: SETTINGS_KEY },
      { $set: { curriculums: settings.curriculums, gradeLevelCurriculums: settings.gradeLevelCurriculums } }
    );

    return NextResponse.json({ success: true, data: updatedCurriculum }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    const settings = await ensureSettings();
    const curriculum = settings.curriculums.find((item) => String(item._id) === String(id) || String(item.curriculum_id) === String(id));
    if (!curriculum) {
      return NextResponse.json({ success: false, error: 'Curriculum not found' }, { status: 404 });
    }

    const linkedAssignments = settings.gradeLevelCurriculums.filter(
      (assignment) =>
        String(assignment.curriculum_id || '').trim() === String(curriculum._id || '').trim() ||
        String(assignment.curriculum_id || '').trim() === String(curriculum.curriculum_id || '').trim()
    );
    if (linkedAssignments.length > 0) {
      return NextResponse.json({ success: false, error: 'Curriculum is linked to grade levels and cannot be deleted' }, { status: 409 });
    }

    settings.curriculums = settings.curriculums.filter((item) => String(item._id) !== String(curriculum._id));
    await SystemSettings.collection.updateOne(
      { key: SETTINGS_KEY },
      { $set: { curriculums: settings.curriculums, gradeLevelCurriculums: settings.gradeLevelCurriculums } }
    );

    return NextResponse.json({ success: true, data: curriculum }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}