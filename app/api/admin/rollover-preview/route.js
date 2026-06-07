import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Student from '@/models/Student';
import SystemSettings from '@/models/SystemSettings';
import { getNextGradeLevel, normalizeSchoolYear, resolveDraftSchoolYear } from '@/lib/school-year';

const SETTINGS_KEY = 'tuition-breakdown';

const isAdminRequest = (request) => {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return false;
    }

    const parsed = JSON.parse(token);
    return ['Admin', 'Sub-Admin'].includes(parsed?.role);
  } catch {
    return false;
  }
};

const isPassingGwa = (gwa) => {
  const numericGwa = Number(gwa);
  return Number.isFinite(numericGwa) && numericGwa >= 75;
};

const toStudentRow = (student) => ({
  id: String(student._id),
  name: `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Unnamed student',
  gradeLevel: student.gradeLevel || '—',
  gwa: Number.isFinite(Number(student.gwa)) ? Number(student.gwa) : null,
  learnersReferenceNumber: student.learnersReferenceNumber || 'TBA',
});

// Preview which students will be promoted, repeated, or graduated when the active year is
// rolled into the draft — same GWA / grade-level rules as activateDraftSchoolYear, read-only.
export async function GET(request) {
  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ success: false, error: 'Admin access required.' }, { status: 403 });
    }

    await dbConnect();

    const settings = await SystemSettings.findOne({ key: SETTINGS_KEY }).lean();
    const currentSchoolYear = normalizeSchoolYear(settings?.currentSchoolYear) || '';
    const draftSchoolYear = resolveDraftSchoolYear(settings?.draftSchoolYear, currentSchoolYear);

    // Active-year live rows include legacy untagged rows (Student gained schoolYear later).
    const activeStudents = await Student.find({
      $or: [{ schoolYear: currentSchoolYear }, { schoolYear: { $exists: false } }, { schoolYear: null }],
    }).lean();

    const promoted = [];
    const repeating = [];
    const graduated = [];

    for (const student of activeStudents) {
      const passing = isPassingGwa(student.gwa);
      const nextGrade = getNextGradeLevel(student.gradeLevel);
      const row = toStudentRow(student);

      if (passing && !nextGrade) {
        graduated.push(row);
      } else if (passing) {
        promoted.push({ ...row, nextGradeLevel: nextGrade });
      } else {
        repeating.push(row);
      }
    }

    const byName = (a, b) => a.name.localeCompare(b.name);
    promoted.sort(byName);
    repeating.sort(byName);
    graduated.sort(byName);

    return NextResponse.json(
      {
        success: true,
        data: {
          currentSchoolYear,
          draftSchoolYear,
          promoted,
          repeating,
          graduated,
          totalCount: activeStudents.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
