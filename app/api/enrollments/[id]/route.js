import dbConnect from '@/lib/mongodb';
import Enrollment from '@/models/Enrollment';
import { isValidKinderOneLrn, isValidKinderTwoToSixLrn } from '@/lib/student-identifiers';
import { ensureWriteAllowedForSchoolYear } from '@/lib/school-year';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const schoolYearAccess = await ensureWriteAllowedForSchoolYear(request);

    if (!schoolYearAccess.allowed) {
      return NextResponse.json(schoolYearAccess.response, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { context } = schoolYearAccess;
    const selectedSchoolYear = context?.selectedSchoolYear || '';

    const currentEnrollment = await Enrollment.findById(id).lean();

    if (!currentEnrollment) {
      return NextResponse.json({ success: false, error: 'Enrollment not found' }, { status: 404 });
    }
    
    // Map form field names to database field names
    const enrollmentData = {
      learnersReferenceNumber: body.learnersReferenceNumber,
      sectionId: body.sectionId,
      // keep enrollment tied to the selected school year
      schoolYear: selectedSchoolYear,
      enrollmentDate: body.enrollmentDate,
      status: body.status,
    };
    const nextLearnersReferenceNumber = String(enrollmentData.learnersReferenceNumber || currentEnrollment.learnersReferenceNumber || '').trim();
    const currentStudentId = String(currentEnrollment.studentId || '').trim();

    // Only enforce uniqueness for concrete LRNs; placeholders like TBA are allowed.
    if (currentStudentId) {
      const otherByStudentId = await Enrollment.findOne({
        studentId: currentStudentId,
        schoolYear: selectedSchoolYear,
        _id: { $ne: id },
      }).lean();

      if (otherByStudentId) {
        return NextResponse.json({ success: false, error: 'Another enrollment already exists for this student' }, { status: 400 });
      }
    } else if (isValidKinderOneLrn(nextLearnersReferenceNumber) || isValidKinderTwoToSixLrn(nextLearnersReferenceNumber)) {
      const otherByLrn = await Enrollment.findOne({
        learnersReferenceNumber: nextLearnersReferenceNumber,
        schoolYear: selectedSchoolYear,
        _id: { $ne: id },
      }).lean();

      if (otherByLrn) {
        return NextResponse.json({ success: false, error: 'Another enrollment already exists for this student' }, { status: 400 });
      }
    }

    // If sectionId is being changed, ensure target section is not full (max 15)
    if (enrollmentData.sectionId && String(enrollmentData.sectionId).trim() !== 'TBA') {
      // get current enrollment to compare
      const isChangingSection = currentEnrollment && currentEnrollment.sectionId !== enrollmentData.sectionId;
      if (isChangingSection) {
        const count = await Enrollment.countDocuments({ sectionId: enrollmentData.sectionId, schoolYear: selectedSchoolYear, _id: { $ne: id } });
        if (count >= 15) {
          return NextResponse.json({ success: false, error: 'Selected section is full (15 students)' }, { status: 400 });
        }
      }
    }

    const enrollment = await Enrollment.findByIdAndUpdate(id, enrollmentData, { new: true });
    
    if (!enrollment) {
      return NextResponse.json({ success: false, error: 'Enrollment not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: enrollment }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    const schoolYearAccess = await ensureWriteAllowedForSchoolYear(request);

    if (!schoolYearAccess.allowed) {
      return NextResponse.json(schoolYearAccess.response, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    if (!body || typeof body.status !== 'string') {
      return NextResponse.json({ success: false, error: 'Status is required' }, { status: 400 });
    }

    const enrollment = await Enrollment.findByIdAndUpdate(id, { status: body.status }, { new: true });
    if (!enrollment) {
      return NextResponse.json({ success: false, error: 'Enrollment not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: enrollment }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
