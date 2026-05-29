import { describe, expect, it } from 'vitest';
import dbConnect from '@/lib/mongodb';
import SystemSettings from '@/models/SystemSettings';
import {
  SCHOOL_YEAR_COOKIE,
  buildSchoolYearFilter,
  ensureWriteAllowedForSchoolYear,
  getNextGradeLevel,
  getNextSchoolYear,
  getSchoolYearContext,
  isValidSchoolYear,
  normalizeSchoolYear,
} from '@/lib/school-year';

const makeRequest = (selectedSchoolYear) => ({
  cookies: {
    get: (name) => (
      name === SCHOOL_YEAR_COOKIE && selectedSchoolYear
        ? { value: selectedSchoolYear }
        : undefined
    ),
  },
});

describe('school-year helpers', () => {
  it('normalizes and validates school years', () => {
    expect(normalizeSchoolYear(' 2025 - 2026 ')).toBe('2025-2026');
    expect(normalizeSchoolYear('2025/2026')).toBeNull();
    expect(isValidSchoolYear('2025-2026')).toBe(true);
    expect(isValidSchoolYear('2025-2027')).toBe(false);
  });

  it('calculates next school year and grade level', () => {
    expect(getNextSchoolYear('2025-2026')).toBe('2026-2027');
    expect(getNextSchoolYear('bad value')).toBe('');
    expect(getNextGradeLevel('Kinder 1')).toBe('Kinder 2');
    expect(getNextGradeLevel('Grade 6')).toBeNull();
  });

  it('builds a selected school-year filter from request cookies', () => {
    expect(buildSchoolYearFilter(makeRequest('2024-2025'))).toEqual({ schoolYear: '2024-2025' });
    expect(buildSchoolYearFilter(makeRequest('2024-2025'), 'year')).toEqual({ year: '2024-2025' });
    expect(buildSchoolYearFilter(makeRequest('invalid'))).toEqual({});
  });

  it('uses settings and request cookies to determine current versus historical context', async () => {
    await dbConnect();

    await SystemSettings.create({
      key: 'tuition-breakdown',
      currentSchoolYear: '2025-2026',
      title: 'Test Tuition',
      currency: 'PHP',
      tuitionPlans: [],
      breakdown: [],
    });

    await expect(getSchoolYearContext(makeRequest('2025-2026'))).resolves.toMatchObject({
      currentSchoolYear: '2025-2026',
      selectedSchoolYear: '2025-2026',
      isHistorical: false,
    });

    await expect(getSchoolYearContext(makeRequest('2024-2025'))).resolves.toMatchObject({
      currentSchoolYear: '2025-2026',
      selectedSchoolYear: '2024-2025',
      isHistorical: true,
    });
  });

  it('blocks writes for historical school years', async () => {
    await dbConnect();

    await SystemSettings.create({
      key: 'tuition-breakdown',
      currentSchoolYear: '2025-2026',
      title: 'Test Tuition',
      currency: 'PHP',
      tuitionPlans: [],
      breakdown: [],
    });

    await expect(ensureWriteAllowedForSchoolYear(makeRequest('2024-2025'))).resolves.toMatchObject({
      allowed: false,
      response: {
        success: false,
        error: 'Historical school years are read-only. Switch to the current school year to make changes.',
      },
    });
  });
});
