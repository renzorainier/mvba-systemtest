import { expect, test } from '@playwright/test';

const cookieUrl = 'http://127.0.0.1:3000';

async function signInAsAdmin(page) {
  await page.context().addCookies([
    {
      name: 'auth_token',
      value: JSON.stringify({ role: 'Admin', name: 'Admin' }),
      url: cookieUrl,
    },
  ]);
}

async function seedEnrollmentFixture(request, suffix) {
  await request.get('/api/system-settings');

  const curriculumResponse = await request.post('/api/curriculums', {
    data: {
      curriculum_id: `CUR-E2E-${suffix}`,
      curriculum_name: `E2E Curriculum ${suffix}`,
      effective_start_date: '2025-06-01',
      effective_end_date: '2026-03-31',
      subjects: [{ subject_name: 'Reading' }],
    },
  });
  expect(curriculumResponse.ok()).toBeTruthy();
  const curriculumBody = await curriculumResponse.json();

  const gradeLevelResponse = await request.post('/api/grade-level-curriculums', {
    data: {
      gl_curriculum_id: `GLC-E2E-${suffix}`,
      curriculum_id: curriculumBody.data._id,
      grade_level: 'Grade 1',
      is_default: true,
    },
  });
  expect(gradeLevelResponse.ok()).toBeTruthy();
  const gradeLevelBody = await gradeLevelResponse.json();

  const studentResponse = await request.post('/api/students', {
    data: {
      firstName: `Enroll${suffix}`,
      lastName: 'Student',
      middleName: '',
      gender: 'Female',
      gradeLevel: 'Grade 1',
      dateOfBirth: '2018-01-01',
      address: 'Test Address',
      admissionDate: '2025-06-01',
      learnersReferenceNumber: `79${String(suffix).padStart(10, '0').slice(-10)}`,
      parentGuardianName: 'Test Guardian',
      parentGuardianRelationship: 'Mother',
      parentGuardianContactNumber: '09170000000',
    },
  });
  expect(studentResponse.ok()).toBeTruthy();
  const studentBody = await studentResponse.json();

  const sectionOneResponse = await request.post('/api/sections', {
    data: {
      sectionName: `Section ${suffix} A`,
      gradeLevel: 'Grade 1',
      glCurriculumId: gradeLevelBody.data._id,
      roomNumber: '101',
      sectionId: `SEC-${suffix}-A`,
    },
  });
  expect(sectionOneResponse.ok()).toBeTruthy();
  const sectionOneBody = await sectionOneResponse.json();

  const sectionTwoResponse = await request.post('/api/sections', {
    data: {
      sectionName: `Section ${suffix} B`,
      gradeLevel: 'Grade 1',
      glCurriculumId: gradeLevelBody.data._id,
      roomNumber: '102',
      sectionId: `SEC-${suffix}-B`,
    },
  });
  expect(sectionTwoResponse.ok()).toBeTruthy();
  const sectionTwoBody = await sectionTwoResponse.json();

  return {
    student: studentBody.data,
    sectionOne: sectionOneBody.data,
    sectionTwo: sectionTwoBody.data,
  };
}

test.describe('students and enrollments', () => {
  test('creates a student and updates the profile address', async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/portal/students');

    const suffix = Date.now().toString().slice(-6);
    const firstName = `Student${suffix}`;
    const lastName = 'E2E';
    const updatedAddress = `Updated Address ${suffix}`;

    await page.getByRole('button', { name: 'Add New Student' }).click();

    const createDialog = page.getByRole('dialog', { name: 'Add New Student' });
    const createInputs = createDialog.locator('input:not([type="file"])');
    await expect(createInputs.nth(0)).toBeVisible();
    await createInputs.nth(0).fill(firstName);
    await createInputs.nth(1).fill(lastName);
    await createDialog.locator('select').nth(0).selectOption('Female');
    await createDialog.locator('select').nth(1).selectOption('Kinder 1');
    await createInputs.nth(3).fill('2018-01-01');
    await createInputs.nth(5).fill('2025-06-01');
    await createDialog.locator('textarea').fill('Original Address');
    await createDialog.getByRole('button', { name: 'Create Student' }).click();

    await expect(page.getByPlaceholder('Search students by name or ID...')).toBeVisible();
    await page.getByPlaceholder('Search students by name or ID...').fill(firstName);

    const studentRow = page.locator('tbody tr').filter({ hasText: firstName }).first();
    await expect(studentRow).toBeVisible();

    await studentRow.locator('button').first().click();

    const profileDialog = page.getByRole('dialog', { name: 'Student Profile' });
    // wait for the address input to appear (dialog root may be hidden during transition)
    await expect(profileDialog.locator('input[name="address"]')).toBeVisible();

    await profileDialog.getByRole('button', { name: 'Edit Profile' }).click();
    await profileDialog.locator('input[name="address"]').fill(updatedAddress);
    await profileDialog.getByRole('button', { name: 'Save Changes' }).click();
    await expect(profileDialog.getByText('Student profile updated successfully')).toBeVisible();

    await profileDialog.getByRole('button', { name: 'Close' }).click();

    // Re-open and verify updated address persisted
    await studentRow.locator('button').first().click();
    await expect(profileDialog.locator('input[name="address"]')).toBeVisible();
    await expect(profileDialog.locator('input[name="address"]')).toHaveValue(updatedAddress);
  });

  test('creates an enrollment and updates status and section inline', async ({ page, request }) => {
    const suffix = Date.now().toString().slice(-6);
    const { student, sectionOne, sectionTwo } = await seedEnrollmentFixture(request, suffix);

    await signInAsAdmin(page);
    await page.goto('/portal/enrollments');

    await page.getByRole('button', { name: 'Add New Enrollment' }).click();

    const enrollmentDialog = page.getByRole('dialog').last();
    await expect(enrollmentDialog.getByText('Add New Enrollment')).toBeVisible();

    await enrollmentDialog.getByPlaceholder('Search student by name or LRN').fill(student.firstName);
    await enrollmentDialog.getByRole('button', { name: new RegExp(`${student.firstName} ${student.lastName}`) }).first().click();
    await enrollmentDialog.locator('select').nth(0).selectOption(sectionOne.sectionId);
    await enrollmentDialog.locator('input[type="date"]').fill('2025-06-15');
    await enrollmentDialog.locator('select').nth(1).selectOption('Interview');
    await enrollmentDialog.getByRole('button', { name: 'Add Enrollment' }).click();

    const enrollmentRow = page.locator('tbody tr').filter({ hasText: student.firstName }).first();
    await expect(enrollmentRow).toBeVisible();
    await expect(enrollmentRow).toContainText(sectionOne.sectionName);

    const rowSelects = enrollmentRow.locator('select');
    await rowSelects.nth(1).selectOption('Enrolled');
    await expect(rowSelects.nth(1)).toHaveValue('Enrolled');

    await rowSelects.nth(0).selectOption(sectionTwo.sectionId);
    await expect(rowSelects.nth(0)).toHaveValue(sectionTwo.sectionId);
    await expect(enrollmentRow).toContainText(sectionTwo.sectionName);
  });
});
