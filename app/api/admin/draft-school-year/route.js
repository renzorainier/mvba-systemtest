import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import SystemSettings from '@/models/SystemSettings';
import Student from '@/models/Student';
import Financial from '@/models/Financial';
import Schedule from '@/models/Schedule';
import ClassAssignment from '@/models/ClassAssignment';
import Section from '@/models/Section';
import Enrollment from '@/models/Enrollment';
import Curriculum from '@/models/Curriculum';
import GradeLevelCurriculum from '@/models/GradeLevelCurriculum';
import { SCHOOL_YEAR_COOKIE, getNextSchoolYear, isValidSchoolYear, normalizeSchoolYear, resolveDraftSchoolYear } from '@/lib/school-year';
import { seedDraftFromActiveYear } from '@/lib/rollover-school-year';

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
        data: {
          currentSchoolYear,
          draftSchoolYear,
          exists: Boolean(draftSchoolYear),
          nextSchoolYear: getNextSchoolYear(currentSchoolYear) || '',
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

    await dbConnect();

    const settings = await SystemSettings.findOne({ key: SETTINGS_KEY });

    if (!settings) {
      return NextResponse.json({ success: false, error: 'System settings not found.' }, { status: 404 });
    }

    const currentSchoolYear = normalizeSchoolYear(settings.currentSchoolYear) || '2025-2026';
    const existingDraft = resolveDraftSchoolYear(settings.draftSchoolYear, currentSchoolYear);

    if (existingDraft) {
      return NextResponse.json(
        { success: false, error: `A draft school year (${existingDraft}) already exists.` },
        { status: 409 }
      );
    }

    const draftSchoolYear = getNextSchoolYear(currentSchoolYear);

    if (!isValidSchoolYear(draftSchoolYear)) {
      return NextResponse.json(
        { success: false, error: 'Unable to derive a valid next school year from the current school year.' },
        { status: 400 }
      );
    }

    // The academic structure (curricula, grade-level curricula, sections, schedules) is carried
    // forward from the active year so it can be tweaked rather than rebuilt. Student-level data
    // (students, enrollments, financials) starts fresh. Done in one transaction so a partial
    // copy can never leave a half-seeded draft.
    let seeded = { curriculumCount: 0, gradeLevelCurriculumCount: 0, sectionCount: 0, scheduleCount: 0 };
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        seeded = await seedDraftFromActiveYear(currentSchoolYear, draftSchoolYear, session);
        settings.draftSchoolYear = draftSchoolYear;
        await settings.save({ session });
      });
    } finally {
      session.endSession();
    }

    return NextResponse.json(
      { success: true, data: { draftSchoolYear, currentSchoolYear, carriedOver: seeded } },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ success: false, error: 'Admin access required.' }, { status: 403 });
    }

    await dbConnect();

    const settings = await SystemSettings.findOne({ key: SETTINGS_KEY });

    if (!settings || !settings.draftSchoolYear) {
      return NextResponse.json({ success: false, error: 'No draft school year exists.' }, { status: 404 });
    }

    const currentSchoolYear = normalizeSchoolYear(settings.currentSchoolYear) || '2025-2026';
    const draftSchoolYear = resolveDraftSchoolYear(settings.draftSchoolYear, currentSchoolYear);

    // Corrupt/legacy state (e.g. a stored draft equal to the active year): just clear the
    // pointer. Never purge by that year — it would delete live active-year records.
    if (!draftSchoolYear) {
      settings.draftSchoolYear = null;
      await settings.save();
      return NextResponse.json(
        { success: true, data: { discardedSchoolYear: null, cleared: true } },
        { status: 200 }
      );
    }

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        // Purge every live row tagged with the draft year across all collections.
        await Student.deleteMany({ schoolYear: draftSchoolYear }).session(session);
        await Financial.deleteMany({ schoolYear: draftSchoolYear }).session(session);
        await Schedule.deleteMany({ schoolYear: draftSchoolYear }).session(session);
        await ClassAssignment.deleteMany({ schoolYear: draftSchoolYear }).session(session);
        await Section.deleteMany({ schoolYear: draftSchoolYear }).session(session);
        await Enrollment.deleteMany({ schoolYear: draftSchoolYear }).session(session);
        await Curriculum.deleteMany({ schoolYear: draftSchoolYear }).session(session);
        await GradeLevelCurriculum.deleteMany({ school_year_id: draftSchoolYear }).session(session);

        settings.draftSchoolYear = null;
        await settings.save({ session });
      });
    } finally {
      session.endSession();
    }

    const response = NextResponse.json(
      { success: true, data: { discardedSchoolYear: draftSchoolYear } },
      { status: 200 }
    );

    // If the caller is currently viewing the draft, send them back to the active year.
    const selected = normalizeSchoolYear(request.cookies.get(SCHOOL_YEAR_COOKIE)?.value);
    if (selected && selected === draftSchoolYear) {
      response.cookies.set(SCHOOL_YEAR_COOKIE, normalizeSchoolYear(settings.currentSchoolYear) || '', {
        path: '/',
        sameSite: 'lax',
      });
    }

    return response;
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
