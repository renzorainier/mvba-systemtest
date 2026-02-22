import dbConnect from "@/lib/mongodb";
import Section from "@/models/Section";
import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        await dbConnect();
        const sections = await Section.find({});
        return NextResponse.json({ success: true, data: sections }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        await dbConnect();
        const body = await request.json();
        const sectionData = {
            sectionName: body.sectionName,
            gradeLevel: body.gradeLevel,
            schoolYear: body.schoolYear,
            roomNumber: body.roomNumber,
            sectionId: body.sectionId || `S-${Date.now()}`, // Auto-generate if not provided
        };

        const section = await Section.create(sectionData);
        return NextResponse.json({ success: true, data: section }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}