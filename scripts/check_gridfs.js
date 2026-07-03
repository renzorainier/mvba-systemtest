require('dotenv').config();
const { MongoClient, GridFSBucket } = require('mongodb');
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

async function testGridFS() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db('mvba-database');
  const bucket = new GridFSBucket(db, { bucketName: 'school-files' });

  // Upload a tiny test file
  const testBuffer = Buffer.from('This is a test file content.');
  const uploadStream = bucket.openUploadStream('test.txt');
  uploadStream.end(testBuffer);
  
  await new Promise((resolve, reject) => {
    uploadStream.on('finish', resolve);
    uploadStream.on('error', reject);
  });

  const fileId = uploadStream.id;
  console.log('File ID:', fileId);

  // Verify it exists in fs.files
  const found = await db.collection('school-files.files').findOne({ _id: fileId });
  console.log('Found in school-files.files:', found);

  // Verify it has chunks
  const chunkCount = await db.collection('school-files.chunks').countDocuments({ files_id: fileId });
  console.log('Number of chunks:', chunkCount);

  // Download it back to confirm
  const data = await new Promise((resolve, reject) => {
    const downloadStream = bucket.openDownloadStream(fileId);
    let chunks = [];
    
    downloadStream.on('data', chunk => chunks.push(chunk));
    downloadStream.on('error', reject);
    downloadStream.on('end', () => {
      const fullData = Buffer.concat(chunks).toString();
      resolve(fullData);
    });
  });

  console.log('Downloaded content:', data);

  client.close();
}
testGridFS();