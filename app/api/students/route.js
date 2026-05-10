import dbConnect from '@/lib/mongodb';
import Student from '@/models/Student';
import SystemSettings, {
  calculateTotalFromBreakdown,
  DEFAULT_SETTINGS_PAYLOAD,
} from '@/models/SystemSettings';
import { NextResponse } from 'next/server';

const SETTINGS_KEY = 'tuition-breakdown';

const getDefaultTotal = async () => {
  const settings = await SystemSettings.findOne({ key: SETTINGS_KEY });

  if (!settings) {
    return calculateTotalFromBreakdown(DEFAULT_SETTINGS_PAYLOAD.breakdown);
  }

  return calculateTotalFromBreakdown(settings.breakdown);
};

export async function GET(request) {
  try {
    await dbConnect();
    const defaultTotal = await getDefaultTotal();

    await Student.updateMany(
      {
        $or: [{ remainingBalance: { $exists: false } }, { totalEstimatedCost: { $exists: false } }],
      },
      {
        $set: {
          totalEstimatedCost: defaultTotal,
          remainingBalance: defaultTotal,
        },
      }
    );

    const students = await Student.find({});
    return NextResponse.json({ success: true, data: students }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const defaultTotal = await getDefaultTotal();
    
    // Map form field names to database field names
    const studentData = {
      firstName: body.firstName,
      lastName: body.lastName,
      middleName: body.middleName,
      gender: body.gender,
      dateOfBirth: body.dateOfBirth,
      address: body.address,
      admissionDate: body.admissionDate,
      learnersReferenceNumber: body.learnersReferenceNumber,
      totalEstimatedCost: defaultTotal,
      remainingBalance: defaultTotal,
    };
    
    const student = await Student.create(studentData);
    return NextResponse.json({ success: true, data: student }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}