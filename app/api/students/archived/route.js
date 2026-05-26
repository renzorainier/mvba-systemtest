import { listArchivedStudents } from '@/lib/student-archive';
import { getSchoolYearContext } from '@/lib/school-year';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { selectedSchoolYear, isHistorical } = await getSchoolYearContext(request);
    const students = await listArchivedStudents(selectedSchoolYear, { isHistorical });

    return NextResponse.json({ success: true, data: students }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load archived students.' },
      { status: 500 }
    );
  }
}