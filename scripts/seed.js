// Run this script once to create the Admin account: node seed.js
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const crypto = require('node:crypto');

const DEFAULT_SCHOOL_YEAR = '2024-2025';

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

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const iterations = 120000;
  const hash = crypto
    .pbkdf2Sync(password, salt, iterations, 32, 'sha256')
    .toString('hex');

  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

const seedDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to DB");

    const db = mongoose.connection.db;

    await db.collection('accounts').updateOne(
      { username: 'admin' },
      {
        $set: {
          username: 'admin',
          password: hashPassword('password123'),
          fullName: 'System Administrator',
          role: 'Admin',
          isActive: true,
        },
        $setOnInsert: {
          createdAt: new Date(),
          failedLoginAttempts: 0,
          lockoutUntil: null,
          lastFailedLoginAt: null,
          lastSuccessfulLoginAt: null,
          recoveryCodeHash: null,
          recoveryCodeCreatedAt: null,
          recoveryCodeUsedAt: null,
        },
      },
      { upsert: true }
    );

    await db.collection('system_settings').updateOne(
      { key: 'tuition-breakdown' },
      {
        $set: {
          key: 'tuition-breakdown',
          title: 'Sample Tuition Fee Breakdown (Kindergarten to Grade 6)',
          currency: 'PHP',
          currentSchoolYear: DEFAULT_SCHOOL_YEAR,
          draftSchoolYear: null,
          schoolName: 'Standard Academy Institute',
          schoolAddress: '123 Education Blvd, Metro Manila',
          tuitionPlans: [],
          breakdown: [],
          curriculums: [],
          gradeLevelCurriculums: [],
        },
      },
      { upsert: true }
    );

    console.log("✅ Admin Account Created!");
    console.log("👤 User: admin");
    console.log("🔑 Pass: password123");
    console.log(`📅 School Year Seeded: ${DEFAULT_SCHOOL_YEAR}`);

  } catch (err) {
    console.log(err);
  } finally {
    mongoose.connection.close();
  }
};

seedDB();
