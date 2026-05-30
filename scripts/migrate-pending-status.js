// One-time migration: normalize legacy enrollment status 'Pending' → 'For payment'
// Run once: node scripts/migrate-pending-status.js
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://admin:admin123@ac-nzerx24-shard-00-00.qhp2v7e.mongodb.net:27017,ac-nzerx24-shard-00-02.qhp2v7e.mongodb.net:27017,ac-nzerx24-shard-00-01.qhp2v7e.mongodb.net:27017/mvba-database?ssl=true&authSource=admin&retryWrites=true&w=majority";

const run = async () => {
  await mongoose.connect(MONGODB_URI);
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
