import dbConnect from '@/lib/mongodb';
import Curriculum from '@/models/Curriculum';
import GradeLevelCurriculum from '@/models/GradeLevelCurriculum';
import { NextResponse } from 'next/server';
import { ensureWriteAllowedForSchoolYear, getSchoolYearContext } from '@/lib/school-year';

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const schoolYearAccess = await ensureWriteAllowedForSchoolYear(request);
    if (!schoolYearAccess.allowed) return NextResponse.json(schoolYearAccess.response, { status: 403 });
    const { context } = schoolYearAccess;
    const selectedSchoolYear = context?.selectedSchoolYear || (await getSchoolYearContext(request)).selectedSchoolYear || '';

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
      const recordSchoolYear = String(byId.schoolYear || '').trim();
      const shouldCloneToSelectedYear = recordSchoolYear && recordSchoolYear === String(selectedSchoolYear || '').trim() ? false : true;

      // check duplicate curriculum_id
      if (body.curriculum_id && String(body.curriculum_id).trim() !== String(byId.curriculum_id)) {
        const exists = await Curriculum.findOne({ curriculum_id: String(body.curriculum_id).trim(), schoolYear: selectedSchoolYear || byId.schoolYear });
        if (exists) return NextResponse.json({ success: false, error: 'Curriculum code already exists' }, { status: 409 });
      }

      if (shouldCloneToSelectedYear) {
        const created = await Curriculum.create({
          curriculum_id: body.curriculum_id || byId.curriculum_id,
          schoolYear: selectedSchoolYear,
          curriculum_name: body.curriculum_name,
          description: body.description || '',
          effective_start_date: new Date(body.effective_start_date),
          effective_end_date: new Date(body.effective_end_date),
          subjects,
        });

        return NextResponse.json({ success: true, data: created }, { status: 200 });
      }

      byId.curriculum_id = body.curriculum_id || byId.curriculum_id;
      byId.schoolYear = selectedSchoolYear || byId.schoolYear;
      byId.curriculum_name = body.curriculum_name;
      byId.description = body.description || '';
      byId.effective_start_date = new Date(body.effective_start_date);
      byId.effective_end_date = new Date(body.effective_end_date);
      byId.subjects = subjects;
      await byId.save();
      return NextResponse.json({ success: true, data: byId }, { status: 200 });
    }

    return NextResponse.json({ success: false, error: 'Curriculum not found' }, { status: 404 });
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

    // Prevent deletion if referenced by any GradeLevelCurriculum (DB)
    const dbRef = await GradeLevelCurriculum.findOne({ curriculum_id: id }).lean();
    if (dbRef) {
      return NextResponse.json({ success: false, error: 'Curriculum is assigned to a grade level and cannot be deleted' }, { status: 409 });
    }

    const deleted = await Curriculum.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Curriculum not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
