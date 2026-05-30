import dbConnect from "@/lib/mongodb";
import SystemSettings, { DEFAULT_SETTINGS_PAYLOAD } from "@/models/SystemSettings";
import GradeLevelCurriculum from "@/models/GradeLevelCurriculum";
import ArchivedGradeLevelCurriculum from "@/models/ArchivedGradeLevelCurriculum";
import Curriculum from "@/models/Curriculum";
import ArchivedCurriculum from "@/models/ArchivedCurriculum";
import Section from "@/models/Section";
import ArchivedSection from "@/models/ArchivedSection";
import { NextResponse } from "next/server";
import { ensureWriteAllowedForSchoolYear, getSchoolYearContext } from "@/lib/school-year";
import { randomUUID } from "crypto";

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

const findCurriculumForSchoolYear = async (schoolYear, curriculumId) => {
    const normalizedSchoolYear = String(schoolYear || '').trim();
    const normalizedCurriculumId = String(curriculumId || '').trim();

    if (!normalizedCurriculumId) {
        return null;
    }

    const currentMatch = await Curriculum.findOne({
        schoolYear: normalizedSchoolYear,
        $or: [{ _id: normalizedCurriculumId }, { curriculum_id: normalizedCurriculumId }],
    }).lean();

    if (currentMatch) {
        return currentMatch;
    }

    const archivedMatch = await ArchivedCurriculum.findOne({
        schoolYear: normalizedSchoolYear,
        $or: [{ _id: normalizedCurriculumId }, { curriculum_id: normalizedCurriculumId }],
    }).lean();

    if (archivedMatch) {
        return archivedMatch;
    }

    return Curriculum.findOne({
        schoolYear: { $exists: false },
        $or: [{ _id: normalizedCurriculumId }, { curriculum_id: normalizedCurriculumId }],
    }).lean();
};

const findGradeLevelCurriculumForSection = async (sectionAssignmentId, schoolYear, settings) => {
    const normalizedAssignmentId = String(sectionAssignmentId || '').trim();
    const normalizedSchoolYear = String(schoolYear || '').trim();

    if (!normalizedAssignmentId) {
        return null;
    }

    const activeMatch = await GradeLevelCurriculum.findById(normalizedAssignmentId).lean();
    if (activeMatch) {
        return activeMatch;
    }

    const archivedMatch = await ArchivedGradeLevelCurriculum.findById(normalizedAssignmentId).lean();
    if (archivedMatch) {
        return archivedMatch;
    }

    const yearMatch = await GradeLevelCurriculum.findOne({
        school_year_id: normalizedSchoolYear,
        $or: [{ _id: normalizedAssignmentId }, { gl_curriculum_id: normalizedAssignmentId }],
    }).lean();
    if (yearMatch) {
        return yearMatch;
    }

    const archivedYearMatch = await ArchivedGradeLevelCurriculum.findOne({
        school_year_id: normalizedSchoolYear,
        $or: [{ _id: normalizedAssignmentId }, { gl_curriculum_id: normalizedAssignmentId }],
    }).lean();
    if (archivedYearMatch) {
        return archivedYearMatch;
    }

    return (settings.gradeLevelCurriculums || []).find((item) => String(item._id) === normalizedAssignmentId || String(item.gl_curriculum_id || '') === normalizedAssignmentId) || null;
};

    const serializeCurriculum = (curriculum) => {
        if (!curriculum) {
            return null;
        }

        return {
            _id: curriculum._id,
            curriculum_id: curriculum.curriculum_id,
            curriculum_name: curriculum.curriculum_name,
            description: curriculum.description,
            effective_start_date: curriculum.effective_start_date,
            effective_end_date: curriculum.effective_end_date,
        };
    };

    const buildSectionPayload = async (section, settings) => {
        const sectionData = section?.toObject ? section.toObject() : section;
        const sectionAssignmentId = String(sectionData.glCurriculumId || '').trim();

            const assignment = await findGradeLevelCurriculumForSection(sectionAssignmentId, sectionData.schoolYear, settings);

        let curriculum = null;
        const assignmentCurriculumId = assignment ? String(assignment.curriculum_id || '').trim() : '';

        if (assignmentCurriculumId) {
                curriculum = await findCurriculumForSchoolYear(sectionData.schoolYear, assignmentCurriculumId);

                if (!curriculum) {
                    curriculum = (settings.curriculums || []).find((item) => String(item._id) === assignmentCurriculumId || String(item.curriculum_id || '') === assignmentCurriculumId) || null;
                }
        }

        const assignmentData = assignment?.toObject ? assignment.toObject() : assignment;
        const curriculumData = curriculum?.toObject ? curriculum.toObject() : curriculum;

        return {
            ...sectionData,
            glCurriculumId: assignmentData
                ? {
                        ...assignmentData,
                        curriculum_id: serializeCurriculum(curriculumData),
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
                return NextResponse.json({ success: true, data: await Promise.all(sections.map((section) => buildSectionPayload(section, settings))) }, { status: 200 });
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

        const sectionData = {
            sectionName: body.sectionName,
            gradeLevel: body.gradeLevel,
            // use selected/current school year from context, do not trust client input
            schoolYear: selectedSchoolYear,
            glCurriculumId: body.glCurriculumId || body.gl_curriculum_id,
            roomNumber: body.roomNumber,
            sectionId: body.sectionId || `S-${randomUUID()}`,
        };

        const settings = await ensureSettings();

        if (!sectionData.sectionName || !sectionData.gradeLevel || !sectionData.schoolYear || !sectionData.glCurriculumId || !sectionData.roomNumber) {
            return NextResponse.json({ success: false, error: 'Section name, grade level, school year, curriculum, and room number are required' }, { status: 400 });
        }

        let gradeLevelCurriculum = null;

        try {
            gradeLevelCurriculum = await GradeLevelCurriculum.findById(sectionData.glCurriculumId).lean();
        } catch (error) {
            gradeLevelCurriculum = null;
        }

        if (!gradeLevelCurriculum) {
            gradeLevelCurriculum = (settings.gradeLevelCurriculums || []).find(
                (item) => String(item._id) === String(sectionData.glCurriculumId) || String(item.gl_curriculum_id || '') === String(sectionData.glCurriculumId)
            );
        }

        if (!gradeLevelCurriculum) {
            return NextResponse.json({ success: false, error: 'Selected grade-level curriculum not found' }, { status: 404 });
        }

        if (String(gradeLevelCurriculum.school_year_id || '').trim() !== String(sectionData.schoolYear || '').trim() || String(gradeLevelCurriculum.grade_level || '').trim() !== String(sectionData.gradeLevel || '').trim()) {
            return NextResponse.json({ success: false, error: 'Selected curriculum does not match the section school year and grade level' }, { status: 400 });
        }

        const section = await Section.create(sectionData);
        return NextResponse.json({ success: true, data: await buildSectionPayload(section, settings) }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}