const cloneLineItem = (item = {}) => ({
  label: String(item.label || '').trim(),
  amount: Number(item.amount || 0),
});

const cloneCustomField = (item = {}) => ({
  label: String(item.label || '').trim(),
  value: String(item.value || '').trim(),
});

const parseApplicableGrades = (value, fallbackGradeLabel = '') => {
  if (Array.isArray(value)) {
    return value.map((grade) => String(grade || '').trim()).filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    return value
      .split(',')
      .map((grade) => grade.trim())
      .filter(Boolean);
  }

  return fallbackGradeLabel ? [fallbackGradeLabel] : [];
};

export const DEFAULT_TUITION_PLANS = [
  {
    gradeLabel: 'Kinder 1',
    applicableGrades: ['Kinder 1'],
    totalBaseCost: 26000,
    lineItems: [
      { label: 'Registration fee', amount: 2000 },
      { label: 'Book fee', amount: 8000 },
      { label: 'Tuition fees', amount: 16000 },
    ],
    amountDueBeforeSchool: 9000,
    remainingBalanceDue: 17000,
    monthlyPaymentCount: 9,
    monthlyPaymentAmount: 1889,
    monthlyPaymentMonths: 'July until March',
    customFields: [],
    notes: 'Amount due before the first day of school: 9,000',
  },
  {
    gradeLabel: 'Kinder 2',
    applicableGrades: ['Kinder 2'],
    totalBaseCost: 29000,
    lineItems: [
      { label: 'Registration fee', amount: 2000 },
      { label: 'Book fee', amount: 10000 },
      { label: 'Tuition fees', amount: 17000 },
    ],
    amountDueBeforeSchool: 10000,
    remainingBalanceDue: 19000,
    monthlyPaymentCount: 9,
    monthlyPaymentAmount: 2112,
    monthlyPaymentMonths: 'July until March',
    customFields: [],
    notes: 'Amount due before the first day of school: 10,000',
  },
  {
    gradeLabel: 'Grade 1 - Grade 6',
    applicableGrades: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'],
    totalBaseCost: 36000,
    lineItems: [
      { label: 'Registration fee', amount: 2000 },
      { label: 'Book fee', amount: 16000 },
      { label: 'Tuition fee', amount: 18000 },
    ],
    amountDueBeforeSchool: 12000,
    remainingBalanceDue: 24000,
    monthlyPaymentCount: 9,
    monthlyPaymentAmount: 2667,
    monthlyPaymentMonths: 'July until March',
    customFields: [],
    notes: 'Amount due before the first day of school: 12,000',
  },
];

export const createDefaultTuitionPlans = () =>
  DEFAULT_TUITION_PLANS.map((plan) => ({
    ...plan,
    applicableGrades: [...plan.applicableGrades],
    lineItems: plan.lineItems.map(cloneLineItem),
    customFields: plan.customFields.map(cloneCustomField),
  }));

export const normalizeTuitionPlans = (plans = []) => {
  return plans
    .map((plan) => {
      const gradeLabel = String(plan?.gradeLabel || '').trim();
      const lineItems = Array.isArray(plan?.lineItems)
        ? plan.lineItems.map(cloneLineItem).filter((item) => item.label.length > 0)
        : [];
      const customFields = Array.isArray(plan?.customFields)
        ? plan.customFields.map(cloneCustomField).filter((item) => item.label.length > 0 || item.value.length > 0)
        : [];
      const applicableGrades = parseApplicableGrades(plan?.applicableGrades, gradeLabel);

      return {
        gradeLabel,
        applicableGrades,
        totalBaseCost: Number(plan?.totalBaseCost || 0),
        lineItems,
        amountDueBeforeSchool: Number(plan?.amountDueBeforeSchool || 0),
        remainingBalanceDue: Number(plan?.remainingBalanceDue || 0),
        monthlyPaymentCount: Number(plan?.monthlyPaymentCount || 0),
        monthlyPaymentAmount: Number(plan?.monthlyPaymentAmount || 0),
        monthlyPaymentMonths: String(plan?.monthlyPaymentMonths || '').trim(),
        customFields,
        notes: String(plan?.notes || '').trim(),
      };
    })
    .filter((plan) => plan.gradeLabel.length > 0);
};

export const calculateTotalFromTuitionPlans = (plans = []) => {
  return plans.reduce((total, plan) => {
    const numericTotal = Number(plan?.totalBaseCost || 0);

    if (numericTotal > 0) {
      return total + numericTotal;
    }

    const derivedTotal = Array.isArray(plan?.lineItems)
      ? plan.lineItems.reduce((sum, item) => sum + Number(item?.amount || 0), 0)
      : 0;

    return total + derivedTotal;
  }, 0);
};

export const getTuitionPlanForGrade = (plans = [], gradeLevel = '') => {
  const normalizedGrade = String(gradeLevel || '').trim();
  const normalizedPlans = normalizeTuitionPlans(plans);

  return (
    normalizedPlans.find((plan) => plan.applicableGrades.includes(normalizedGrade)) ||
    normalizedPlans.find((plan) => plan.gradeLabel === normalizedGrade) ||
    null
  );
};

export const getTuitionAmountForGrade = (plans = [], gradeLevel = '', fallbackAmount = 0) => {
  const plan = getTuitionPlanForGrade(plans, gradeLevel);

  if (!plan) {
    return Number(fallbackAmount || 0);
  }

  const directAmount = Number(plan.totalBaseCost || 0);
  if (directAmount > 0) {
    return directAmount;
  }

  return Array.isArray(plan.lineItems)
    ? plan.lineItems.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    : Number(fallbackAmount || 0);
};