import {
  getOrganizationCreditUsage,
  getTeamCreditLimit,
  getUserCreditLimit,
} from '../../src/clients/api/credit-limits.client';
import {
  createEmptyThread,
  sendThreadMessage,
} from '../../src/clients/api/threads.client';
import { createCreditLimitsFixture } from '../../src/factories/credit-limits.factory';
import { sendMessage } from '../../src/flows/chat.flow';
import {
  openCreditLimitDialog,
  removeCreditLimit,
  saveCreditLimit,
} from '../../src/flows/credit-limits.flow';
import { expect, test } from '../../src/fixtures/test';

test('credit limits overview searches teams and users and preserves context after modal edits', async ({
  page,
  api,
  publicApi,
  mail,
}) => {
  test.setTimeout(90_000);
  const fixture = await createCreditLimitsFixture(
    api,
    publicApi,
    mail,
    `navigation-${Date.now()}`,
  );
  try {
    for (const target of [
      {
        tab: 'teams',
        kind: 'team',
        id: fixture.team.id,
        search: fixture.team.name,
        read: () => getTeamCreditLimit(api, fixture.team.id),
      },
      {
        tab: 'users',
        kind: 'user',
        id: fixture.member.id,
        search: fixture.member.email,
        read: () => getUserCreditLimit(api, fixture.member.id),
      },
    ] as const) {
      await page.goto('/admin-settings/credit-limits');
      await page.getByTestId(`credit-limits-${target.tab}-tab`).click();
      const row = page.getByTestId(`credit-limits-${target.kind}-${target.id}`);
      await expect(row).toBeVisible();
      const historyLength = await page.evaluate(() => window.history.length);
      await page
        .getByTestId('credit-limits-search')
        .fill(`absent-${fixture.team.id}`);
      await expect(row).toHaveCount(0);
      await page.getByTestId('credit-limits-search').fill(target.search);
      await expect(page).toHaveURL(
        (url) => url.searchParams.get('search') === target.search,
      );
      expect(await page.evaluate(() => window.history.length)).toBe(historyLength);
      const overviewUrl = page.url();
      await row.click();
      await expect(page.getByTestId('credit-limit-dialog')).toBeVisible();
      await expect(page).toHaveURL(overviewUrl);
      await expect(page.getByTestId('credit-limit-remove')).toHaveCount(0);
      await page.getByTestId('credit-limit-input').fill('25');
      await page.getByTestId('credit-limit-cancel').click();
      await expect(page.getByTestId('credit-limit-dialog')).toHaveCount(0);
      expect(await target.read()).toBeNull();

      await row.click();
      await page.getByTestId('credit-limit-input').fill('0');
      expect(await target.read()).toBeNull();
      await saveCreditLimit(page, 0);
      await expect.poll(target.read).toBe(0);
      await expect(page).toHaveURL(overviewUrl);
      await page.reload();
      await row.click();
      await expect(page.getByTestId('credit-limit-input')).toHaveValue('0');
      await expect(page.getByTestId('credit-limit-remove')).toBeVisible();
      await page.getByTestId('credit-limit-input').fill('50');
      await page.getByTestId('credit-limit-cancel').click();
      await expect(page.getByTestId('credit-limit-dialog')).toHaveCount(0);
      expect(await target.read()).toBe(0);

      await row.click();
      await expect(page.getByTestId('credit-limit-input')).toHaveValue('0');
      await removeCreditLimit(page);
      await expect.poll(target.read).toBeNull();
      await expect(page).toHaveURL(overviewUrl);
      await expect(
        page.getByTestId(`credit-limits-${target.tab}-tab`),
      ).toHaveAttribute('data-state', 'active');
      await expect(page.getByTestId('credit-limits-search')).toHaveValue(
        target.search,
      );
      await row.click();
      await expect(page.getByTestId('credit-limit-remove')).toHaveCount(0);
      await page.getByTestId('credit-limit-cancel').click();
      await page.getByTestId('credit-limits-search').fill('');
      await expect(page).toHaveURL((url) => !url.searchParams.has('search'));
      expect(await page.evaluate(() => window.history.length)).toBe(historyLength);
    }
  } finally {
    await fixture.cleanup();
  }
});

test('team credit ceiling blocks a member with positive or no personal limit until removed', async ({
  page,
  api,
  publicApi,
  mail,
  browser,
  org,
}) => {
  test.setTimeout(90_000);
  const fixture = await createCreditLimitsFixture(
    api,
    publicApi,
    mail,
    `ceiling-${Date.now()}`,
  );
  const memberContext = await browser.newContext({
    storageState: fixture.member.storageState,
  });
  const memberPage = await memberContext.newPage();
  try {
    const usageBefore = await getOrganizationCreditUsage(api);
    expect(usageBefore.monthlyCredits).toBe(10000);
    const thread = await createEmptyThread(
      fixture.member.api,
      fixture.model.id,
    );
    await openCreditLimitDialog(
      page,
      'teams',
      fixture.team.id,
      fixture.team.name,
    );
    await saveCreditLimit(page, 0);
    await expect.poll(() => getTeamCreditLimit(api, fixture.team.id)).toBe(0);

    const noPersonalLimitRun = await sendThreadMessage(
      fixture.member.api,
      thread.id,
      'Team cap with no personal cap',
    );
    expect(await noPersonalLimitRun.text()).toContain(
      'TEAM_CREDIT_LIMIT_EXCEEDED',
    );

    await openCreditLimitDialog(
      page,
      'users',
      fixture.member.id,
      fixture.member.email,
    );
    await saveCreditLimit(page, 1000);
    await expect
      .poll(() => getUserCreditLimit(api, fixture.member.id))
      .toBe(1000);
    const positivePersonalLimitRun = await sendThreadMessage(
      fixture.member.api,
      thread.id,
      'Personal allowance cannot bypass the team',
    );
    expect(await positivePersonalLimitRun.text()).toContain(
      'TEAM_CREDIT_LIMIT_EXCEEDED',
    );

    await openCreditLimitDialog(
      page,
      'users',
      fixture.member.id,
      fixture.member.email,
    );
    await removeCreditLimit(page);
    await expect
      .poll(() => getUserCreditLimit(api, fixture.member.id))
      .toBeNull();
    const removedPersonalLimitRun = await sendThreadMessage(
      fixture.member.api,
      thread.id,
      'Removing a personal cap cannot bypass the team',
    );
    expect(await removedPersonalLimitRun.text()).toContain(
      'TEAM_CREDIT_LIMIT_EXCEEDED',
    );
    expect((await getOrganizationCreditUsage(api)).creditsUsed).toBe(
      usageBefore.creditsUsed,
    );

    await openCreditLimitDialog(
      page,
      'teams',
      fixture.team.id,
      fixture.team.name,
    );
    await removeCreditLimit(page);
    await expect
      .poll(() => getTeamCreditLimit(api, fixture.team.id))
      .toBeNull();
    await memberPage.goto('/chat');
    await sendMessage(memberPage, 'Use the restored shared credit budget');
    await expect(
      memberPage.getByTestId('assistant-message').last(),
    ).toContainText(`${org.defaultModel.provider}::${org.defaultModel.name}`);
    expect((await getOrganizationCreditUsage(api)).monthlyCredits).toBe(10000);
  } finally {
    await memberContext.close();
    await fixture.cleanup();
  }
});

test('users settings omit credit controls while credit limits and team settings keep their modals', async ({
  page,
  api,
  publicApi,
  mail,
}) => {
  test.setTimeout(90_000);
  const fixture = await createCreditLimitsFixture(
    api,
    publicApi,
    mail,
    `entry-points-${Date.now()}`,
  );
  try {
    await page.goto(
      `/admin-settings/users?search=${encodeURIComponent(fixture.member.email)}`,
    );
    const userRow = page.getByTestId(`admin-user-row-${fixture.member.id}`);
    await expect(userRow).toBeVisible();
    const usersTable = page.getByRole('table').filter({ has: userRow });
    await expect(usersTable.getByRole('columnheader')).toHaveCount(5);
    await expect(userRow.getByRole('cell')).toHaveCount(5);
    await userRow.getByTestId('admin-user-actions').click();
    await expect(page.getByRole('menu')).toBeVisible();
    await expect(
      page.getByTestId(`credit-limits-user-${fixture.member.id}`),
    ).toHaveCount(0);
    await expect(page.getByTestId('credit-limit-dialog')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.goto(
      `/admin-settings/credit-limits?tab=users&search=${encodeURIComponent(fixture.member.email)}`,
    );
    const limitsUrl = page.url();
    await page.getByTestId(`credit-limits-user-${fixture.member.id}`).click();
    await expect(page.getByTestId('credit-limit-dialog')).toBeVisible();
    await saveCreditLimit(page, 30);
    await expect
      .poll(() => getUserCreditLimit(api, fixture.member.id))
      .toBe(30);
    await expect(page).toHaveURL(limitsUrl);
    await page.getByTestId(`credit-limits-user-${fixture.member.id}`).click();
    await expect(page.getByTestId('credit-limit-input')).toHaveValue('30');
    await removeCreditLimit(page);
    await expect
      .poll(() => getUserCreditLimit(api, fixture.member.id))
      .toBeNull();

    await page.goto(`/admin-settings/teams/${fixture.team.id}`);
    const teamUrl = page.url();
    await page.getByTestId(`credit-limits-team-${fixture.team.id}`).click();
    await expect(page.getByTestId('credit-limit-dialog')).toBeVisible();
    await saveCreditLimit(page, 40);
    await expect.poll(() => getTeamCreditLimit(api, fixture.team.id)).toBe(40);
    await expect(page).toHaveURL(teamUrl);
    await page.getByTestId(`credit-limits-team-${fixture.team.id}`).click();
    await expect(page.getByTestId('credit-limit-input')).toHaveValue('40');
    await removeCreditLimit(page);
    await expect
      .poll(() => getTeamCreditLimit(api, fixture.team.id))
      .toBeNull();
  } finally {
    await fixture.cleanup();
  }
});

test('ordinary members cannot open model admin details or credit limits settings', async ({
  api,
  publicApi,
  mail,
  browser,
}) => {
  test.setTimeout(90_000);
  const fixture = await createCreditLimitsFixture(
    api,
    publicApi,
    mail,
    `boundary-${Date.now()}`,
  );
  const memberContext = await browser.newContext({
    storageState: fixture.member.storageState,
  });
  const memberPage = await memberContext.newPage();
  try {
    for (const route of [
      `/admin-settings/models/teams/${fixture.team.id}`,
      '/admin-settings/credit-limits',
    ]) {
      await memberPage.goto(route);
      await expect(memberPage).toHaveURL(/\/chat$/);
      await expect(memberPage.getByTestId('input')).toBeVisible();
      await expect(memberPage.getByTestId('credit-limit-save')).toHaveCount(0);
      await expect(
        memberPage.getByTestId('team-model-override-toggle'),
      ).toHaveCount(0);
    }
  } finally {
    await memberContext.close();
    await fixture.cleanup();
  }
});
