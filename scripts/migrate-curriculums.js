#!/usr/bin/env node
/**
 * Migration script: move curriculums and grade-level curriculums
 * from the SystemSettings document (key: 'tuition-breakdown') into
 * the dedicated `curriculums` and `grade_level_curriculums` collections.
 *
 * Usage (from project root):
 *   node ./scripts/migrate-curriculums.js
 *
 * Ensure `MONGODB_URI` is set in the environment before running.
 */

import dbConnect from '../lib/mongodb.js';
import SystemSettings from '../models/SystemSettings.js';
import Curriculum from '../models/Curriculum.js';
import GradeLevelCurriculum from '../models/GradeLevelCurriculum.js';

const SETTINGS_KEY = 'tuition-breakdown';

async function run() {
  try {
    await dbConnect();

    const settings = await SystemSettings.findOne({ key: SETTINGS_KEY }).lean();
    if (!settings) {
      console.log(`No SystemSettings document found for key=${SETTINGS_KEY}`);
      process.exit(0);
    }

    const curriculums = Array.isArray(settings.curriculums) ? settings.curriculums : [];
    const glCurriculums = Array.isArray(settings.gradeLevelCurriculums) ? settings.gradeLevelCurriculums : [];
    const currentSchoolYear = String(settings.currentSchoolYear || '').trim();

    console.log(`Found ${curriculums.length} curriculums and ${glCurriculums.length} grade-level curriculums to migrate.`);

    // Migrate curriculums
    for (const c of curriculums) {
      const curriculumId = String(c.curriculum_id || '').trim() || `CUR-${Date.now()}`;
      const schoolYear = String(c.schoolYear || currentSchoolYear || '').trim();
      const filter = { curriculum_id: curriculumId };
      const payload = {
        curriculum_id: curriculumId,
        schoolYear,
        curriculum_name: c.curriculum_name || '',
        description: c.description || '',
        effective_start_date: c.effective_start_date || new Date(),
        effective_end_date: c.effective_end_date || new Date(),
      };

      if (Array.isArray(c.subjects) && c.subjects.length > 0) payload.subjects = c.subjects;

      const existing = await Curriculum.findOne(filter).lean();
      if (existing) {
        console.log(`Skipping existing curriculum ${curriculumId}`);
      } else {
        await Curriculum.create(payload);
        console.log(`Created curriculum ${payload.curriculum_id}`);
      }
    }

    // Migrate grade level curriculums — only if referenced curriculum can be resolved
    for (const g of glCurriculums) {
      const glId = String(g.gl_curriculum_id || `GL-${Date.now()}`).trim();
      const filter = { gl_curriculum_id: glId };

      // attempt to map referenced curriculum
      let mappedCurriculum = null;
      if (g.curriculum_id) {
        mappedCurriculum = await Curriculum.findOne({ curriculum_id: String(g.curriculum_id).trim() }).lean();
      }

      if (!mappedCurriculum) {
        console.log(`Skipping grade-level curriculum ${glId}: referenced curriculum not found. Please review and assign manually.`);
        continue;
      }

      const payload = {
        gl_curriculum_id: glId,
        school_year_id: g.school_year_id || '',
        grade_level: g.grade_level || '',
        curriculum_id: mappedCurriculum._id,
        is_default: !!g.is_default,
      };

      const existing = await GradeLevelCurriculum.findOne(filter).lean();
      if (existing) {
        console.log(`Skipping existing grade-level curriculum ${glId}`);
      } else {
        await GradeLevelCurriculum.create(payload);
        console.log(`Created grade-level curriculum ${glId} for grade ${payload.grade_level}`);
      }
    }

    console.log('Migration complete.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(2);
  }
}

run();
