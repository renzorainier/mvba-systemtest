// One-time migration: normalize legacy enrollment status 'Pending' → 'For payment'
// Run once: node scripts/migrate-pending-status.js
require('dotenv').config();
const mongoose = require('mongoose');

const rawMongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

const normalizeMongoUri = (value) => {
  if (!value) {
    return '';
  }

  const trimmed = String(value).trim();

  if (/^mongodb(?:\+srv)?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `mongodb://${trimmed}`;
};

const MONGO_URI = normalizeMongoUri(rawMongoUri);

const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('Connected.');

  const db = mongoose.connection.db;
  const result = await db.collection('enrollments').updateMany(
    { status: 'Pending' },
    { $set: { status: 'For payment' } }
  );

  console.log(`Updated ${result.modifiedCount} enrollment(s) from 'Pending' → 'For payment'.`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
