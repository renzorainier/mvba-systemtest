import mongoose from 'mongoose';

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

if (!MONGO_URI) {
  throw new Error('Please define MONGO_URI in your .env file');
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

    cached.promise = mongoose.connect(MONGO_URI, opts).then((mongoose) => {

      // 👇 ADD THIS LINE
      console.log("✅ MONGOOSE CONNECTED TO: " + MONGO_URI);

      return mongoose;
    });
  }
// ...
  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
