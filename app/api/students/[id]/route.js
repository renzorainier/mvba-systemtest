import dbConnect from '@/lib/mongodb';
import Student from '@/models/Student';
import {
  isValidKinderOneLrn,
  isValidKinderTwoToSixLrn,
  normalizeLearnersReferenceNumber,
} from '@/lib/student-identifiers';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const existingStudent = await Student.findById(id);

    if (!existingStudent) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    const learnersReferenceNumber = normalizeLearnersReferenceNumber(body.learnersReferenceNumber);

    if (learnersReferenceNumber && learnersReferenceNumber !== existingStudent.learnersReferenceNumber) {
      const duplicateStudent = await Student.findOne({
        learnersReferenceNumber,
        _id: { $ne: id },
      });

      if (duplicateStudent) {
        return NextResponse.json({ success: false, error: 'LRN already exists' }, { status: 409 });
      }

      const gradeLevel = String(body.gradeLevel || existingStudent.gradeLevel || '').trim();

      if (gradeLevel === 'Kinder 1' && !isValidKinderOneLrn(learnersReferenceNumber)) {
        return NextResponse.json({ success: false, error: 'Kinder 1 LRN must be a 6-digit number' }, { status: 400 });
      }

      if (gradeLevel !== 'Kinder 1' && gradeLevel && !isValidKinderTwoToSixLrn(learnersReferenceNumber)) {
        return NextResponse.json({ success: false, error: 'Kinder 2 to Kinder 6 LRN must be a 12-digit number' }, { status: 400 });
      }
    }
    
    // Map form field names to database field names
    const studentData = {
      firstName: body.firstName,
      lastName: body.lastName,
      middleName: body.middleName,
      gender: body.gender,
      ...(body.gradeLevel ? { gradeLevel: body.gradeLevel } : {}),
      dateOfBirth: body.dateOfBirth,
      address: body.address,
      admissionDate: body.admissionDate,
      learnersReferenceNumber: learnersReferenceNumber || existingStudent.learnersReferenceNumber,
    };
    
    const student = await Student.findByIdAndUpdate(id, studentData, { new: true, runValidators: true });

    return NextResponse.json({ success: true, data: student }, { status: 200 });
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json({ success: false, error: 'LRN already exists' }, { status: 409 });
    }

    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
