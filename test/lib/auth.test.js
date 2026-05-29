import { describe, expect, it } from 'vitest';
import { getAuthenticatedUser, parseAuthToken } from '@/lib/auth';
import { authCookie, createMockRequest } from '../utils/http';

describe('auth helpers', () => {
  it('parses valid auth tokens', () => {
    expect(parseAuthToken(authCookie('Admin', 'Ada'))).toEqual({ role: 'Admin', name: 'Ada' });
  });

  it('returns null for missing or invalid tokens', () => {
    expect(parseAuthToken()).toBeNull();
    expect(parseAuthToken('{bad json')).toBeNull();
  });

  it('requires a role for authenticated users', () => {
    const request = createMockRequest({ cookies: { auth_token: JSON.stringify({ name: 'No Role' }) } });

    expect(getAuthenticatedUser(request)).toBeNull();
  });

  it('extracts authenticated user from request cookies', () => {
    const request = createMockRequest({ cookies: { auth_token: authCookie('Cashier', 'Test Cashier') } });

    expect(getAuthenticatedUser(request)).toEqual({ role: 'Cashier', name: 'Test Cashier' });
  });
});
