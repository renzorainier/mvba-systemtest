import mongoose from 'mongoose';

let gridfsBucket = null;

export async function getGridFSBucket() {
  if (gridfsBucket) {
    return gridfsBucket;
  }

  // Wait for mongoose connection
  if (mongoose.connection.readyState !== 1) {
    await new Promise((resolve) => {
      mongoose.connection.on('connected', resolve);
    });
  }

  // Create GridFS bucket
  gridfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: 'school-files',
  });

  return gridfsBucket;
}

export function resetGridFSBucket() {
  gridfsBucket = null;
}
