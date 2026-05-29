import { describe, expect, it } from 'vitest';
import {
  calculateTotalFromTuitionPlans,
  createDefaultTuitionPlans,
  getTuitionAmountForGrade,
  getTuitionPlanForGrade,
  normalizeTuitionPlans,
} from '@/lib/tuition-settings';

describe('tuition settings', () => {
  it('creates independent default plan copies', () => {
    const first = createDefaultTuitionPlans();
    const second = createDefaultTuitionPlans();

    first[0].lineItems[0].amount = 999;

    expect(second[0].lineItems[0].amount).toBe(2000);
  });

  it('normalizes plan fields and parses comma-separated applicable grades', () => {
    const plans = normalizeTuitionPlans([
      {
        gradeLabel: ' Grade 1 Block ',
        applicableGrades: 'Grade 1, Grade 2',
        lineItems: [{ label: ' Tuition ', amount: '1200' }, { label: '', amount: 50 }],
        customFields: [{ label: ' Note ', value: ' Paid monthly ' }],
      },
      { gradeLabel: '   ' },
    ]);

    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({
      gradeLabel: 'Grade 1 Block',
      applicableGrades: ['Grade 1', 'Grade 2'],
      lineItems: [{ label: 'Tuition', amount: 1200 }],
      customFields: [{ label: 'Note', value: 'Paid monthly' }],
    });
  });

  it('calculates totals from direct totals or line items', () => {
    const total = calculateTotalFromTuitionPlans([
      { totalBaseCost: 1000, lineItems: [{ amount: 500 }] },
      { totalBaseCost: 0, lineItems: [{ amount: 300 }, { amount: '200' }] },
    ]);

    expect(total).toBe(1500);
  });

  it('finds tuition plan and amount for a grade level', () => {
    const plans = createDefaultTuitionPlans();

    expect(getTuitionPlanForGrade(plans, 'Grade 4')?.gradeLabel).toBe('Grade 1 - Grade 6');
    expect(getTuitionAmountForGrade(plans, 'Kinder 2')).toBe(29000);
    expect(getTuitionAmountForGrade(plans, 'Unknown', 12345)).toBe(12345);
  });
});
