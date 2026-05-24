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
        const studentIds = [...new Set(enrollments.map((item) => item.studentId).filter(Boolean))];
        const sectionIds = [...new Set(enrollments.map((item) => item.sectionId).filter(Boolean))];

        const [students, sections] = await Promise.all([
                        isHistorical
                                ? ArchivedStudent.find(
                                        { $or: [ { learnersReferenceNumber: { $in: learnerRefs } }, { _id: { $in: studentIds } } ], schoolYear: selectedSchoolYear },
                                        { firstName: 1, lastName: 1, learnersReferenceNumber: 1 }
                                    ).lean()
                                : Student.find(
                                        { $or: [ { learnersReferenceNumber: { $in: learnerRefs } }, { _id: { $in: studentIds } } ] },
                                        { firstName: 1, lastName: 1, learnersReferenceNumber: 1 }
                                    ).lean(),
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

        const studentNameById = new Map(
            students.map((student) => [
                String(student._id),
                `${student.firstName || ""} ${student.lastName || ""}`.trim(),
            ])
        );

        const sectionNameById = new Map(
            sections.map((section) => [section.sectionId, section.sectionName])
        );

        const enrichedEnrollments = enrollments.map((enrollment) => ({
            ...enrollment,
            studentName: (enrollment.studentId && studentNameById.get(String(enrollment.studentId))) || studentNameByLrn.get(enrollment.learnersReferenceNumber) || enrollment.learnersReferenceNumber,
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
        const { context } = schoolYearAccess;
        const selectedSchoolYear = context?.selectedSchoolYear || '';
        // basic validation
        if (!body.learnersReferenceNumber) {
            return NextResponse.json({ success: false, error: "Learner's reference number is required" }, { status: 400 });
        }

        // Resolve and validate studentId when provided, to ensure it's a real DB _id and not a placeholder like 'TBA'.
        let resolvedStudent = null;
        if (body.studentId && String(body.studentId).trim()) {
            resolvedStudent = await Student.findById(String(body.studentId)).lean();
            if (!resolvedStudent) {
                return NextResponse.json({ success: false, error: 'Invalid studentId provided' }, { status: 400 });
            }
            // Ensure learnersReferenceNumber is present
            body.learnersReferenceNumber = body.learnersReferenceNumber || String(resolvedStudent.learnersReferenceNumber || '');
        }

        // Additional safety: if the provided learnersReferenceNumber maps to multiple students (ambiguous like 'TBA'),
        // require the client to provide an explicit studentId to disambiguate. If exactly one student matches the LRN,
        // auto-resolve and set studentId to that student.
        if (body.learnersReferenceNumber) {
            const matchingStudents = await Student.find({ learnersReferenceNumber: body.learnersReferenceNumber }, { _id: 1 }).lean();
            if (matchingStudents.length > 1) {
                // ambiguous LRN — client must provide studentId
                if (!resolvedStudent) {
                    return NextResponse.json({ success: false, error: 'Learner reference is ambiguous; please select the specific student from the list' }, { status: 400 });
                }

                // verify provided studentId matches one of the students with this LRN
                if (!matchingStudents.some((s) => String(s._id) === String(resolvedStudent._id))) {
                    return NextResponse.json({ success: false, error: 'Provided studentId does not match the selected learner reference' }, { status: 400 });
                }
            } else if (matchingStudents.length === 1 && !resolvedStudent) {
                // unambiguous LRN — fill in resolvedStudent for convenience
                resolvedStudent = await Student.findById(String(matchingStudents[0]._id)).lean();
            }
        }

        // Prevent more than one enrollment per student for the selected school year.
        // Use the resolved student's DB id (`studentId`) as the canonical key. If a studentId is present,
        // enforce uniqueness by that id. If no studentId was provided or resolved, do not treat LRN alone as authoritative.
        if (resolvedStudent) {
            const existingById = await Enrollment.findOne({ studentId: String(resolvedStudent._id), schoolYear: selectedSchoolYear }).lean();
            if (existingById) {
                return NextResponse.json({ success: false, error: 'Student already has an enrollment for the current school year' }, { status: 400 });
            }
        }

        // Capacity check for section: max 15 students
        if (body.sectionId) {
            const count = await Enrollment.countDocuments({ sectionId: body.sectionId, schoolYear: selectedSchoolYear });
            if (count >= 15) {
                return NextResponse.json({ success: false, error: 'Selected section is full (15 students)' }, { status: 400 });
            }
        }

        const enrollmentData = {
            enrollmentId: body.enrollmentId || `E-${Date.now()}`,
            learnersReferenceNumber: body.learnersReferenceNumber,
            studentId: body.studentId ? String(body.studentId) : undefined,
            sectionId: body.sectionId,
            enrollmentDate: body.enrollmentDate,
            schoolYear: selectedSchoolYear,
            status: body.status,
        };

        // If client provided a studentId but not learnersReferenceNumber, resolve it from the Student collection
        if (body.studentId && !body.learnersReferenceNumber) {
            const student = await Student.findById(String(body.studentId)).lean();
            if (student) {
                enrollmentData.learnersReferenceNumber = student.learnersReferenceNumber;
            }
        }

        const enrollment = await Enrollment.create(enrollmentData);
        return NextResponse.json({ success: true, data: enrollment }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}