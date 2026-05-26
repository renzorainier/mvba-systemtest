import dbConnect from '@/lib/mongodb';
import SystemSettings from '@/models/SystemSettings';

export const SCHOOL_YEAR_COOKIE = 'selected_school_year';
export const SCHOOL_YEAR_ORDER = ['Kinder 1', 'Kinder 2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];

export const normalizeSchoolYear = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4})\s*-\s*(\d{4})$/);

  if (!match) {
    return null;
  }

  return `${match[1]}-${match[2]}`;
};

export const isValidSchoolYear = (value) => {
  const normalized = normalizeSchoolYear(value);

  if (!normalized) {
    return false;
  }

  const [startYearText, endYearText] = normalized.split('-');
  const startYear = Number(startYearText);
  const endYear = Number(endYearText);

  return Number.isInteger(startYear) && Number.isInteger(endYear) && endYear === startYear + 1;
};

export const getNextSchoolYear = (schoolYear) => {
  const normalized = normalizeSchoolYear(schoolYear);

  if (!normalized) {
    return '';
  }

  const [startYearText] = normalized.split('-');
  const startYear = Number(startYearText);

  if (!Number.isInteger(startYear)) {
    return '';
  }

  return `${startYear + 1}-${startYear + 2}`;
};

export const getNextGradeLevel = (gradeLevel) => {
  const index = SCHOOL_YEAR_ORDER.indexOf(String(gradeLevel || '').trim());

  if (index < 0 || index >= SCHOOL_YEAR_ORDER.length - 1) {
    return null;
  }

  return SCHOOL_YEAR_ORDER[index + 1];
};

const readSelectedSchoolYearFromRequest = (request) => {
  const cookieValue = request?.cookies?.get?.(SCHOOL_YEAR_COOKIE)?.value;
  return normalizeSchoolYear(cookieValue) || '';
};

export const getSchoolYearContext = async (request) => {
  await dbConnect();

  const settings = await SystemSettings.findOne({ key: 'tuition-breakdown' }).lean();
  const currentSchoolYear = normalizeSchoolYear(settings?.currentSchoolYear) || '2025-2026';
  const selectedSchoolYear = readSelectedSchoolYearFromRequest(request) || currentSchoolYear;

  return {
    currentSchoolYear,
    selectedSchoolYear,
    isHistorical: selectedSchoolYear !== currentSchoolYear,
  };
};

export const ensureWriteAllowedForSchoolYear = async (request) => {
  const context = await getSchoolYearContext(request);

  if (context.isHistorical) {
    return {
      allowed: false,
      response: {
        success: false,
        error: 'Historical school years are read-only. Switch to the current school year to make changes.',
      },
      context,
    };
  }

  return {
    allowed: true,
    context,
  };
};

export const buildSchoolYearFilter = (request, fieldName = 'schoolYear') => {
  const selectedSchoolYear = readSelectedSchoolYearFromRequest(request);

  if (!selectedSchoolYear) {
    return {};
  }

  return { [fieldName]: selectedSchoolYear };
};
