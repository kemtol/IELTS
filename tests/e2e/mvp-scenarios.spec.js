const { test, expect } = require('@playwright/test');

const user = {
  fullName: 'Test Onboarding E2E',
  email: `test.onboarding.e2e.${Date.now()}@example.com`,
  password: 'Test@12345',
};

function buildEssay(seed) {
  const sentence =
    `${seed} technology has transformed education by improving access to resources, supporting collaboration, and allowing students to learn at a flexible pace while still requiring strong discipline and critical thinking.`;
  return Array.from({ length: 11 }, () => sentence).join(' ');
}

function buildTranscript(seed) {
  return `${seed} I once helped my classmate prepare for an interview by practicing answers every evening, correcting unclear pronunciation, and encouraging better examples so she could explain her ideas with more confidence and better structure.`;
}

async function loginExistingUser(page) {
  const maxAttempts = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    await page.goto('/login.html');
    await page.fill('#loginEmailInput', user.email);
    await page.fill('#loginPasswordInput', user.password);
    await page.click('#loginSubmitBtn');

    try {
      await expect(page).toHaveURL(/\/dashboard(?:\.html)?$/, { timeout: 30000 });
      await expect(page.locator('#dashPracticeBtn')).toBeVisible();
      return;
    } catch (error) {
      lastError = error;
      const statusText = (await page.locator('#loginStatus').textContent().catch(() => '')) || '';
      const isTransientHang = /signing in/i.test(statusText);

      if (!isTransientHang || attempt === maxAttempts) {
        throw lastError;
      }

      await page.waitForTimeout(1200 * attempt);
    }
  }
}

async function openProtectedPage(page, path, expectedUrlPattern) {
  await page.goto(path);

  if (/\/login(?:\.html)?$/i.test(page.url())) {
    await loginExistingUser(page);
    await page.goto(path);
  }

  await expect(page).toHaveURL(expectedUrlPattern);
}

async function completeWritingFromPractice(page, seed) {
  await page.getByRole('button', { name: /Open writing|Review writing/i }).click();
  await expect(page).toHaveURL(/\/writing(?:\.html)?$/);
  await page.fill('#writingResponseInput', buildEssay(seed));
  await page.click('#writingSubmitBtn');
  await expect(page.locator('#writingStatus')).toContainText('feedback received');
  await expect(page.locator('#writingFeedbackPanel')).toContainText('Overall band score');
  await page.getByRole('button', { name: /Back to daily practice/i }).click();
  await expect(page).toHaveURL(/\/practice(?:\.html)?$/);
}

async function completeSpeakingFromPractice(page, seed) {
  await page.getByRole('button', { name: /Open speaking|Review speaking/i }).click();
  await expect(page).toHaveURL(/\/speaking(?:\.html)?$/);

  await page.click('#recBtn');
  await page.waitForTimeout(1200);
  await page.click('#recBtn');
  await expect(page.locator('#audioPreview')).toBeVisible();

  await page.fill('#speakingTranscriptInput', buildTranscript(seed));
  await page.click('#speakingSubmitBtn');
  await expect(page.locator('#speakingStatus')).toContainText('feedback received');
  await expect(page.locator('#speakingFeedbackPanel')).toContainText('Overall band score');
  await page.getByRole('button', { name: /Back to daily practice/i }).click();
  await expect(page).toHaveURL(/\/practice(?:\.html)?$/);
}

async function expectDashboardProfileSummary(page) {
  const status = page.locator('#dashboardStatus');
  await expect(status).toContainText('onboarding completed');
  await expect(status).toContainText('target 7.0');
  await expect(status).toContainText('60 mins/day');
  await expect(status).toContainText('focus Writing, Speaking');
}

test.describe.serial('IELTS MVP Manual Scenarios (Playwright Chromium)', () => {
  test('ST-ONB-001 Onboarding user baru sampai relogin', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('#onb-step1')).toBeVisible();

    await page.fill('#onbNameInput', user.fullName);
    await page.fill('#onbEmailInput', user.email);
    await page.fill('#onbPasswordInput', user.password);
    await page.click('#onbRegisterBtn');

    await expect(page.locator('#onb-step2')).toBeVisible();
    await expect(page.locator('#onbVerifyEmailLabel')).toContainText(user.email);
    await page.fill('#onbOtpInput', '482901');
    await page.click('#onbVerifyBtn');

    await expect(page.locator('#onb-step3')).toBeVisible({ timeout: 60000 });
    await page.click('#onbCompleteBtn');

    await expect(page.locator('#onb-step4')).toBeVisible();
    await expect(page.locator('#onbFinalText')).toContainText('Target 7');
    await page.click('#onbToDashboardBtn');

    await expect(page).toHaveURL(/\/dashboard(?:\.html)?$/);
    await expectDashboardProfileSummary(page);

    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/login(?:\.html)?$/);
    await loginExistingUser(page);
    await expectDashboardProfileSummary(page);
  });

  test('ST-AUTH-001 Login existing user + refresh session', async ({ page }) => {
    await loginExistingUser(page);
    await expectDashboardProfileSummary(page);

    await page.reload();
    await expect(page).toHaveURL(/\/dashboard(?:\.html)?$/);
    await expectDashboardProfileSummary(page);
  });

  test('ST-PLT-001 Placement test sampai status completed', async ({ page }) => {
    await loginExistingUser(page);
    await openProtectedPage(page, '/placement.html', /\/placement(?:\.html)?$/);
    await expect(page.locator('#placementStatusText')).toContainText('Question bank ready', { timeout: 60000 });

    await page.click('#placementStartBtn');
    await expect(page.locator('#placementQuestionMeta')).toContainText('Question 1');

    for (let idx = 0; idx < 10; idx += 1) {
      await expect(page.locator('#placementOptionList .option-item').first()).toBeVisible();
      await page.locator('#placementOptionList .option-item').first().click();
      if (idx < 9) {
        await page.click('#placementNextBtn');
      }
    }

    page.once('dialog', (dialog) => dialog.accept());
    await page.click('#placementSubmitBtn');

    await expect(page.locator('#placementResultCard')).toBeVisible();
    await expect(page.locator('#placementResultScore')).toContainText('Band');
    await page.locator('#placementResultCard button').click();
    await expect(page).toHaveURL(/\/dashboard(?:\.html)?$/);
    await expect(page.locator('#dashboardStatus')).toContainText('placement completed');

    await page.reload();
    await expect(page.locator('#dashboardStatus')).toContainText('placement completed');
  });

  test('ST-PLAN-001 Generate study plan dan persistence', async ({ page }) => {
    await loginExistingUser(page);
    await openProtectedPage(page, '/studyplan.html', /\/studyplan(?:\.html)?$/);

    await page.click('#studyPlanGenerateBtn');
    await expect(page.locator('#studyPlanStatus')).toContainText('generated and saved');
    await expect(page.locator('#studyPlanBaselineVal')).not.toHaveText('-');
    await expect(page.locator('#studyPlanTargetVal')).toContainText('7.0');
    await expect(page.locator('#studyPlanPriorityList')).toContainText('Writing');
    await expect(page.locator('#studyPlanPriorityList')).toContainText('Speaking');
    await expect(page.locator('#studyPlanWeekList .plan-row')).toHaveCount(7);

    await page.reload();
    await page.click('button:has-text("Refresh")');
    await expect(page.locator('#studyPlanStatus')).toContainText('loaded');
    await expect(page.locator('#studyPlanTitle')).toContainText('Week 1');
  });

  test('ST-PRC-001 Daily practice: selesaikan 3 task dan persist setelah refresh', async ({ page }) => {
    await loginExistingUser(page);
    await openProtectedPage(page, '/practice.html', /\/practice(?:\.html)?$/);
    await expect(page.locator('#practiceTaskList .task-item')).toHaveCount(3);

    await page.getByRole('button', { name: /Mark complete/i }).click();
    await expect(page.locator('#practiceTaskList .task-item').filter({ hasText: 'Reading: True / False / Not Given' })).toContainText('Completed');

    await completeWritingFromPractice(page, 'Scenario ST-PRC-001');
    await completeSpeakingFromPractice(page, 'Scenario ST-PRC-001');

    await expect(page.locator('#practiceProgressText')).toContainText('3 / 3');
    await page.getByRole('button', { name: /Refresh tasks/i }).click();
    await expect(page.locator('#practiceProgressText')).toContainText('3 / 3');
  });

  test('ST-WRT-001 Writing submission & feedback', async ({ page }) => {
    await loginExistingUser(page);
    await openProtectedPage(page, '/practice.html', /\/practice(?:\.html)?$/);

    await completeWritingFromPractice(page, 'Scenario ST-WRT-001');
    await expect(page.locator('#practiceTaskList .task-item').filter({ hasText: 'Writing Task 2' })).toContainText('Completed');
  });

  test('ST-SPK-001 Speaking submission & feedback', async ({ page }) => {
    await loginExistingUser(page);
    await openProtectedPage(page, '/practice.html', /\/practice(?:\.html)?$/);

    await completeSpeakingFromPractice(page, 'Scenario ST-SPK-001');
    await expect(page.locator('#practiceTaskList .task-item').filter({ hasText: 'Speaking Part 3' })).toContainText('Completed');
  });

  test('ST-PRG-001 Progress dashboard konsisten setelah relogin', async ({ page }) => {
    await loginExistingUser(page);

    await expect(page.locator('#dashCurrentBand')).not.toHaveText('-');
    await expect(page.locator('#dashTasksCompleted')).not.toHaveText('-');
    await expect(page.locator('#dashLatestWriting')).not.toHaveText('-');
    await expect(page.locator('#dashLatestSpeaking')).not.toHaveText('-');
    await expect(page.locator('#dashboardTrendBadge')).toContainText('Trend:');

    const before = {
      currentBand: (await page.locator('#dashCurrentBand').innerText()).trim(),
      tasksCompleted: (await page.locator('#dashTasksCompleted').innerText()).trim(),
      latestWriting: (await page.locator('#dashLatestWriting').innerText()).trim(),
      latestSpeaking: (await page.locator('#dashLatestSpeaking').innerText()).trim(),
    };

    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/login(?:\.html)?$/);
    await loginExistingUser(page);

    await expect(page.locator('#dashCurrentBand')).toHaveText(before.currentBand);
    await expect(page.locator('#dashTasksCompleted')).toHaveText(before.tasksCompleted);
    await expect(page.locator('#dashLatestWriting')).toHaveText(before.latestWriting);
    await expect(page.locator('#dashLatestSpeaking')).toHaveText(before.latestSpeaking);
  });
});
