import mongoose from 'mongoose';

// 👇 MongoDB URI is now stored in .env file for security
const MONGODB_URI = process.env.MONGODB_URI;
// const MONGODB_URI = "mongodb://127.0.0.1:27017/mba_db";
if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI inside lib/mongodb.js');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

// ... inside dbConnect function ...

  if (!cached.promise) {
    const opts = { bufferCommands: false };

    // 👇 ADD THIS LINE
    console.log("⏳ ATTEMPTING TO CONNECT TO LOCAL DB...");

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {

      // 👇 ADD THIS LINE
      console.log("✅ MONGOOSE CONNECTED TO: " + MONGODB_URI);

      return mongoose;
    });
  }
// ...
  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
