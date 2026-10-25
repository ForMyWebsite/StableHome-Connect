import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
async function demo(page: Page, role = 'tenant') {
  await page.goto('/demo');
  await page
    .getByRole('button', {
      name:
        role === 'tenant'
          ? 'Jordan Rivera'
          : role === 'landlord'
            ? 'Taylor Morgan'
            : role === 'provider'
              ? 'Casey Brooks'
              : 'Demo Administrator',
    })
    .click();
  await page.waitForURL(
    '**/' +
      { tenant: 'dashboard', landlord: 'landlord', provider: 'provider', admin: 'admin' }[role],
  );
  await expect(page.locator('.page-heading h1')).toBeVisible();
}
async function switchTo(page: Page, role: string) {
  await page.getByRole('combobox', { name: 'Switch fictional demo role' }).selectOption(role);
  await page.waitForURL(
    '**/' +
      { tenant: 'dashboard', landlord: 'landlord', provider: 'provider', admin: 'admin' }[role],
  );
}
test('starts with login, protects routes, validates forms, and handles Google configuration errors', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email address').fill('neighbor@example.test');
  await page.getByLabel('Password', { exact: true }).fill('not-a-real-password');
  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
  await page.route('**/api/auth', (route) =>
    route.fulfill({
      status: 503,
      json: { error: 'Google sign-in is unavailable. Enable the Google provider in Supabase.' },
    }),
  );
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Enable the Google provider' }),
  ).toBeVisible();
  const response = await request.post('/api/demo', {
    data: { role: 'admin' },
    headers: { origin: 'https://attacker.example' },
  });
  expect(response.status()).toBe(400);
});
test('assessment saves a nationwide location and keeps local-only programs out of results', async ({
  page,
}) => {
  await demo(page);
  await page.goto('/assessment');
  await page.getByLabel('State or territory').selectOption('CA');
  await page.getByLabel('County, parish, borough, or equivalent').fill('Los Angeles');
  await page.getByLabel('Rental property ZIP code').fill('90012');
  await page.getByLabel('I confirm this is the county').check();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Create my housing plan' }).click();
  await expect(page).toHaveURL(/\/assessment\/results/);
  await expect(page.getByText('Los Angeles, CA', { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Los Angeles, CA', { exact: false })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Legal Aid of Southeastern PA', exact: true }),
  ).toHaveCount(0);
});
test('resource search, saves, and category filters persist', async ({ page }) => {
  await demo(page);
  await page.goto('/resources');
  await page
    .getByPlaceholder('Search organizations or type of help…')
    .fill('Legal Aid of Southeastern');
  const card = page.locator('.resource-card').filter({ hasText: 'Legal Aid of Southeastern PA' });
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Unsave Legal Aid of Southeastern PA' }).click();
  await card
    .getByRole('button', { name: 'Save Legal Aid of Southeastern PA', exact: true })
    .click();
  await page.reload();
  await page.getByRole('button', { name: /Saved resources/ }).click();
  await expect(page.locator('.resource-card')).toHaveCount(1);
  await page.getByRole('combobox', { name: 'Filter category' }).selectOption('Emergency housing');
  await expect(page.getByRole('heading', { name: 'Let’s try another search' })).toBeVisible();
});
test('repayment scenario recalculates exact totals and budget warnings', async ({ page }) => {
  await demo(page);
  await page.goto('/planner');
  await page.getByLabel('Unpaid rent being discussed', { exact: true }).fill('1200.01');
  await page.getByLabel('Proposed initial payment', { exact: true }).fill('200');
  await page.getByRole('slider', { name: 'Remaining installment count' }).fill('3');
  await expect(page.locator('tfoot')).toContainText('$1,200.01');
  await page.getByLabel('Monthly household income', { exact: true }).fill('100');
  await expect(page.getByText('The proposed payments exceed')).toBeVisible();
  await page.getByLabel('Proposed initial payment', { exact: true }).fill('1300');
  await expect(page.getByRole('alert').filter({ hasText: 'Check the balance' })).toBeVisible();
});
test('messages, revisions, review records, and consent persist across fictional actor switches', async ({
  page,
}) => {
  await demo(page);
  const caseId = '00000000-0000-4000-8000-000000000010';
  await page.goto('/mediation/' + caseId);
  await page
    .getByLabel('Your message', { exact: true })
    .fill('Can we discuss these terms together?');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText('Can we discuss these terms together?')).toBeVisible();
  await page.getByLabel('I consent to a verified mediator').check();
  await switchTo(page, 'provider');
  await page.goto('/mediation/' + caseId);
  await expect(page.getByRole('heading', { name: 'This discussion is private' })).toBeVisible();
  await switchTo(page, 'landlord');
  await page.goto('/mediation/' + caseId);
  await page.getByLabel('I consent to a verified mediator').check();
  await page.getByRole('button', { name: 'Review for discussion', exact: true }).click();
  await expect(page.getByText('Taylor Morgan reviewed version 1: discussion')).toBeVisible();
  await page.getByRole('button', { name: 'Record plan active' }).click();
  await expect(page.locator('.conversation-panel .pill')).toHaveText('Plan active');
  await switchTo(page, 'provider');
  await page.goto('/mediation/' + caseId);
  await expect(page.getByText('Can we discuss these terms together?')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Can we discuss these terms together?')).toBeVisible();
});
test('secure invitation flow requires the intended fictional recipient', async ({ page }) => {
  await demo(page);
  await page.goto('/mediation');
  await page.getByRole('button', { name: 'New discussion' }).click();
  await page.getByLabel('Give your discussion a title').fill('A new private discussion');
  await page
    .getByLabel('What would you like to discuss?')
    .fill('I would like to discuss a voluntary repayment schedule.');
  await page.getByLabel('I’m choosing to open').check();
  await page.getByRole('button', { name: 'Create private discussion' }).click();
  await expect(page.getByRole('heading', { name: 'A new private discussion' })).toBeVisible();
  await page.getByText('Invite a participant', { exact: false }).click();
  await page.getByLabel('Participant email').fill('taylor@example.test');
  await page.getByLabel('I choose to invite this person').check();
  await page.getByRole('button', { name: 'Create expiring link' }).click();
  const link = await page.getByLabel('Share this link yourself').inputValue();
  await switchTo(page, 'landlord');
  await page.goto(link);
  await page.getByLabel('I choose to join this private discussion').check();
  await page.getByRole('button', { name: 'Accept invitation' }).click();
  await expect(page.getByRole('heading', { name: 'A new private discussion' })).toBeVisible();
  await expect(page.getByText('Taylor Morgan', { exact: true }).last()).toBeVisible();
});
test('private demo file uploads persist, reject spoofed files, and support explicit sharing', async ({
  page,
}) => {
  await demo(page);
  await page.goto('/documents');
  await page.getByLabel('Choose a file', { exact: true }).setInputFiles({
    name: 'not-a-pdf.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('malicious not a PDF'),
  });
  await page.getByRole('button', { name: 'Upload privately' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'genuine PDF' })).toBeVisible();
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9S0AAAAASUVORK5CYII=',
    'base64',
  );
  await page
    .getByLabel('Choose a file', { exact: true })
    .setInputFiles({ name: 'fictional-receipt.png', mimeType: 'image/png', buffer: png });
  await page.getByRole('button', { name: 'Upload privately' }).click();
  await expect(page.getByText('fictional-receipt.png', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'View fictional-receipt.png', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('img', { name: 'fictional-receipt.png' })).toBeVisible();
  await dialog.getByLabel('Taylor Morgan').check();
  await page.getByRole('button', { name: 'Close document preview' }).click();
  await switchTo(page, 'landlord');
  await page.goto('/documents');
  await expect(page.getByText('fictional-receipt.png', { exact: true })).toBeVisible();
  await expect(page.getByText('Sample rental agreement.pdf', { exact: true })).toHaveCount(0);
});
test('tasks, personal dates, support logs and notification read states work', async ({ page }) => {
  await demo(page);
  await page.goto('/navigator');
  await page.getByRole('button', { name: 'Add my own step' }).click();
  await page.getByLabel('Your next step', { exact: true }).fill('Prepare my own questions');
  await page.getByRole('button', { name: 'Save my step' }).click();
  await page.getByLabel('Prepare my own questions', { exact: true }).check();
  await page.getByRole('button', { name: 'Add a date', exact: true }).click();
  await page.getByLabel('Reminder or appointment title').fill('My personal follow-up');
  await page.getByLabel('Date from your own record').fill('2026-12-01');
  await page.getByRole('button', { name: 'Save personal reminder' }).click();
  await expect(page.getByText('My personal follow-up', { exact: true })).toBeVisible();
  await page.goto('/benefits');
  await page.getByLabel('Date', { exact: true }).fill('2026-10-25');
  await page.getByLabel('Description optional', { exact: false }).fill('Fictional bus fare');
  await page.getByLabel('Estimated value', { exact: false }).fill('12.25');
  await page.getByRole('button', { name: 'Save to my private log' }).click();
  await expect(page.getByRole('cell', { name: '$12.25', exact: true })).toBeVisible();
  await page.goto('/notifications');
  await page.getByRole('button', { name: 'Mark all read' }).click();
  await expect(page.getByRole('button', { name: 'Unread (0)' })).toBeVisible();
});
test('restricts role dashboards and permits fictional resource administration', async ({
  page,
}) => {
  await demo(page);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/dashboard$/);
  await switchTo(page, 'admin');
  await page.goto('/admin/resources/lasp-delaware');
  await page.getByLabel('Organization name', { exact: true }).fill('LASP · Fictional admin edit');
  await page.getByRole('button', { name: 'Save listing' }).click();
  await expect(page).toHaveURL(/\/admin\/resources$/);
  await expect(
    page.getByRole('cell', { name: 'LASP · Fictional admin edit Legal aid' }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText('LASP · Fictional admin edit', { exact: true })).toBeVisible();
});
test('desktop and mobile primary screens are accessible and have no overflow', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/login');
  let scan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(scan.violations).toEqual([]);
  await demo(page);
  scan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(scan.violations).toEqual([]);
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(250);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      `dashboard overflow at ${width}`,
    ).toBe(false);
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({
    path: 'test-results/dashboard-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  for (const route of [
    '/resources',
    '/assessment',
    '/planner',
    '/mediation',
    '/documents',
    '/navigator',
    '/benefits',
    '/settings',
  ]) {
    await page.goto(route);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      route + ' overflows',
    ).toBe(false);
  }
  expect(errors).toEqual([]);
});
test('keyboard navigation reaches login controls with visible focus', async ({ page }) => {
  await page.goto('/login');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.getByRole('button', { name: 'Continue with Google' }).focus();
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeFocused();
  expect(
    await page
      .getByRole('button', { name: 'Continue with Google' })
      .evaluate((el) => getComputedStyle(el).outlineStyle),
  ).not.toBe('none');
});
test('mobile navigation keeps hidden links out of the tab order and restores focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await demo(page);
  await page.getByRole('button', { name: 'Open navigation' }).focus();
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => {
    const r = document.activeElement?.getBoundingClientRect();
    return r ? { x: r.x, width: r.width } : null;
  });
  expect(focused?.x).toBeGreaterThanOrEqual(0);
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(
    page.locator('.sidebar nav').getByRole('link', { name: 'Overview', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
});
test('demo sessions cannot use live-data endpoints', async ({ page }) => {
  await demo(page);
  const result = await page.request.get('/api/workspace');
  expect(result.status()).toBe(403);
});
