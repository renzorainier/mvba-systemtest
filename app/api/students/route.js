import dbConnect from '@/lib/mongodb';
import Student from '@/models/Student';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    await dbConnect();
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
    
    // Map form field names to database field names
    const studentData = {
      firstName: body.firstName,
      lastName: body.lastName,
      middleName: body.middleName,
      gender: body.gender,
      dateOfBirth: body.dateOfBirth,
      address: body.address,
      admissionDate: body.admissionDate,
      studentId: body.studentId || `S-${Date.now()}`, // Auto-generate if not provided
    };
    
    const student = await Student.create(studentData);
    return NextResponse.json({ success: true, data: student }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}