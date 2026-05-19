import dbConnect from "@/lib/mongodb";
import SystemSettings, { DEFAULT_SETTINGS_PAYLOAD } from "@/models/SystemSettings";
import Section from "@/models/Section";
import ArchivedSection from "@/models/ArchivedSection";
import { NextResponse } from "next/server";
import { ensureWriteAllowedForSchoolYear, getSchoolYearContext } from "@/lib/school-year";

const SETTINGS_KEY = 'tuition-breakdown';

const ensureSettings = async () => {
    const collection = SystemSettings.collection;
    let settings = await collection.findOne({ key: SETTINGS_KEY });
    if (!settings) {
        await collection.updateOne(
            { key: SETTINGS_KEY },
            { $setOnInsert: { ...DEFAULT_SETTINGS_PAYLOAD, curriculums: [], gradeLevelCurriculums: [] } },
            { upsert: true }
        );
        settings = await collection.findOne({ key: SETTINGS_KEY });
    }

    settings.curriculums = Array.isArray(settings.curriculums) ? settings.curriculums : [];
    settings.gradeLevelCurriculums = Array.isArray(settings.gradeLevelCurriculums) ? settings.gradeLevelCurriculums : [];
    return settings;
};

const buildSectionPayload = (section, settings) => {
    const assignment = (settings.gradeLevelCurriculums || []).find((item) => String(item._id) === String(section.glCurriculumId));
    const curriculum = assignment ? (settings.curriculums || []).find((item) => String(item._id) === String(assignment.curriculum_id)) : null;

    const assignmentData = assignment?.toObject ? assignment.toObject() : assignment;
    const curriculumData = curriculum?.toObject ? curriculum.toObject() : curriculum;

    return {
        ...section.toObject(),
        glCurriculumId: assignment
            ? {
                    ...assignmentData,
                    curriculum_id: curriculumData
                        ? {
                                _id: curriculumData._id,
                                curriculum_id: curriculumData.curriculum_id,
                                curriculum_name: curriculumData.curriculum_name,
                                description: curriculumData.description,
                                effective_start_date: curriculumData.effective_start_date,
                                effective_end_date: curriculumData.effective_end_date,
                            }
                        : null,
                }
            : null,
    };
};

export async function GET(request) {
    try {
        await dbConnect();
                const { selectedSchoolYear, isHistorical } = await getSchoolYearContext(request);
                const settings = await ensureSettings();
                const sections = isHistorical
                    ? await ArchivedSection.find({ schoolYear: selectedSchoolYear }).sort({ createdAt: -1 })
                    : await Section.find({ schoolYear: selectedSchoolYear }).sort({ createdAt: -1 });
                return NextResponse.json({ success: true, data: isHistorical ? sections : sections.map((section) => buildSectionPayload(section, settings)) }, { status: 200 });
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
        const sectionData = {
            sectionName: body.sectionName,
            gradeLevel: body.gradeLevel,
            schoolYear: body.schoolYear,
            glCurriculumId: body.glCurriculumId || body.gl_curriculum_id,
            roomNumber: body.roomNumber,
            sectionId: body.sectionId || `S-${Date.now()}`, // Auto-generate if not provided
        };

        if (!sectionData.sectionName || !sectionData.gradeLevel || !sectionData.schoolYear || !sectionData.glCurriculumId || !sectionData.roomNumber) {
            return NextResponse.json({ success: false, error: 'Section name, grade level, school year, curriculum, and room number are required' }, { status: 400 });
        }

        const settings = await ensureSettings();
        const gradeLevelCurriculum = (settings.gradeLevelCurriculums || []).find((item) => String(item._id) === String(sectionData.glCurriculumId));
        if (!gradeLevelCurriculum) {
            return NextResponse.json({ success: false, error: 'Selected grade-level curriculum not found' }, { status: 404 });
        }

        if (String(gradeLevelCurriculum.school_year_id || '').trim() !== String(sectionData.schoolYear || '').trim() || String(gradeLevelCurriculum.grade_level || '').trim() !== String(sectionData.gradeLevel || '').trim()) {
            return NextResponse.json({ success: false, error: 'Selected curriculum does not match the section school year and grade level' }, { status: 400 });
        }

        const section = await Section.create(sectionData);
        return NextResponse.json({ success: true, data: buildSectionPayload(section, settings) }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}