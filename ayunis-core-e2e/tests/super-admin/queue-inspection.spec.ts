import {
  confirmEmail,
  login,
  registerOrg,
  submitLoginAttempt,
} from '../../src/clients/api/auth.client';
import { config } from '../../src/config';
import { test, expect } from '../../src/fixtures/test';

const queueDashboardUrl = `${config.apiURL}/api/internal/queues/`;

test.use({ storageState: { cookies: [], origins: [] } });

test('queue inspection requires authentication and is available to a super admin', async ({
  browser,
  mail,
  publicApi,
}) => {
  const publicContext = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  const superAdminContext = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  const orgAdminContext = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  const publicPage = await publicContext.newPage();
  const orgAdminPage = await orgAdminContext.newPage();
  const superAdminPage = await superAdminContext.newPage();

  try {
    const unauthorizedResponse = await publicPage.goto(queueDashboardUrl);
    expect(unauthorizedResponse?.status()).toBe(401);

    const uniqueKey = Date.now();
    const orgAdminEmail = `queue-inspection-${uniqueKey}@e2e.local`;
    const orgAdminPassword = 'E2e-Password-1';
    await registerOrg(publicApi, {
      email: orgAdminEmail,
      password: orgAdminPassword,
      orgName: `Queue Inspection ${uniqueKey}`,
      userName: 'Queue Inspection Org Admin',
    });
    const confirmationToken = await mail.extractLinkToken(
      orgAdminEmail,
      '/confirm-email',
    );
    await confirmEmail(publicApi, confirmationToken);
    await login(publicApi, orgAdminEmail, orgAdminPassword);
    const orgAdminStorageState = await publicApi.storageState();
    await orgAdminContext.addCookies(orgAdminStorageState.cookies);

    const forbiddenResponse = await orgAdminPage.goto(queueDashboardUrl);
    expect(forbiddenResponse?.status()).toBe(403);

    const loginResponse = await submitLoginAttempt(
      superAdminContext.request,
      'admin@demo.local',
      'admin',
    );
    expect(loginResponse.ok()).toBe(true);

    await superAdminPage.goto(`${config.baseURL}/super-admin-settings/orgs`);
    const dashboardPagePromise = superAdminContext.waitForEvent('page');
    await superAdminPage.getByTestId('super-admin-queue-inspection').click();
    const dashboardPage = await dashboardPagePromise;
    await dashboardPage.waitForLoadState('domcontentloaded');

    expect(dashboardPage.url()).toBe(queueDashboardUrl);
    await expect(dashboardPage).toHaveTitle('Ayunis Core Queues');
    await expect(
      dashboardPage.getByRole('link', { name: 'document-processing' }),
    ).toBeVisible();
    await expect(
      dashboardPage.getByRole('link', { name: 'data-source-processing' }),
    ).toBeVisible();
    await expect(
      dashboardPage.getByRole('link', { name: 'url-crawl' }),
    ).toBeVisible();
  } finally {
    await Promise.all([
      publicContext.close(),
      orgAdminContext.close(),
      superAdminContext.close(),
    ]);
  }
});
