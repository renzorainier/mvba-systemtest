/**
 * Migration script: convert Student.documents (array) into fixed fields
 * Usage:
 *  - With .env file: create a .env containing MONGODB_URI then run `node scripts/migrate-documents.js`
 *  - Or pass MONGODB_URI inline (Windows CMD): `set MONGODB_URI="mongodb://..." && node scripts/migrate-documents.js`
 */
// Attempt to load .env if dotenv is installed. If not installed, ignore.
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not available; proceed relying on environment variables
}

const dbConnect = require('../lib/mongodb').default;
const Student = require('../models/Student').default;

async function run() {
  await dbConnect();
  const mapLabelToField = {
    'Birth Certificate': 'birthCertificate',
    'Report Card': 'reportCard',
    'Form 137': 'medicalRecord',
  };
  const dryRun = !process.argv.includes('--apply');
  const students = await Student.find({ documents: { $exists: true } }).lean();
  console.log(`Found ${students.length} students with a legacy 'documents' array`);

  const detectFieldFromFileName = (name) => {
    if (!name) return null;
    const n = String(name).toLowerCase();
    if (n.includes('birth')) return 'birthCertificate';
    if (n.includes('report')) return 'reportCard';
    if (n.includes('form 137') || n.includes('form137') || /\b137\b/.test(n)) return 'medicalRecord';
    if (n.includes('medical')) return 'medicalRecord';
    return null;
  };

  let totalCandidates = 0;
  let totalMigrated = 0;
  let totalSkipped = 0;

  for (const student of students) {
    const docs = Array.isArray(student.documents) ? student.documents : [];
    if (docs.length === 0) continue;

    const update = {};
    const mappedFields = [];
    const unmappedFiles = [];

    // Try mapping by explicit filename label or content; if none matches, fall back to index-based mapping
    const indexMap = ['birthCertificate', 'medicalRecord', 'reportCard'];
    docs.forEach((d, idx) => {
      const fileName = d.fileName || d.name || '';
      const byLabel = mapLabelToField[fileName];
      const detected = byLabel || detectFieldFromFileName(fileName);

      if (detected && !student[detected]) {
        update[detected] = d;
        mappedFields.push(`${detected} (detected from '${fileName}')`);
      } else {
        // fallback to positional mapping for the first three slots
        const fallback = indexMap[idx];
        if (fallback && !student[fallback] && !update[fallback]) {
          update[fallback] = d;
          mappedFields.push(`${fallback} (by index ${idx} from '${fileName || d.fileId || '<no-name>'}')`);
        } else {
          unmappedFiles.push(fileName || d.fileId || '<no-name>');
        }
      }
    });

    if (Object.keys(update).length > 0) {
      totalCandidates++;
      console.log(`Student ${student._id} -> will set: ${Object.keys(update).join(', ')}; unmapped: ${unmappedFiles.join(', ')}`);
      if (!dryRun) {
        const setObj = { ...update };
        const unsetObj = { documents: '' };
        await Student.updateOne({ _id: student._id }, { $set: setObj, $unset: unsetObj });
        console.log(`Migrated student ${student._id}`);
        totalMigrated++;
      }
    } else {
      totalSkipped++;
    }
  }

  console.log('Migration complete');
  console.log(`Dry run: ${dryRun}. Candidates: ${totalCandidates}, Migrated: ${totalMigrated}, Skipped: ${totalSkipped}`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
