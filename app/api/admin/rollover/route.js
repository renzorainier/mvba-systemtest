import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Student from '@/models/Student';
import ArchivedStudent from '@/models/ArchivedStudent';
import SystemSettings from '@/models/SystemSettings';
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

    // The one-step rollover is retired. School-year advancement now goes through the draft
    // flow (create draft -> edit -> execute roll over). Running the immediate rollover here
    // would leave stale per-year stamps on live records, so it is disabled until the draft
    // activation (execute roll over) feature is implemented.
    return NextResponse.json(
      {
        success: false,
        error: 'The one-step rollover has been replaced by the draft school year flow. Create and prepare a draft school year instead.',
      },
      { status: 410 }
    );
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode || 500 });
  }
}
