import dbConnect from '@/lib/mongodb';
import Student from '@/models/Student';
import SystemSettings, {
  calculateTotalFromBreakdown,
  DEFAULT_SETTINGS_PAYLOAD,
} from '@/models/SystemSettings';
import {
  generateUniqueKinderOneLrn,
  isValidKinderOneLrn,
  isValidKinderTwoToSixLrn,
  KINDER_LEVELS,
  KINDER_ONE_LEVEL,
  normalizeLearnersReferenceNumber,
} from '@/lib/student-identifiers';
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
    const gradeLevel = String(body.gradeLevel || '').trim();
    const normalizedLrn = normalizeLearnersReferenceNumber(body.learnersReferenceNumber);

    if (!KINDER_LEVELS.includes(gradeLevel)) {
      return NextResponse.json({ success: false, error: 'Grade level is required' }, { status: 400 });
    }

    const learnersReferenceNumber = gradeLevel === KINDER_ONE_LEVEL
      ? await generateUniqueKinderOneLrn()
      : normalizedLrn;

    if (gradeLevel !== KINDER_ONE_LEVEL && !isValidKinderTwoToSixLrn(learnersReferenceNumber)) {
      return NextResponse.json({ success: false, error: 'Kinder 2 and Grade 1 to Grade 6 LRN must be a 12-digit number' }, { status: 400 });
    }

    if (gradeLevel === KINDER_ONE_LEVEL && !isValidKinderOneLrn(learnersReferenceNumber)) {
      return NextResponse.json({ success: false, error: 'Kinder 1 LRN must be a 6-digit number' }, { status: 400 });
    }

    const duplicateStudent = await Student.exists({ learnersReferenceNumber });

    if (duplicateStudent) {
      return NextResponse.json({ success: false, error: 'LRN already exists' }, { status: 409 });
    }
    
    // Map form field names to database field names
    const studentData = {
      firstName: body.firstName,
      lastName: body.lastName,
      middleName: body.middleName,
      gender: body.gender,
      gradeLevel,
      dateOfBirth: body.dateOfBirth,
      address: body.address,
      admissionDate: body.admissionDate,
      learnersReferenceNumber,
      parentGuardianName: body.parentGuardianName || '',
      parentGuardianRelationship: body.parentGuardianRelationship || '',
      parentGuardianContactNumber: body.parentGuardianContactNumber || '',
      totalEstimatedCost: defaultTotal,
      remainingBalance: defaultTotal,
    };
    
    const student = await Student.create(studentData);
    return NextResponse.json({ success: true, data: student }, { status: 201 });
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json({ success: false, error: 'Student ID or LRN already exists' }, { status: 409 });
    }

    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}