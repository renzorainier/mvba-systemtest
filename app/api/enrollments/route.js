import dbConnect from "@/lib/mongodb";
import Enrollment from "@/models/Enrollment";
import Student from "@/models/Student";
import Section from "@/models/Section";
import ArchivedEnrollment from "@/models/ArchivedEnrollment";
import ArchivedStudent from "@/models/ArchivedStudent";
import ArchivedSection from "@/models/ArchivedSection";
import { ensureWriteAllowedForSchoolYear, getSchoolYearContext } from "@/lib/school-year";
import { NextResponse } from "next/server";

export async function GET(request) {
    try{
        await dbConnect();
        const { selectedSchoolYear, isHistorical } = await getSchoolYearContext(request);
        const enrollments = isHistorical
            ? await ArchivedEnrollment.find({ schoolYear: selectedSchoolYear }).lean()
            : await Enrollment.find({ schoolYear: selectedSchoolYear }).lean();

        const learnerRefs = [...new Set(enrollments.map((item) => item.learnersReferenceNumber).filter(Boolean))];
        const sectionIds = [...new Set(enrollments.map((item) => item.sectionId).filter(Boolean))];

        const [students, sections] = await Promise.all([
            isHistorical
                ? ArchivedStudent.find({ learnersReferenceNumber: { $in: learnerRefs }, schoolYear: selectedSchoolYear }, { firstName: 1, lastName: 1, learnersReferenceNumber: 1 }).lean()
                : Student.find({ learnersReferenceNumber: { $in: learnerRefs } }, { firstName: 1, lastName: 1, learnersReferenceNumber: 1 }).lean(),
            isHistorical
                ? ArchivedSection.find({ sectionId: { $in: sectionIds }, schoolYear: selectedSchoolYear }, { sectionId: 1, sectionName: 1 }).lean()
                : Section.find({ sectionId: { $in: sectionIds } }, { sectionId: 1, sectionName: 1 }).lean(),
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
        const schoolYearAccess = await ensureWriteAllowedForSchoolYear(request);

        if (!schoolYearAccess.allowed) {
            return NextResponse.json(schoolYearAccess.response, { status: 403 });
        }

        const body = await request.json();
        // basic validation
        if (!body.learnersReferenceNumber) {
            return NextResponse.json({ success: false, error: "Learner's reference number is required" }, { status: 400 });
        }

        // Prevent more than one enrollment per student
        const existing = await Enrollment.findOne({ learnersReferenceNumber: body.learnersReferenceNumber }).lean();
        if (existing) {
            return NextResponse.json({ success: false, error: 'Student already has an enrollment' }, { status: 400 });
        }

        // Capacity check for section: max 15 students
        if (body.sectionId) {
            const count = await Enrollment.countDocuments({ sectionId: body.sectionId });
            if (count >= 15) {
                return NextResponse.json({ success: false, error: 'Selected section is full (15 students)' }, { status: 400 });
            }
        }

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