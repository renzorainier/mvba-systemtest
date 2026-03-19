import dbConnect from "@/lib/mongodb";
import Enrollment from "@/models/Enrollment";
import Student from "@/models/Student";
import Section from "@/models/Section";
import { NextResponse } from "next/server";

export async function GET(request) {
    try{
        await dbConnect();
        const enrollments = await Enrollment.find({}).lean();

        const learnerRefs = [...new Set(enrollments.map((item) => item.learnersReferenceNumber).filter(Boolean))];
        const sectionIds = [...new Set(enrollments.map((item) => item.sectionId).filter(Boolean))];

        const [students, sections] = await Promise.all([
            Student.find({ learnersReferenceNumber: { $in: learnerRefs } }, { firstName: 1, lastName: 1, learnersReferenceNumber: 1 }).lean(),
            Section.find({ sectionId: { $in: sectionIds } }, { sectionId: 1, sectionName: 1 }).lean(),
        ]);

        const studentNameByLrn = new Map(
            students.map((student) => [
                student.learnersReferenceNumber,
                `${student.firstName || ""} ${student.lastName || ""}`.trim(),
            ])
        );

        const sectionNameById = new Map(
            sections.map((section) => [section.sectionId, section.sectionName])
        );

        const enrichedEnrollments = enrollments.map((enrollment) => ({
            ...enrollment,
            studentName: studentNameByLrn.get(enrollment.learnersReferenceNumber) || enrollment.learnersReferenceNumber,
            sectionName: sectionNameById.get(enrollment.sectionId) || enrollment.sectionId,
        }));

        return NextResponse.json({ success: true, data: enrichedEnrollments }, { status: 200 });
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
            learnersReferenceNumber: body.learnersReferenceNumber,
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