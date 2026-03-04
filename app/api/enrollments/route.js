import dbConnect from "@/lib/mongodb";
import Enrollment from "@/models/Enrollment";
import { NextResponse } from "next/server";

export async function GET(request) {
    try{
        await dbConnect();
        const enrollments = await Enrollment.find({});
        return NextResponse.json({ success: true, data: enrollments }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        await dbConnect();
        const body = await request.json();

        const enrollmentData = {
            enrollmentId: body.enrollmentId || `E-${Date.now()}`,
            studentId: body.studentId,
            sectionId: body.sectionId,
            enrollmentDate: body.enrollmentDate,
            schoolYear: body.schoolYear,
            status: body.status,
        };

        const enrollment = await Enrollment.create(enrollmentData);
        return NextResponse.json({ success: true, data: enrollment }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}