import dbConnect from '@/lib/mongodb';
import Financial from '@/models/Financial';
import Student from '@/models/Student';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    await dbConnect();
    const financials = await Financial.find({}).lean();

    const studentIds = [...new Set(financials.map((item) => item.studentId).filter(Boolean))];
    const objectIds = studentIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

    const students = await Student.find(
      {
        $or: [
          { learnersReferenceNumber: { $in: studentIds } },
          { _id: { $in: objectIds } },
        ],
      },
      { _id: 1, firstName: 1, lastName: 1, learnersReferenceNumber: 1 }
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

    const enrichedFinancials = financials.map((record) => {
      const key = String(record.studentId || '');
      const studentName = studentByLrn.get(key) || studentById.get(key) || record.studentId;

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
    const body = await request.json();
    
    // Ensure all required fields are present
    const financialData = {
      paymentId: body.paymentId || `P-${Date.now()}`, // Auto-generate if not provided
      studentId: body.studentId,
      amountPaid: body.amountPaid,
      dateOfPayment: body.dateOfPayment,
      paymentMethod: body.paymentMethod,
      referenceNumber: body.referenceNumber,
      status: body.status,
      remarks: body.remarks || '',
      receivedBy: body.receivedBy,
      documents: [], // Initialize empty documents array
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
      const studentSearchFilters = [{ learnersReferenceNumber: financialData.studentId }];

      if (mongoose.Types.ObjectId.isValid(financialData.studentId)) {
        studentSearchFilters.push({ _id: financialData.studentId });
      }

      const student = await Student.findOne({ $or: studentSearchFilters });

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
