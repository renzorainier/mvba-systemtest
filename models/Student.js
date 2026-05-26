import mongoose from 'mongoose';

const StudentSchema = new mongoose.Schema({
   // Everything should match the front end
  firstName: { type: String, required: [true, "First name is required"]},
  lastName: { type: String, required: [true, "Last name is required"] },
  middleName: { type: String, required: false },
  gender: {type: String, required: [true, "Gender is required"] },
  gradeLevel: {
    type: String,
    required: false,
      enum: ['Kinder 1', 'Kinder 2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'],
  },
  gwa: { type: Number, required: false, default: null, min: 0, max: 100 },
  dateOfBirth: { type: Date, required: [true, "Date of birth is required"] },
  address: { type: String, required: [true, "Address is required"] },
  admissionDate: { type: Date, required: [true, "Admission date is required"] },
  learnersReferenceNumber: { type: String, required: false },
  parentGuardianName: { type: String, required: false, default: '' },
  parentGuardianRelationship: { type: String, required: false, default: '' },
  parentGuardianContactNumber: { type: String, required: false, default: '' },
  sectionId: { type: String, required: false, default: null },
  totalEstimatedCost: { type: Number, default: 15000, min: 0 },
  remainingBalance: { type: Number, default: 15000, min: 0 },
  profilePicture: { type: String, required: false, default: null },
  documents: [
    {
      fileId: mongoose.Schema.Types.ObjectId,
      fileName: String,
      uploadedAt: { type: Date, default: Date.now },
    }
  ],
}, { timestamps: true });

// Enforce uniqueness for LRNs except for the placeholder value 'TBA'
StudentSchema.index(
  { learnersReferenceNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      learnersReferenceNumber: { $exists: true, $ne: 'TBA' },
    },
  }
);


// Check if model exists before compiling to prevent overwrite errors in dev mode
export default mongoose.models.Student || mongoose.model('Student', StudentSchema, 'students');

// Ensure old unique index (learnersReferenceNumber_1) is removed and the new partial index exists.
const ensureStudentIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    if (!db) return;

    const coll = db.collection('students');
    const indexes = await coll.indexes().catch(() => []);

    if (indexes.some((index) => index.name === 'learnersReferenceNumber_1')) {
      await coll.dropIndex('learnersReferenceNumber_1').catch(() => {});
    }

    await coll.createIndex(
      { learnersReferenceNumber: 1 },
      {
        unique: true,
        partialFilterExpression: { learnersReferenceNumber: { $exists: true, $ne: 'TBA' } },
        name: 'learnersReferenceNumber_partial_unique',
      }
    ).catch(() => {});
  } catch (err) {
    // ignore errors — index operations may fail in some environments
    // console.warn('ensureStudentIndexes error', err);
  }
};

if (mongoose.connection && mongoose.connection.readyState === 1) {
  ensureStudentIndexes();
} else {
  mongoose.connection.once('open', ensureStudentIndexes);
}
