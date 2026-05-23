import dbConnect from '@/lib/mongodb';
import Student from '@/models/Student';
import ArchivedStudent from '@/models/ArchivedStudent';
import SystemSettings, { DEFAULT_SETTINGS_PAYLOAD } from '@/models/SystemSettings';
import {
  generateUniqueKinderOneLrn,
  isValidKinderOneLrn,
  isValidKinderTwoToSixLrn,
  KINDER_LEVELS,
  KINDER_ONE_LEVEL,
  normalizeLearnersReferenceNumber,
} from '@/lib/student-identifiers';
import {
  calculateTotalFromTuitionPlans,
  createDefaultTuitionPlans,
  getTuitionAmountForGrade,
  normalizeTuitionPlans,
} from '@/lib/tuition-settings';
import { NextResponse } from 'next/server';
import { ensureWriteAllowedForSchoolYear, getSchoolYearContext } from '@/lib/school-year';

const SETTINGS_KEY = 'tuition-breakdown';

const getDefaultTotal = async () => {
  const settings = await SystemSettings.findOne({ key: SETTINGS_KEY });

  if (!settings) {
    return calculateTotalFromTuitionPlans(DEFAULT_SETTINGS_PAYLOAD.tuitionPlans || createDefaultTuitionPlans());
  }

  const tuitionPlans = normalizeTuitionPlans(settings.tuitionPlans?.length ? settings.tuitionPlans : DEFAULT_SETTINGS_PAYLOAD.tuitionPlans || createDefaultTuitionPlans());
  return calculateTotalFromTuitionPlans(tuitionPlans);
};

const getDefaultTotalForGrade = async (gradeLevel) => {
  const settings = await SystemSettings.findOne({ key: SETTINGS_KEY });
  const tuitionPlans = normalizeTuitionPlans(settings?.tuitionPlans?.length ? settings.tuitionPlans : DEFAULT_SETTINGS_PAYLOAD.tuitionPlans || createDefaultTuitionPlans());

  return getTuitionAmountForGrade(tuitionPlans, gradeLevel, await getDefaultTotal());
};

export async function GET(request) {
  try {
    await dbConnect();
    const { selectedSchoolYear, isHistorical } = await getSchoolYearContext(request);

    if (isHistorical) {
      const archivedStudents = await ArchivedStudent.find({
        schoolYear: selectedSchoolYear,
        $or: [{ archiveType: 'rollover' }, { archiveType: { $exists: false } }],
      }).lean();
      return NextResponse.json({ success: true, data: archivedStudents }, { status: 200 });
    }

    const settings = await SystemSettings.findOne({ key: SETTINGS_KEY });
    const tuitionPlans = normalizeTuitionPlans(settings?.tuitionPlans?.length ? settings.tuitionPlans : DEFAULT_SETTINGS_PAYLOAD.tuitionPlans || createDefaultTuitionPlans());
    const defaultTotal = calculateTotalFromTuitionPlans(tuitionPlans);

    const students = await Student.find({});
    const updates = students
      .filter((student) => student.totalEstimatedCost === undefined || student.remainingBalance === undefined)
      .map((student) => {
        const gradeTotal = getTuitionAmountForGrade(tuitionPlans, student.gradeLevel, defaultTotal);

        return {
          updateOne: {
            filter: { _id: student._id },
            update: {
              $set: {
                totalEstimatedCost: gradeTotal,
                remainingBalance: gradeTotal,
              },
            },
          },
        };
      });

    if (updates.length > 0) {
      await Student.bulkWrite(updates);
    }

    const hydratedStudents = students.map((student) => {
      if (student.totalEstimatedCost === undefined || student.remainingBalance === undefined) {
        const gradeTotal = getTuitionAmountForGrade(tuitionPlans, student.gradeLevel, defaultTotal);
        return {
          ...student.toObject(),
          totalEstimatedCost: gradeTotal,
          remainingBalance: gradeTotal,
        };
      }

      return student;
    });

    return NextResponse.json({ success: true, data: hydratedStudents }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const schoolYearAccess = await ensureWriteAllowedForSchoolYear(request);

    if (!schoolYearAccess.allowed) {
      return NextResponse.json(schoolYearAccess.response, { status: 403 });
    }

    const body = await request.json();
    const gradeLevel = String(body.gradeLevel || '').trim();
    const normalizedLrn = normalizeLearnersReferenceNumber(body.learnersReferenceNumber);

    if (!KINDER_LEVELS.includes(gradeLevel)) {
      return NextResponse.json({ success: false, error: 'Grade level is required' }, { status: 400 });
    }

    let learnersReferenceNumber;

    if (gradeLevel === KINDER_ONE_LEVEL) {
      learnersReferenceNumber = await generateUniqueKinderOneLrn();
      if (!isValidKinderOneLrn(learnersReferenceNumber)) {
        return NextResponse.json({ success: false, error: 'Kinder 1 LRN must be a 6-digit number' }, { status: 400 });
      }
    } else {
      // For Kinder 2 and above, allow an explicit 12-digit LRN or use placeholder 'TBA' when not provided
      if (!normalizedLrn) {
        learnersReferenceNumber = 'TBA';
      } else if (isValidKinderTwoToSixLrn(normalizedLrn)) {
        learnersReferenceNumber = normalizedLrn;
      } else {
        return NextResponse.json({ success: false, error: 'Kinder 2 and Grade 1 to Grade 6 LRN must be a 12-digit number' }, { status: 400 });
      }
    }

    // Only enforce duplicate check for concrete numeric LRNs
    const shouldCheckDuplicate = isValidKinderOneLrn(learnersReferenceNumber) || isValidKinderTwoToSixLrn(learnersReferenceNumber);
    if (shouldCheckDuplicate) {
      const duplicateStudent = await Student.exists({ learnersReferenceNumber });
      if (duplicateStudent) {
        return NextResponse.json({ success: false, error: 'LRN already exists' }, { status: 409 });
      }
    }

    const defaultTotal = await getDefaultTotalForGrade(gradeLevel);
    
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