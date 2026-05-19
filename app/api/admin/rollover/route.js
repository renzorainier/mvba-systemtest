import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Student from '@/models/Student';
import ArchivedStudent from '@/models/ArchivedStudent';
import SystemSettings from '@/models/SystemSettings';
import { rolloverSchoolYear } from '@/lib/rollover-school-year';
import { getSchoolYearContext, getNextSchoolYear } from '@/lib/school-year';

const SETTINGS_KEY = 'tuition-breakdown';

const isAdminRequest = (request) => {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return false;
    }

    const parsed = JSON.parse(token);
    return parsed?.role === 'Admin';
  } catch {
    return false;
  }
};

export async function GET(request) {
  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ success: false, error: 'Admin access required.' }, { status: 403 });
    }

    await dbConnect();

    const { currentSchoolYear, selectedSchoolYear } = await getSchoolYearContext(request);
    const activeYear = selectedSchoolYear || currentSchoolYear;
    const currentSettings = await SystemSettings.findOne({ key: SETTINGS_KEY }).lean();
    const nextYearId = getNextSchoolYear(activeYear) || getNextSchoolYear(currentSchoolYear) || '';
    const sourceStudents = activeYear === currentSchoolYear
      ? await Student.find({}).sort({ lastName: 1, firstName: 1 }).lean()
      : await ArchivedStudent.find({ schoolYear: activeYear }).sort({ lastName: 1, firstName: 1 }).lean();

    return NextResponse.json(
      {
        success: true,
        data: {
          currentYearId: activeYear,
          currentSchoolYear,
          nextYearId,
          students: sourceStudents,
          availableGradeLevelCurriculums: Array.isArray(currentSettings?.gradeLevelCurriculums) ? currentSettings.gradeLevelCurriculums : [],
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ success: false, error: 'Admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const currentYearId = String(body.currentYearId || '').trim();
    const nextYearId = String(body.nextYearId || '').trim();
    const promotedStudentIds = Array.isArray(body.promotedStudentIds) ? body.promotedStudentIds : [];

    const result = await rolloverSchoolYear(currentYearId, nextYearId, promotedStudentIds);

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode || 500 });
  }
}
