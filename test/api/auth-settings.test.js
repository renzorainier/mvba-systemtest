import { beforeEach, describe, expect, it, vi } from 'vitest';
import Account from '@/models/Account';
import SystemSettings from '@/models/SystemSettings';
import { hashPassword } from '@/lib/passwords';
import { authCookie, createMockRequest, readJsonResponse } from '../utils/http';
import { seedAccount, seedSettings } from '../utils/seeds';

const cookieMock = vi.hoisted(() => ({
  store: {
    get: () => undefined,
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => cookieMock.store),
}));

const loginRoute = await import('@/app/api/login/route');
const logoutRoute = await import('@/app/api/logout/route');
const settingsRoute = await import('@/app/api/system-settings/route');

describe('authentication and settings routes', () => {
  beforeEach(async () => {
    cookieMock.store = {
      get: () => undefined,
      delete: vi.fn(),
    };
  });

  it('rejects login requests with missing credentials', async () => {
    const response = await readJsonResponse(await loginRoute.POST(createMockRequest({ body: { username: '', password: '' } })));

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ success: false, message: 'Username and password are required' });
  });

  it('rejects invalid credentials', async () => {
    await seedAccount({ username: 'login-invalid', password: hashPassword('correct') });

    const response = await readJsonResponse(await loginRoute.POST(createMockRequest({
      body: { username: 'login-invalid', password: 'wrong' },
      headers: { 'x-real-ip': '192.0.2.10' },
    })));

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Invalid credentials');
  });

  it('rejects disabled and locked accounts', async () => {
    await seedAccount({ username: 'disabled-user', isActive: false });
    await seedAccount({
      username: 'locked-user',
      lockoutUntil: new Date(Date.now() + 60_000),
    });

    const disabled = await readJsonResponse(await loginRoute.POST(createMockRequest({
      body: { username: 'disabled-user', password: 'password123' },
      headers: { 'x-real-ip': '192.0.2.11' },
    })));
    const locked = await readJsonResponse(await loginRoute.POST(createMockRequest({
      body: { username: 'locked-user', password: 'password123' },
      headers: { 'x-real-ip': '192.0.2.12' },
    })));

    expect(disabled.status).toBe(403);
    expect(disabled.body.message).toBe('This account is disabled');
    expect(locked.status).toBe(423);
    expect(locked.body.message).toContain('temporarily locked');
  });

  it('logs in valid users, sets auth cookie, and upgrades legacy passwords', async () => {
    await seedAccount({
      username: 'legacy-user',
      password: 'legacy-password',
      fullName: 'Legacy Admin',
      role: 'Admin',
    });

    const response = await readJsonResponse(await loginRoute.POST(createMockRequest({
      body: { username: 'legacy-user', password: 'legacy-password' },
      headers: { 'x-real-ip': '192.0.2.13' },
    })));
    const updated = await Account.findOne({ username: 'legacy-user' }).lean();

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, user: { name: 'Legacy Admin', role: 'Admin' } });
    expect(response.cookies.get('auth_token')?.value).toContain('Admin');
    expect(updated.password).toMatch(/^pbkdf2\$/);
  });

  it('clears auth cookie on logout', async () => {
    const deleteCookie = vi.fn();
    cookieMock.store = {
      get: () => undefined,
      delete: deleteCookie,
    };

    const response = await readJsonResponse(await logoutRoute.POST());

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(deleteCookie).toHaveBeenCalledWith('auth_token');
  });

  it('creates and returns default system settings', async () => {
    const response = await readJsonResponse(await settingsRoute.GET());

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.currentSchoolYear).toBe('2025-2026');
    expect(await SystemSettings.countDocuments({ key: 'tuition-breakdown' })).toBe(1);
  });

  it('rejects non-admin settings updates', async () => {
    await seedSettings();

    const response = await readJsonResponse(await settingsRoute.PUT(createMockRequest({
      cookies: { auth_token: authCookie('Registrar', 'Registrar') },
      body: { currentPassword: 'password123' },
    })));

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Only admins can update system settings.');
  });

  it('validates admin settings update password, school year, and tuition plans', async () => {
    await seedSettings();
    await seedAccount({ username: 'settings-admin', fullName: 'Settings Admin', password: hashPassword('admin-pass') });
    const cookieValue = authCookie('Admin', 'Settings Admin');
    cookieMock.store = {
      get: (name) => name === 'auth_token' ? { value: cookieValue } : undefined,
    };

    const missingPassword = await readJsonResponse(await settingsRoute.PUT(createMockRequest({
      cookies: { auth_token: cookieValue },
      body: { tuitionPlans: [{ gradeLabel: 'Grade 1', totalBaseCost: 1 }], currentSchoolYear: '2025-2026' },
    })));
    const wrongPassword = await readJsonResponse(await settingsRoute.PUT(createMockRequest({
      cookies: { auth_token: cookieValue },
      body: { currentPassword: 'wrong', tuitionPlans: [{ gradeLabel: 'Grade 1', totalBaseCost: 1 }], currentSchoolYear: '2025-2026' },
    })));
    const invalidYear = await readJsonResponse(await settingsRoute.PUT(createMockRequest({
      cookies: { auth_token: cookieValue },
      body: { currentPassword: 'admin-pass', tuitionPlans: [{ gradeLabel: 'Grade 1', totalBaseCost: 1 }], currentSchoolYear: '2025-2027' },
    })));
    const emptyPlans = await readJsonResponse(await settingsRoute.PUT(createMockRequest({
      cookies: { auth_token: cookieValue },
      body: { currentPassword: 'admin-pass', tuitionPlans: [], currentSchoolYear: '2025-2026' },
    })));

    expect(missingPassword.status).toBe(400);
    expect(wrongPassword.status).toBe(401);
    expect(invalidYear.status).toBe(400);
    expect(emptyPlans.status).toBe(400);
  });

  it('accepts valid admin settings updates', async () => {
    await seedSettings();
    await seedAccount({ username: 'valid-settings-admin', fullName: 'Valid Admin', password: hashPassword('admin-pass') });
    const cookieValue = authCookie('Admin', 'Valid Admin');
    cookieMock.store = {
      get: (name) => name === 'auth_token' ? { value: cookieValue } : undefined,
    };

    const response = await readJsonResponse(await settingsRoute.PUT(createMockRequest({
      cookies: { auth_token: cookieValue },
      body: {
        title: 'Updated Tuition',
        currency: 'PHP',
        currentPassword: 'admin-pass',
        currentSchoolYear: '2026-2027',
        tuitionPlans: [{ gradeLabel: 'Grade 1', applicableGrades: ['Grade 1'], totalBaseCost: 12345 }],
        breakdown: [{ label: 'Tuition', amount: 12345 }],
      },
    })));

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      title: 'Updated Tuition',
      currentSchoolYear: '2026-2027',
      totalEstimatedCost: 12345,
    });
  });
});
