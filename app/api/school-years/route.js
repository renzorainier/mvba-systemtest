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
import { normalizeSchoolYear } from '@/lib/school-year';

const SETTINGS_KEY = 'tuition-breakdown';

export async function GET(request) {
  try {
    await dbConnect();

    const settings = await SystemSettings.findOne({ key: SETTINGS_KEY }).lean();
    const currentSchoolYear = normalizeSchoolYear(settings?.currentSchoolYear) || '2025-2026';

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

    const availableYears = Array.from(new Set([currentSchoolYear, ...archivedYears.flat().filter(Boolean).map((year) => normalizeSchoolYear(year) || String(year).trim())].filter(Boolean)))
      .filter((year) => year.length > 0)
      .sort((left, right) => {
        const leftStart = Number(String(left).split('-')[0]);
        const rightStart = Number(String(right).split('-')[0]);
        return rightStart - leftStart;
      });

    const selectedSchoolYear = normalizeSchoolYear(request.cookies.get('selected_school_year')?.value) || currentSchoolYear;

    return NextResponse.json(
      {
        success: true,
        data: {
          currentSchoolYear,
          selectedSchoolYear,
          availableYears,
          isHistorical: selectedSchoolYear !== currentSchoolYear,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
