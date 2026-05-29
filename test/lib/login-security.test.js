import { describe, expect, it } from 'vitest';
import {
  checkLoginThrottle,
  getClientIp,
  recordLoginFailure,
  recordLoginSuccess,
} from '@/lib/login-security';

const headersRequest = (headers = {}) => ({
  headers: {
    get: (name) => headers[name.toLowerCase()] || null,
  },
});

describe('login security helpers', () => {
  it('detects client IP from priority headers', () => {
    expect(getClientIp(headersRequest({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2' }))).toBe('1.1.1.1');
    expect(getClientIp(headersRequest({ 'x-real-ip': '3.3.3.3' }))).toBe('3.3.3.3');
    expect(getClientIp(headersRequest({ 'cf-connecting-ip': '4.4.4.4' }))).toBe('4.4.4.4');
    expect(getClientIp(headersRequest())).toBe('unknown');
  });

  it('throttles repeated attempts for one username', () => {
    const username = `user-${Date.now()}-${Math.random()}`;
    const ip = `10.0.0.${Math.floor(Math.random() * 200)}`;
    let result;

    for (let index = 0; index < 9; index += 1) {
      result = checkLoginThrottle({ ip, username });
    }

    expect(result.allowed).toBe(false);
    expect(result.status).toBe(429);
    expect(result.message).toContain('Too many attempts');
  });

  it('mutates account lockout fields on failure and clears them on success', () => {
    const account = { failedLoginAttempts: 4, lockoutUntil: null };

    recordLoginFailure({ ip: '127.0.0.1', username: `lock-${Date.now()}`, account });

    expect(account.failedLoginAttempts).toBe(0);
    expect(account.lockoutUntil).toBeInstanceOf(Date);
    expect(account.lastFailedLoginAt).toBeInstanceOf(Date);

    recordLoginSuccess({ ip: '127.0.0.1', username: `lock-${Date.now()}`, account });

    expect(account.failedLoginAttempts).toBe(0);
    expect(account.lockoutUntil).toBeNull();
    expect(account.lastSuccessfulLoginAt).toBeInstanceOf(Date);
    expect(account.lastFailedLoginAt).toBeNull();
  });
});
