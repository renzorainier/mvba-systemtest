import { afterEach, describe, expect, it, vi } from 'vitest';
import Student from '@/models/Student';
import {
  generateRandomDigits,
  generateUniqueKinderOneLrn,
  isValidKinderOneLrn,
  isValidKinderTwoToSixLrn,
  normalizeLearnersReferenceNumber,
} from '@/lib/student-identifiers';

describe('student identifiers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizes learner reference numbers by trimming whitespace', () => {
    expect(normalizeLearnersReferenceNumber('  123456789012  ')).toBe('123456789012');
    expect(normalizeLearnersReferenceNumber(null)).toBe('');
  });

  it('validates Kinder 1 generated LRN format', () => {
    expect(isValidKinderOneLrn('123456')).toBe(true);
    expect(isValidKinderOneLrn('12345')).toBe(false);
    expect(isValidKinderOneLrn('1234567')).toBe(false);
    expect(isValidKinderOneLrn('ABC123')).toBe(false);
  });

  it('validates Kinder 2 to Grade 6 LRN format', () => {
    expect(isValidKinderTwoToSixLrn('123456789012')).toBe(true);
    expect(isValidKinderTwoToSixLrn('123456')).toBe(false);
    expect(isValidKinderTwoToSixLrn('12345678901A')).toBe(false);
  });

  it('generates the requested number of numeric digits', () => {
    const digits = generateRandomDigits(8);

    expect(digits).toHaveLength(8);
    expect(digits).toMatch(/^\d{8}$/);
  });

  it('generates a unique Kinder 1 LRN when the first candidate is unused', async () => {
    vi.spyOn(Student, 'exists').mockResolvedValue(null);

    const lrn = await generateUniqueKinderOneLrn();

    expect(lrn).toMatch(/^\d{6}$/);
    expect(Student.exists).toHaveBeenCalledWith({ learnersReferenceNumber: lrn });
  });

  it('throws after exhausting Kinder 1 LRN generation attempts', async () => {
    vi.spyOn(Student, 'exists').mockResolvedValue({ _id: 'existing' });

    await expect(generateUniqueKinderOneLrn()).rejects.toThrow('Unable to generate a unique Kinder 1 LRN');
    expect(Student.exists).toHaveBeenCalledTimes(20);
  });
});
