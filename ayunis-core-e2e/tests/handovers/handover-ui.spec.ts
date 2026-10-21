import type { APIRequestContext, Browser, Page } from '@playwright/test';
import { test, expect } from '../../src/fixtures/test';
import { generatedApi } from '../../src/clients/api/generated-api';
import {
  requestCreateSkill,
  requestDeleteSkill,
} from '../../src/clients/api/owned-resources.client';
import {
  getTeamAdminPermissions,
  setTeamAdminPermissions,
} from '../../src/clients/api/role-permissions.client';
import {
  addTeamMember,
  createTeam,
  deleteTeam,
  requestSetTeamAdmin,
} from '../../src/clients/api/teams.client';
import {
  createSignedInMember,
  type SignedInMember,
} from '../../src/factories/user.factory';
import type { MailcatcherClient } from '../../src/clients/mailcatcher.client';

interface HandoverScenario {
  teamId: string;
  requester: SignedInMember;
  reviewer: SignedInMember;
  requesterPage: Page;
  reviewerPage: Page;
  skillId: string;
  skillName: string;
  cleanUp: () => Promise<void>;
}

async function openAs(browser: Browser, member: SignedInMember): Promise<Page> {
  const context = await browser.newContext({
    storageState: member.storageState,
  });
  return context.newPage();
}

async function createScenario(
  api: APIRequestContext,
  mail: MailcatcherClient,
  browser: Browser,
  suffix: string,
): Promise<HandoverScenario> {
  const originalRights = await getTeamAdminPermissions(api);
  const team = await createTeam(api, `Bauamt ${suffix}`);
  const requester = await createSignedInMember(api, mail, `${suffix}-lena`);
  const reviewer = await createSignedInMember(api, mail, `${suffix}-jonas`);
  await addTeamMember(api, team.id, requester.id);
  await addTeamMember(api, team.id, reviewer.id);
  await requestSetTeamAdmin(api, team.id, reviewer.id, true);
  await setTeamAdminPermissions(api, [
    ...new Set([...originalRights, 'team_review_requests' as const]),
  ]);
  const skillName = `Protokoll ${suffix}`;
  const created = await requestCreateSkill(
    requester.api,
    { ownerType: 'personal' },
    skillName,
  );
  const skillId = ((await created.json()) as { id: string }).id;
  const requesterPage = await openAs(browser, requester);
  const reviewerPage = await openAs(browser, reviewer);

  return {
    teamId: team.id,
    requester,
    reviewer,
    requesterPage,
    reviewerPage,
    skillId,
    skillName,
    cleanUp: async () => {
      await requestDeleteSkill(api, skillId);
      await setTeamAdminPermissions(api, originalRights);
      await deleteTeam(api, team.id);
      for (const person of [requester, reviewer]) {
        await generatedApi.userControllerDeleteUser(person.id, { api });
        await person.api.dispose();
      }
      await requesterPage.context().close();
      await reviewerPage.context().close();
    },
  };
}

async function requestHandoverToTeam(scenario: HandoverScenario) {
  const page = scenario.requesterPage;
  await page.goto(`/skills/${scenario.skillId}`);
  await page.getByTestId('handover-open').click();
  const dialog = page.getByTestId('handover-dialog');
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId('handover-target')).toBeVisible();
  await dialog.getByTestId('handover-submit').click();
  await expect(page.getByTestId('handover-status')).toBeVisible();
  await expect(page.getByTestId('handover-open')).toHaveCount(0);
}

function requestRow(page: Page, skillName: string) {
  return page
    .locator('[data-testid^="handover-request-"]')
    .filter({ hasText: skillName });
}

test('a member requests a handover, the team admin approves it from the requests tab', async ({
  api,
  mail,
  browser,
}) => {
  test.setTimeout(120_000);
  const scenario = await createScenario(
    api,
    mail,
    browser,
    `handover-ui-${Date.now()}`,
  );

  try {
    await scenario.reviewerPage.goto('/skills');
    await expect(
      scenario.reviewerPage.getByTestId('sidebar-requests-skills'),
    ).toHaveCount(0);

    await requestHandoverToTeam(scenario);

    const reviewerPage = scenario.reviewerPage;
    await reviewerPage.goto('/skills?tab=requests');
    await expect(reviewerPage.getByTestId('sidebar-requests-skills')).toHaveText(
      '1',
    );
    await expect(
      reviewerPage.getByTestId('skills-tab-requests-count'),
    ).toHaveText('1');
    const row = requestRow(reviewerPage, scenario.skillName);
    await expect(row).toBeVisible();
    await row.locator('[data-testid^="handover-approve-"]').click();
    await expect(row).toHaveCount(0);
    await expect(reviewerPage.getByTestId('handover-requests-empty')).toBeVisible();

    const requesterPage = scenario.requesterPage;
    await requesterPage.goto('/skills?tab=shared');
    await expect(
      requesterPage.getByTestId(`skill-submitted-by-${scenario.skillId}`),
    ).toBeVisible();
    await requesterPage.getByTestId(`skill-card-${scenario.skillId}`).click();
    await expect(
      requesterPage.getByTestId('skill-read-only-content'),
    ).toBeVisible();
    await expect(requesterPage.getByTestId('ownership-card')).toBeVisible();
  } finally {
    await scenario.cleanUp();
  }
});

test('a team admin rejects a handover from the review banner and the request disappears for the requester', async ({
  api,
  mail,
  browser,
}) => {
  test.setTimeout(120_000);
  const scenario = await createScenario(
    api,
    mail,
    browser,
    `handover-reject-${Date.now()}`,
  );

  try {
    await requestHandoverToTeam(scenario);

    const reviewerPage = scenario.reviewerPage;
    await reviewerPage.goto(`/skills/${scenario.skillId}`);
    const banner = reviewerPage.getByTestId('handover-review-banner');
    await expect(banner).toBeVisible();
    await expect(reviewerPage.getByTestId('skill-detail-active')).toHaveCount(0);
    await expect(reviewerPage.getByTestId('skill-read-only-content')).toBeVisible();
    await banner.locator('[data-testid^="handover-reject-"]').click();
    await expect(reviewerPage).toHaveURL(/\/skills\?tab=requests$/);

    const requesterPage = scenario.requesterPage;
    await requesterPage.goto(`/skills/${scenario.skillId}`);
    await expect(requesterPage.getByTestId('handover-status')).toHaveCount(0);
    await expect(requesterPage.getByTestId('handover-open')).toBeVisible();

    await reviewerPage.goto(`/skills/${scenario.skillId}`);
    await expect(reviewerPage.getByTestId('handover-review-banner')).toHaveCount(0);
  } finally {
    await scenario.cleanUp();
  }
});

test('the requester withdraws an open handover', async ({
  api,
  mail,
  browser,
}) => {
  test.setTimeout(120_000);
  const scenario = await createScenario(
    api,
    mail,
    browser,
    `handover-withdraw-${Date.now()}`,
  );

  try {
    await requestHandoverToTeam(scenario);
    await scenario.requesterPage.getByTestId('handover-withdraw').click();
    await expect(
      scenario.requesterPage.getByTestId('handover-status'),
    ).toHaveCount(0);
    await expect(scenario.requesterPage.getByTestId('handover-open')).toBeVisible();

    await scenario.reviewerPage.goto('/skills?tab=requests');
    await expect(
      scenario.reviewerPage.getByTestId('handover-requests-empty'),
    ).toBeVisible();
  } finally {
    await scenario.cleanUp();
  }
});
