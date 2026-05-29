import { describe, expect, it } from 'vitest';
import { authCookie, createMockRequest, readJsonResponse } from './http';
import { seedSettings, seedStudent } from './seeds';
import dbConnect from '@/lib/mongodb';
import { NextResponse } from 'next/server';

describe('test utilities', () => {
  it('creates mock requests with JSON bodies and cookies', async () => {
    const request = createMockRequest({
      body: { ok: true },
      cookies: { auth_token: authCookie('Registrar', 'Test Registrar') },
    });

    expect(await request.json()).toEqual({ ok: true });
    expect(request.cookies.get('auth_token').value).toContain('Registrar');
  });

  it('reads NextResponse JSON and seeds database records', async () => {
    await dbConnect();
    await seedSettings();
    const student = await seedStudent();
    const response = await readJsonResponse(NextResponse.json({ id: student._id.toString() }, { status: 201 }));

    expect(response.status).toBe(201);
    expect(response.body.id).toBe(student._id.toString());
  });
});
