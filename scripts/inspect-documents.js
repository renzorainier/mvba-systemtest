/**
 * Inspect student documents stored in MongoDB to help tune the migration.
 * Usage: node scripts/inspect-documents.js
 */
try { require('dotenv').config(); } catch (e) {}
const dbConnect = require('../lib/mongodb').default;
const Student = require('../models/Student').default;

async function run() {
  await dbConnect();
  const students = await Student.find({ documents: { $exists: true } }).limit(10).lean();
  console.log(`Found ${students.length} students with 'documents' arrays (showing up to 10):\n`);
  for (const s of students) {
    console.log('---');
    console.log('Student _id:', s._id);
    console.log('birthCertificate:', !!s.birthCertificate, 'reportCard:', !!s.reportCard, 'medicalRecord:', !!s.medicalRecord);
    // Show raw stored legacy documents
    console.log('stored documents:');
    console.log(JSON.stringify(s.documents || [], null, 2));
    console.log('\n');
  }
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
