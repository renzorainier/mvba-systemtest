// One-time migration: move curriculum / grade-level-curriculum data OUT of the
// embedded system_settings.curriculums / system_settings.gradeLevelCurriculums arrays
// and into the dedicated `curriculums` and `grade_level_curriculums` collections,
// then drop the embedded fields from the settings document.
//
// Safe to re-run: it only inserts embedded docs that are not already present in the
// dedicated collections (matched by _id), preserving their _id so existing references
// (e.g. GradeLevelCurriculum.curriculum_id, Section.glCurriculumId) keep resolving.
//
// Usage:  node migrate-embedded-curriculums.mjs            (dry run, reports only)
//         node migrate-embedded-curriculums.mjs --apply    (perform the migration)

import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

const APPLY = process.argv.includes('--apply');
const SETTINGS_KEY = 'tuition-breakdown';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set. Aborting.');
  process.exit(1);
}

await mongoose.connect(uri);
const db = mongoose.connection.db;

const settingsCol = db.collection('system_settings');
const curriculumsCol = db.collection('curriculums');
const glCol = db.collection('grade_level_curriculums');

const settings = await settingsCol.findOne({ key: SETTINGS_KEY });

if (!settings) {
  console.log(`No system_settings document found for key="${SETTINGS_KEY}". Nothing to do.`);
  await mongoose.disconnect();
  process.exit(0);
}

const embeddedCurriculums = Array.isArray(settings.curriculums) ? settings.curriculums : [];
const embeddedGl = Array.isArray(settings.gradeLevelCurriculums) ? settings.gradeLevelCurriculums : [];

console.log(`Embedded in system_settings -> curriculums: ${embeddedCurriculums.length}, gradeLevelCurriculums: ${embeddedGl.length}`);

let curriculumsToInsert = [];
for (const cur of embeddedCurriculums) {
  if (!cur?._id) continue;
  const exists = await curriculumsCol.findOne({ _id: cur._id }, { projection: { _id: 1 } });
  if (!exists) curriculumsToInsert.push(cur);
}

let glToInsert = [];
for (const gl of embeddedGl) {
  if (!gl?._id) continue;
  const exists = await glCol.findOne({ _id: gl._id }, { projection: { _id: 1 } });
  if (!exists) glToInsert.push(gl);
}

console.log(`Not yet in dedicated collections -> curriculums: ${curriculumsToInsert.length}, gradeLevelCurriculums: ${glToInsert.length}`);

if (!APPLY) {
  console.log('\nDry run only. Re-run with --apply to migrate and drop the embedded fields.');
  await mongoose.disconnect();
  process.exit(0);
}

if (curriculumsToInsert.length > 0) {
  await curriculumsCol.insertMany(curriculumsToInsert, { ordered: false });
  console.log(`Inserted ${curriculumsToInsert.length} curriculum(s) into the curriculums collection.`);
}

if (glToInsert.length > 0) {
  await glCol.insertMany(glToInsert, { ordered: false });
  console.log(`Inserted ${glToInsert.length} grade-level curriculum(s) into the grade_level_curriculums collection.`);
}

const result = await settingsCol.updateOne(
  { key: SETTINGS_KEY },
  { $unset: { curriculums: '', gradeLevelCurriculums: '' } }
);

console.log(`Dropped embedded fields from system_settings (modified: ${result.modifiedCount}).`);
console.log('Migration complete.');

await mongoose.disconnect();
