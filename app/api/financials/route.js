import dbConnect from '@/lib/mongodb';
import Financial from '@/models/Financial';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    await dbConnect();
    const financials = await Financial.find({});
    return NextResponse.json({ success: true, data: financials }, { status: 200 });
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
      paymentId: body.paymentId,
      studentId: body.studentId,
      amountPaid: body.amountPaid,
      dateOfPayment: body.dateOfPayment,
      paymentMethod: body.paymentMethod,
      referenceNumber: body.referenceNumber,
      status: body.status,
      remarks: body.remarks || '',
      receivedBy: body.receivedBy,
    };
    
    const financial = await Financial.create(financialData);
    return NextResponse.json({ success: true, data: financial }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
