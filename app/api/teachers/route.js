import dbConnect from '@/lib/mongodb';
import Teacher from '@/models/Teachers';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        await dbConnect();
        const teachers = await Teacher.find({});
        return NextResponse.json({ success: true, data: teachers }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        await dbConnect();
        const body = await request.json();

        const teacherData = {
            firstName: body.firstName,
            lastName: body.lastName,
            middleName: body.middleName || '',
            phoneNumber: body.phoneNumber,
            email: body.email,
            hireDate: body.hireDate,
            teacherId: body.teacherId || `T-${Date.now()}`, // Auto-generate if not provided
        };

        const teacher = await Teacher.create(teacherData);
        return NextResponse.json({ success: true, data: teacher }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}