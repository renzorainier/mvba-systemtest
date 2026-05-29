import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';

describe('test environment', () => {
  it('connects to the in-memory MongoDB instance', async () => {
    const { default: dbConnect } = await import('@/lib/mongodb');

    await dbConnect();

    expect(process.env.MONGODB_URI).toBe(globalThis.__MONGO_URI__);
    expect(mongoose.connection.readyState).toBe(1);
  });
});
