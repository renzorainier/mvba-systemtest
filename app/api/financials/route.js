import dbConnect from '@/lib/mongodb';
import Financial from '@/models/Financial';
import Student from '@/models/Student';
import ArchivedPayment from '@/models/ArchivedPayment';
import ArchivedStudent from '@/models/ArchivedStudent';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { ensureWriteAllowedForSchoolYear, getSchoolYearContext } from '@/lib/school-year';

export async function GET(request) {
  try {
    await dbConnect();
    const { selectedSchoolYear, isHistorical } = await getSchoolYearContext(request);
    const financials = isHistorical
      ? await ArchivedPayment.find({ schoolYear: selectedSchoolYear }).lean()
      : await Financial.find({}).lean();

    const studentIds = [...new Set(financials.map((item) => item.studentId).filter(Boolean))];
    const objectIds = studentIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

    const students = await (isHistorical ? ArchivedStudent : Student).find(
      {
        $or: [
          { learnersReferenceNumber: { $in: studentIds } },
          { _id: { $in: objectIds } },
          ...(isHistorical ? [{ sourceStudentId: { $in: objectIds } }] : []),
        ],
      },
      { _id: 1, firstName: 1, lastName: 1, learnersReferenceNumber: 1, sourceStudentId: 1 }
    ).lean();

    const studentByLrn = new Map(
      students.map((student) => [
        student.learnersReferenceNumber,
        `${student.firstName || ''} ${student.lastName || ''}`.trim(),
      ])
    );

    const studentById = new Map(
      students.map((student) => [
        String(student._id),
        `${student.firstName || ''} ${student.lastName || ''}`.trim(),
      ])
    );

    const studentBySourceId = new Map(
      students
        .filter((student) => student.sourceStudentId)
        .map((student) => [
          String(student.sourceStudentId),
          `${student.firstName || ''} ${student.lastName || ''}`.trim(),
        ])
    );

    const enrichedFinancials = financials.map((record) => {
      const key = String(record.studentId || '');
      // Prefer lookup by DB id first, then by LRN fallback
      const studentName = record.studentName || studentById.get(key) || studentBySourceId.get(key) || studentByLrn.get(key) || record.studentId;

      return {
        ...record,
        studentName,
      };
    });

    return NextResponse.json({ success: true, data: enrichedFinancials }, { status: 200 });
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
    
    // Prefer and require Mongo DB object id for student identity to avoid collisions with placeholder LRNs.
    if (!body.studentId || !mongoose.Types.ObjectId.isValid(String(body.studentId))) {
      return NextResponse.json({ success: false, error: 'studentId must be a valid MongoDB ObjectId' }, { status: 400 });
    }

    const resolvedStudent = await Student.findById(String(body.studentId)).lean();
    if (!resolvedStudent) {
      return NextResponse.json({ success: false, error: 'studentId does not match any student' }, { status: 400 });
    }

    const financialData = {
      paymentId: body.paymentId || `P-${Date.now()}`,
      // store canonical DB id string
      studentId: String(resolvedStudent._id),
      amountPaid: body.amountPaid,
      dateOfPayment: body.dateOfPayment,
      paymentMethod: body.paymentMethod,
      referenceNumber: body.referenceNumber,
      status: body.status,
      remarks: body.remarks || '',
      receivedBy: body.receivedBy,
      documents: [],
    };
    
    // Add proof of payment if provided
    if (body.proofOfPayment && body.proofOfPayment.fileId) {
      financialData.documents.push({
        fileId: body.proofOfPayment.fileId,
        fileName: body.proofOfPayment.fileName,
        fileType: body.proofOfPayment.fileType,
        uploadedAt: new Date(),
        fileSize: body.proofOfPayment.fileSize,
      });
    }
    
    const financial = await Financial.create(financialData);

    if (String(financialData.status).toLowerCase() === 'completed' && Number(financialData.amountPaid) > 0) {
      const student = await Student.findById(String(financialData.studentId));

      if (student) {
        const currentBalance = Number(student.remainingBalance || 0);
        student.remainingBalance = Math.max(0, currentBalance - Number(financialData.amountPaid));
        await student.save();
      }
    }

    return NextResponse.json({ success: true, data: financial }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
