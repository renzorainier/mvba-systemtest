import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';

const base = process.env.MONGODB_URI;
const testUri = base.replace('/mvba-database?', '/mvba-activation-test?');
await mongoose.connect(testUri);
const db = mongoose.connection.db;

// clean slate
await db.dropDatabase();

const d = (s) => new Date(s);
const ids = { s1:new ObjectId(), s2:new ObjectId(), s3:new ObjectId(), s4:new ObjectId(), d1:new ObjectId(), dc:new ObjectId() };

await db.collection('system_settings').insertOne({
  key:'tuition-breakdown', title:'t', currency:'PHP',
  currentSchoolYear:'2025-2026', draftSchoolYear:'2026-2027',
  tuitionPlans:[], breakdown:[], curriculums:[], gradeLevelCurriculums:[],
});

const baseStu = { gender:'Male', dateOfBirth:d('2018-01-01'), address:'Addr', admissionDate:d('2024-06-01'), totalEstimatedCost:0, remainingBalance:0 };
await db.collection('students').insertMany([
  { _id:ids.s1, firstName:'Promote', lastName:'One',  gradeLevel:'Grade 1', gwa:90, learnersReferenceNumber:'LRN-S1', ...baseStu }, // schoolYear missing (legacy)
  { _id:ids.s2, firstName:'Repeat',  lastName:'Two',  gradeLevel:'Grade 1', gwa:60, learnersReferenceNumber:'LRN-S2', schoolYear:'2025-2026', ...baseStu },
  { _id:ids.s3, firstName:'Graduate',lastName:'Three',gradeLevel:'Grade 6', gwa:95, learnersReferenceNumber:'LRN-S3', schoolYear:'2025-2026', ...baseStu },
  { _id:ids.s4, firstName:'Conflict',lastName:'Four', gradeLevel:'Grade 1', gwa:88, learnersReferenceNumber:'LRN-CONFLICT', schoolYear:'2025-2026', ...baseStu },
  // draft students (2026-2027)
  { _id:ids.d1, firstName:'Early',   lastName:'Draft', gradeLevel:'Kinder 1', gwa:null, learnersReferenceNumber:'LRN-D1', schoolYear:'2026-2027', ...baseStu },
  { _id:ids.dc, firstName:'DraftDup',lastName:'Conflict', gradeLevel:'Kinder 1', gwa:null, learnersReferenceNumber:'LRN-CONFLICT', schoolYear:'2026-2027', ...baseStu },
]);

await db.collection('enrollments').insertMany([
  { enrollmentId:'E-ACTIVE-1', learnersReferenceNumber:'LRN-S1', studentId:String(ids.s1), sectionId:'TBA', enrollmentDate:d('2024-06-01'), schoolYear:'2025-2026', status:'Enrolled' },
  { enrollmentId:'E-DRAFT-1', learnersReferenceNumber:'LRN-D1', studentId:String(ids.d1), sectionId:'TBA', enrollmentDate:d('2025-06-01'), schoolYear:'2026-2027', status:'Pending' },
]);

await db.collection('financials').insertOne({
  paymentId:'P-1', studentId:String(ids.s2), amountPaid:1000, dateOfPayment:d('2024-09-01'),
  paymentMethod:'Cash', referenceNumber:'R1', status:'Completed', receivedBy:'Cashier', schoolYear:'2025-2026', documents:[],
});

await db.collection('sections').insertMany([
  { sectionId:'SEC-A', sectionName:'Active Sec', gradeLevel:'Grade 1', schoolYear:'2025-2026', roomNumber:'101' },
  { sectionId:'SEC-D', sectionName:'Draft Sec', gradeLevel:'Kinder 1', schoolYear:'2026-2027', roomNumber:'201' },
]);

await db.collection('curriculums').insertMany([
  { curriculum_id:'CUR-A', schoolYear:'2025-2026', curriculum_name:'Active Cur', effective_start_date:d('2024-06-01'), effective_end_date:d('2025-03-01'), subjects:[{subject_id:'S1',subject_name:'Math'}] },
  { curriculum_id:'CUR-D', schoolYear:'2026-2027', curriculum_name:'Draft Cur', effective_start_date:d('2025-06-01'), effective_end_date:d('2026-03-01'), subjects:[{subject_id:'S1',subject_name:'Math'}] },
]);

console.log('SEEDED test db. testUri db = mvba-activation-test');
console.log('pre students:', await db.collection('students').countDocuments({}));
console.log('pre sections:', await db.collection('sections').countDocuments({}));
await mongoose.disconnect();
