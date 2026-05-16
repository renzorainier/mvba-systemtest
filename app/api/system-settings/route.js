import dbConnect from '@/lib/mongodb';
import Account from '@/models/Account';
import SystemSettings, { DEFAULT_SETTINGS_PAYLOAD } from '@/models/SystemSettings';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  calculateTotalFromTuitionPlans,
  createDefaultTuitionPlans,
  normalizeTuitionPlans,
} from '@/lib/tuition-settings';

const SETTINGS_KEY = 'tuition-breakdown';
const DEFAULT_CURRENT_SCHOOL_YEAR = '2025-2026';

const normalizeSchoolYear = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4})\s*-\s*(\d{4})$/);

  if (!match) {
    return null;
  }

  return `${match[1]}-${match[2]}`;
};

const isValidSchoolYear = (value) => {
  const normalized = normalizeSchoolYear(value);

  if (!normalized) {
    return false;
  }

  const [startYearText, endYearText] = normalized.split('-');
  const startYear = Number(startYearText);
  const endYear = Number(endYearText);

  return Number.isInteger(startYear) && Number.isInteger(endYear) && endYear === startYear + 1;
};

const ensureWritableSchoolYear = async (request) => {
  const token = request?.cookies?.get('auth_token')?.value;

  if (!token) {
    return {
      allowed: false,
      response: NextResponse.json({ success: false, error: 'Only admins can update system settings.' }, { status: 403 }),
    };
  }

  try {
    const parsed = JSON.parse(token);

    if (parsed?.role !== 'Admin') {
      return {
        allowed: false,
        response: NextResponse.json({ success: false, error: 'Only admins can update system settings.' }, { status: 403 }),
      };
    }

    return { allowed: true };
  } catch {
    return {
      allowed: false,
      response: NextResponse.json({ success: false, error: 'Only admins can update system settings.' }, { status: 403 }),
    };
  }
};

const isAdminRequest = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return false;
  }

  try {
    const parsed = JSON.parse(token);
    return parsed?.role === 'Admin';
  } catch {
    return false;
  }
};

const getAuthenticatedAdmin = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return null;
  }

  try {
    const parsed = JSON.parse(token);

    if (parsed?.role !== 'Admin' || !parsed?.name) {
      return null;
    }

    return Account.findOne({ fullName: parsed.name, role: 'Admin', isActive: true });
  } catch {
    return null;
  }
};

const sanitizeTuitionPlans = (inputPlans = []) => {
  return normalizeTuitionPlans(inputPlans).map((plan) => ({
    ...plan,
    applicableGrades: Array.isArray(plan.applicableGrades) ? plan.applicableGrades : [],
    lineItems: Array.isArray(plan.lineItems) ? plan.lineItems : [],
    customFields: Array.isArray(plan.customFields) ? plan.customFields : [],
  }));
};

const ensureSettings = async () => {
  let settings = await SystemSettings.findOne({ key: SETTINGS_KEY });

  if (!settings) {
    settings = await SystemSettings.create(DEFAULT_SETTINGS_PAYLOAD);
  }

  return settings;
};

export async function GET() {
  try {
    await dbConnect();

    const settings = await ensureSettings();
    const tuitionPlans = sanitizeTuitionPlans(settings.tuitionPlans?.length ? settings.tuitionPlans : createDefaultTuitionPlans());
    const totalEstimatedCost = calculateTotalFromTuitionPlans(tuitionPlans);

    return NextResponse.json(
      {
        success: true,
        data: {
          _id: settings._id,
          key: settings.key,
          title: settings.title,
          currency: settings.currency,
          currentSchoolYear: normalizeSchoolYear(settings.currentSchoolYear) || DEFAULT_CURRENT_SCHOOL_YEAR,
          tuitionPlans,
          breakdown: tuitionPlans,
          totalEstimatedCost,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const schoolYearAccess = await ensureWritableSchoolYear(request);

    if (!schoolYearAccess.allowed) {
      return schoolYearAccess.response;
    }

    const isAdmin = await isAdminRequest();

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Only admins can update system settings.' }, { status: 403 });
    }

    await dbConnect();

    const body = await request.json();
    const sanitizedTuitionPlans = sanitizeTuitionPlans(body.tuitionPlans || []);
    const currentPassword = String(body.currentPassword || '').trim();
    const currentSchoolYear = normalizeSchoolYear(body.currentSchoolYear) || DEFAULT_CURRENT_SCHOOL_YEAR;

    if (!currentPassword) {
      return NextResponse.json({ success: false, error: 'Current password is required.' }, { status: 400 });
    }

    const authenticatedAdmin = await getAuthenticatedAdmin();

    if (!authenticatedAdmin || authenticatedAdmin.password !== currentPassword) {
      return NextResponse.json({ success: false, error: 'Current password is incorrect.' }, { status: 401 });
    }

    if (sanitizedTuitionPlans.length === 0) {
      return NextResponse.json({ success: false, error: 'Tuition plans must have at least one grade block.' }, { status: 400 });
    }

    if (!isValidSchoolYear(currentSchoolYear)) {
      return NextResponse.json({ success: false, error: 'Current school year must be in YYYY-YYYY format.' }, { status: 400 });
    }

    const payload = {
      title: String(body.title || DEFAULT_SETTINGS_PAYLOAD.title).trim() || DEFAULT_SETTINGS_PAYLOAD.title,
      currency: String(body.currency || DEFAULT_SETTINGS_PAYLOAD.currency).trim() || DEFAULT_SETTINGS_PAYLOAD.currency,
      currentSchoolYear,
      tuitionPlans: sanitizedTuitionPlans,
      breakdown: [],
    };

    const settings = await SystemSettings.findOneAndUpdate(
      { key: SETTINGS_KEY },
      { $set: payload, $setOnInsert: { key: SETTINGS_KEY } },
      { new: true, upsert: true }
    );

    const tuitionPlans = sanitizeTuitionPlans(settings.tuitionPlans?.length ? settings.tuitionPlans : createDefaultTuitionPlans());
    const totalEstimatedCost = calculateTotalFromTuitionPlans(tuitionPlans);

    return NextResponse.json(
      {
        success: true,
        data: {
          _id: settings._id,
          key: settings.key,
          title: settings.title,
          currency: settings.currency,
          currentSchoolYear: normalizeSchoolYear(settings.currentSchoolYear) || DEFAULT_CURRENT_SCHOOL_YEAR,
          tuitionPlans,
          breakdown: tuitionPlans,
          totalEstimatedCost,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}