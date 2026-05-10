import dbConnect from '@/lib/mongodb';
import SystemSettings, {
  calculateTotalFromBreakdown,
  DEFAULT_SETTINGS_PAYLOAD,
} from '@/models/SystemSettings';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const SETTINGS_KEY = 'tuition-breakdown';

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

const sanitizeBreakdown = (inputBreakdown = []) => {
  return inputBreakdown
    .map((item) => ({
      label: String(item?.label || '').trim(),
      amount: Number(item?.amount || 0),
    }))
    .filter((item) => item.label.length > 0);
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
    const totalEstimatedCost = calculateTotalFromBreakdown(settings.breakdown);

    return NextResponse.json(
      {
        success: true,
        data: {
          _id: settings._id,
          key: settings.key,
          title: settings.title,
          currency: settings.currency,
          breakdown: settings.breakdown,
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
    const isAdmin = await isAdminRequest();

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Only admins can update system settings.' }, { status: 403 });
    }

    await dbConnect();

    const body = await request.json();
    const sanitizedBreakdown = sanitizeBreakdown(body.breakdown);

    if (sanitizedBreakdown.length === 0) {
      return NextResponse.json({ success: false, error: 'Breakdown must have at least one item.' }, { status: 400 });
    }

    if (sanitizedBreakdown.some((item) => Number.isNaN(item.amount) || item.amount < 0)) {
      return NextResponse.json({ success: false, error: 'Each amount must be a valid non-negative number.' }, { status: 400 });
    }

    const payload = {
      title: String(body.title || DEFAULT_SETTINGS_PAYLOAD.title).trim() || DEFAULT_SETTINGS_PAYLOAD.title,
      currency: String(body.currency || DEFAULT_SETTINGS_PAYLOAD.currency).trim() || DEFAULT_SETTINGS_PAYLOAD.currency,
      breakdown: sanitizedBreakdown,
    };

    const settings = await SystemSettings.findOneAndUpdate(
      { key: SETTINGS_KEY },
      { $set: payload, $setOnInsert: { key: SETTINGS_KEY } },
      { new: true, upsert: true }
    );

    const totalEstimatedCost = calculateTotalFromBreakdown(settings.breakdown);

    return NextResponse.json(
      {
        success: true,
        data: {
          _id: settings._id,
          key: settings.key,
          title: settings.title,
          currency: settings.currency,
          breakdown: settings.breakdown,
          totalEstimatedCost,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
