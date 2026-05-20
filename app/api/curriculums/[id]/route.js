import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';
import Curriculum from '@/models/Curriculum';
import SystemSettings from '@/models/SystemSettings';
import { NextResponse } from 'next/server';
import { ensureWriteAllowedForSchoolYear } from '@/lib/school-year';

const SETTINGS_KEY = 'tuition-breakdown';

const ensureSettings = async () => {
  const collection = SystemSettings.collection;
  let settings = await collection.findOne({ key: SETTINGS_KEY });
  if (!settings) {
    await collection.updateOne(
      { key: SETTINGS_KEY },
      { $setOnInsert: { curriculums: [], gradeLevelCurriculums: [] } },
      { upsert: true }
    );
    settings = await collection.findOne({ key: SETTINGS_KEY });
  }
  return settings;
};

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const schoolYearAccess = await ensureWriteAllowedForSchoolYear(request);
    if (!schoolYearAccess.allowed) return NextResponse.json(schoolYearAccess.response, { status: 403 });

    const { id } = await params;
    const body = await request.json();

    if (!body.curriculum_name || !body.effective_start_date || !body.effective_end_date) {
      return NextResponse.json({ success: false, error: 'Curriculum name and effective dates are required' }, { status: 400 });
    }

    // Try updating dedicated collection first
    const byId = await Curriculum.findById(id);
    const subjects = Array.isArray(body.subjects) ? body.subjects.map(s => ({
      subject_id: s.subject_id || `SUB-${Date.now()}`,
      subject_name: s.subject_name,
      code: s.code || '',
      description: s.description || '',
      default_class_hours: Number(s.default_class_hours || 0),
    })) : [];

    if (byId) {
      // check duplicate curriculum_id
      if (body.curriculum_id && String(body.curriculum_id).trim() !== String(byId.curriculum_id)) {
        const exists = await Curriculum.findOne({ curriculum_id: String(body.curriculum_id).trim() });
        if (exists) return NextResponse.json({ success: false, error: 'Curriculum code already exists' }, { status: 409 });
      }

      byId.curriculum_id = body.curriculum_id || byId.curriculum_id;
      byId.curriculum_name = body.curriculum_name;
      byId.description = body.description || '';
      byId.effective_start_date = new Date(body.effective_start_date);
      byId.effective_end_date = new Date(body.effective_end_date);
      byId.subjects = subjects;
      await byId.save();
      return NextResponse.json({ success: true, data: byId }, { status: 200 });
    }

    // Fallback: update embedded curriculum inside SystemSettings
    const settings = await ensureSettings();
    const arrayFilter = [{ 'elem._id': new mongoose.Types.ObjectId(id) }];
    const updateFields = {
      'curriculums.$[elem].curriculum_id': body.curriculum_id || `CUR-${Date.now()}`,
      'curriculums.$[elem].curriculum_name': body.curriculum_name,
      'curriculums.$[elem].description': body.description || '',
      'curriculums.$[elem].effective_start_date': body.effective_start_date,
      'curriculums.$[elem].effective_end_date': body.effective_end_date,
      'curriculums.$[elem].subjects': subjects.map(s => ({ _id: new mongoose.Types.ObjectId(), ...s })),
    };

    const result = await SystemSettings.collection.updateOne({ key: SETTINGS_KEY }, { $set: updateFields }, { arrayFilters: arrayFilter });
    if (result.matchedCount === 0 && result.modifiedCount === 0) {
      return NextResponse.json({ success: false, error: 'Curriculum not found' }, { status: 404 });
    }

    // Return updated doc from settings
    const refreshed = await ensureSettings();
    const updated = (refreshed.curriculums || []).find((c) => String(c._id) === String(id));
    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const schoolYearAccess = await ensureWriteAllowedForSchoolYear(request);
    if (!schoolYearAccess.allowed) return NextResponse.json(schoolYearAccess.response, { status: 403 });

    const { id } = await params;

    // Try deleting from dedicated collection
    const deleted = await Curriculum.findByIdAndDelete(id);
    if (deleted) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Fallback: remove from SystemSettings.curriculums
    const pullResult = await SystemSettings.collection.updateOne(
      { key: SETTINGS_KEY },
      { $pull: { curriculums: { _id: new mongoose.Types.ObjectId(id) } } }
    );

    if (pullResult.modifiedCount === 0) {
      return NextResponse.json({ success: false, error: 'Curriculum not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
