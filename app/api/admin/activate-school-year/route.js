import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SystemSettings from '@/models/SystemSettings';
import { activateDraftSchoolYear } from '@/lib/rollover-school-year';
import { SCHOOL_YEAR_COOKIE, normalizeSchoolYear, resolveDraftSchoolYear } from '@/lib/school-year';

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

    const settings = await SystemSettings.findOne({ key: SETTINGS_KEY }).lean();
    const currentSchoolYear = normalizeSchoolYear(settings?.currentSchoolYear) || '2025-2026';
    const draftSchoolYear = resolveDraftSchoolYear(settings?.draftSchoolYear, currentSchoolYear);

    return NextResponse.json(
      {
        success: true,
        data: { currentSchoolYear, draftSchoolYear, canActivate: Boolean(draftSchoolYear) },
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

    const result = await activateDraftSchoolYear();

    const response = NextResponse.json({ success: true, data: result }, { status: 200 });

    // The viewer was likely inside the draft; point the selection cookie at the year that is
    // now the active year (the former draft) so the portal lands on live, editable data.
    response.cookies.set(SCHOOL_YEAR_COOKIE, result.activatedSchoolYear, { path: '/', sameSite: 'lax' });

    return response;
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode || 500 });
  }
}
