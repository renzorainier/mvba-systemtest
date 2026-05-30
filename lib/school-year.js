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

// A draft is only valid if it is a real school year that differs from the active year.
// A stored draft equal to the current year (a corrupt/legacy state) is treated as "no draft"
// so the active portal never accidentally falls into draft mode.
export const resolveDraftSchoolYear = (rawDraft, currentSchoolYear) => {
  const normalized = normalizeSchoolYear(rawDraft);

  if (!normalized || normalized === normalizeSchoolYear(currentSchoolYear)) {
    return null;
  }

  return normalized;
};

export const getSchoolYearContext = async (request) => {
  await dbConnect();

  const settings = await SystemSettings.findOne({ key: 'tuition-breakdown' }).lean();
  const currentSchoolYear = normalizeSchoolYear(settings?.currentSchoolYear) || '2025-2026';
  const draftSchoolYear = resolveDraftSchoolYear(settings?.draftSchoolYear, currentSchoolYear);
  const selectedSchoolYear = readSelectedSchoolYearFromRequest(request) || currentSchoolYear;
  const isDraft = Boolean(draftSchoolYear) && selectedSchoolYear === draftSchoolYear;

  return {
    currentSchoolYear,
    draftSchoolYear,
    selectedSchoolYear,
    isDraft,
    // Historical (read-only) means neither the active year nor the editable draft year.
    isHistorical: selectedSchoolYear !== currentSchoolYear && !isDraft,
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

// Filter for live collections that historically had no schoolYear field
// (Student, Financial, Schedule, ClassAssignment). For the active year we also
// match legacy rows that were created before per-year tagging existed; for the
// draft year (or any other selected year) we match strictly by tag so its data
// stays isolated from the active year. Pass the context from getSchoolYearContext.
export const buildLiveYearFilter = (context, fieldName = 'schoolYear') => {
  const selectedSchoolYear = context?.selectedSchoolYear || '';
  const currentSchoolYear = context?.currentSchoolYear || '';

  if (!selectedSchoolYear || selectedSchoolYear === currentSchoolYear) {
    return {
      $or: [
        { [fieldName]: currentSchoolYear },
        { [fieldName]: { $exists: false } },
        { [fieldName]: null },
      ],
    };
  }

  return { [fieldName]: selectedSchoolYear };
};

// The school year to stamp onto newly created live rows.
export const getStampYear = (context) =>
  context?.selectedSchoolYear || context?.currentSchoolYear || '';
