import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/passwords';

describe('password helpers', () => {
  it('hashes and verifies a password', () => {
    const hashed = hashPassword('secret-password');

    expect(hashed).toMatch(/^pbkdf2\$120000\$/);
    expect(hashed).not.toContain('secret-password');
    expect(verifyPassword('secret-password', hashed)).toEqual({
      isValid: true,
      needsUpgrade: false,
    });
    expect(verifyPassword('wrong-password', hashed)).toEqual({
      isValid: false,
      needsUpgrade: false,
    });
  });

  it('accepts legacy plain-text passwords and marks them for upgrade', () => {
    expect(verifyPassword('legacy', 'legacy')).toEqual({
      isValid: true,
      needsUpgrade: true,
    });
    expect(verifyPassword('wrong', 'legacy')).toEqual({
      isValid: false,
      needsUpgrade: true,
    });
  });
});
