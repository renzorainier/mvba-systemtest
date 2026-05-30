import dbConnect from '@/lib/mongodb';
import { NextResponse } from 'next/server';
import ArchivedEnrollment from '@/models/ArchivedEnrollment';
import ArchivedPayment from '@/models/ArchivedPayment';
import ArchivedReceipt from '@/models/ArchivedReceipt';
import ArchivedStudent from '@/models/ArchivedStudent';
import ArchivedSection from '@/models/ArchivedSection';
import ArchivedSchedule from '@/models/ArchivedSchedule';
import ArchivedClassAssignment from '@/models/ArchivedClassAssignment';
import ArchivedCurriculum from '@/models/ArchivedCurriculum';
import ArchivedGradeLevelCurriculum from '@/models/ArchivedGradeLevelCurriculum';
import SystemSettings from '@/models/SystemSettings';
import { normalizeSchoolYear, isValidSchoolYear, SCHOOL_YEAR_COOKIE, resolveDraftSchoolYear } from '@/lib/school-year';

const SETTINGS_KEY = 'tuition-breakdown';

export async function GET(request) {
  try {
    await dbConnect();

    const settings = await SystemSettings.findOne({ key: SETTINGS_KEY }).lean();
    const currentSchoolYear = normalizeSchoolYear(settings?.currentSchoolYear) || '2025-2026';
    const draftSchoolYear = resolveDraftSchoolYear(settings?.draftSchoolYear, currentSchoolYear);

    const archivedYears = await Promise.all([
      ArchivedStudent.distinct('schoolYear'),
      ArchivedEnrollment.distinct('schoolYear'),
      ArchivedPayment.distinct('schoolYear'),
      ArchivedReceipt.distinct('schoolYear'),
      ArchivedSection.distinct('schoolYear'),
      ArchivedSchedule.distinct('schoolYear'),
      ArchivedClassAssignment.distinct('schoolYear'),
      ArchivedCurriculum.distinct('schoolYear'),
      ArchivedGradeLevelCurriculum.distinct('schoolYear'),
    ]);

    const availableYears = Array.from(new Set([currentSchoolYear, draftSchoolYear, ...archivedYears.flat().filter(Boolean).map((year) => normalizeSchoolYear(year) || String(year).trim())].filter(Boolean)))
      .filter((year) => year.length > 0)
      .sort((left, right) => {
        const leftStart = Number(String(left).split('-')[0]);
        const rightStart = Number(String(right).split('-')[0]);
        return rightStart - leftStart;
      });

    const selectedSchoolYear = normalizeSchoolYear(request.cookies.get(SCHOOL_YEAR_COOKIE)?.value) || currentSchoolYear;
    const isDraft = Boolean(draftSchoolYear) && selectedSchoolYear === draftSchoolYear;

    return NextResponse.json(
      {
        success: true,
        data: {
          currentSchoolYear,
          draftSchoolYear,
          selectedSchoolYear,
          availableYears,
          isDraft,
          isHistorical: selectedSchoolYear !== currentSchoolYear && !isDraft,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Switch the active view to another school year by setting the selection cookie.
// Allowed targets: the active year, the draft year, or any known archived year.
export async function POST(request) {
  try {
    await dbConnect();

    const body = await request.json().catch(() => ({}));
    const requestedYear = normalizeSchoolYear(body?.schoolYear);

    if (!requestedYear || !isValidSchoolYear(requestedYear)) {
      return NextResponse.json({ success: false, error: 'A valid school year is required.' }, { status: 400 });
    }

    const settings = await SystemSettings.findOne({ key: SETTINGS_KEY }).lean();
    const currentSchoolYear = normalizeSchoolYear(settings?.currentSchoolYear) || '2025-2026';
    const draftSchoolYear = resolveDraftSchoolYear(settings?.draftSchoolYear, currentSchoolYear);

    const archivedYears = (await Promise.all([
      ArchivedStudent.distinct('schoolYear'),
      ArchivedEnrollment.distinct('schoolYear'),
      ArchivedPayment.distinct('schoolYear'),
      ArchivedReceipt.distinct('schoolYear'),
      ArchivedSection.distinct('schoolYear'),
      ArchivedSchedule.distinct('schoolYear'),
      ArchivedClassAssignment.distinct('schoolYear'),
      ArchivedCurriculum.distinct('schoolYear'),
      ArchivedGradeLevelCurriculum.distinct('schoolYear'),
    ])).flat().map((year) => normalizeSchoolYear(year) || String(year).trim()).filter(Boolean);

    const allowedYears = new Set([currentSchoolYear, draftSchoolYear, ...archivedYears].filter(Boolean));

    if (!allowedYears.has(requestedYear)) {
      return NextResponse.json({ success: false, error: 'That school year is not available.' }, { status: 400 });
    }

    const response = NextResponse.json(
      {
        success: true,
        data: {
          selectedSchoolYear: requestedYear,
          isDraft: Boolean(draftSchoolYear) && requestedYear === draftSchoolYear,
          isHistorical: requestedYear !== currentSchoolYear && requestedYear !== draftSchoolYear,
        },
      },
      { status: 200 }
    );

    response.cookies.set(SCHOOL_YEAR_COOKIE, requestedYear, { path: '/', sameSite: 'lax' });

    return response;
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
