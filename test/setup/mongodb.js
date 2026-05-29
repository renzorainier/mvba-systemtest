import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { setup, teardown } from 'vitest-mongodb';

beforeAll(async () => {
  await setup({ type: 'replSet' });
  process.env.MONGODB_URI = globalThis.__MONGO_URI__;
});

afterEach(async () => {
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  const collections = mongoose.connection.collections;

  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({}))
  );
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  delete global.mongoose;
  await teardown();
});
