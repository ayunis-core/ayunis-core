import type { Page } from '@playwright/test';
import { generatedApi } from '../../src/clients/api/generated-api';
import { createTeamOwnershipFixture } from '../../src/factories/team-ownership.factory';
import { test, expect } from '../../src/fixtures/test';

async function chooseOwner(
  page: Page,
  selectTestId: string,
  ownerKey: string,
): Promise<void> {
  await page.getByTestId(selectTestId).click();
  await page.getByTestId(`${selectTestId}-option-${ownerKey}`).click();
}

test('team skills are visible to team members only and can move to the organization', async ({
  page,
  api,
  mail,
  browser,
}) => {
  test.setTimeout(120_000);
  const suffix = `team-skill-${Date.now()}`;
  const fixture = await createTeamOwnershipFixture(api, mail, suffix);
  const memberContext = await browser.newContext({
    storageState: fixture.member.storageState,
  });
  const outsiderContext = await browser.newContext({
    storageState: fixture.outsider.storageState,
  });

  try {
    await page.goto('/skills');
    await page.getByTestId('create-skill-menu').first().click();
    await page.getByTestId('create-skill-editor').click();
    await chooseOwner(page, 'skill-create-owner', `team:${fixture.team.id}`);
    await page.getByTestId('entity-form-name').fill(`Council minutes ${suffix}`);
    await page
      .getByTestId('entity-form-short-description')
      .fill('When minutes are needed');
    await page
      .getByTestId('entity-form-instructions')
      .fill('Summarise each agenda item.');
    await page.getByTestId('create-entity-submit').click();

    await expect(page.getByTestId('skill-detail-owner-badge')).toHaveAttribute(
      'data-owner-type',
      'team',
    );
    const skillId = new URL(page.url()).pathname.split('/').pop() ?? '';

    // Denied before membership, allowed for members.
    const outsiderPage = await outsiderContext.newPage();
    await outsiderPage.goto('/skills');
    await expect(
      outsiderPage.getByTestId('create-skill-menu').first(),
    ).toBeVisible();
    await expect(
      outsiderPage.getByTestId(`skill-card-${skillId}`),
    ).toHaveCount(0);

    const memberPage = await memberContext.newPage();
    await memberPage.goto('/skills');
    await memberPage.getByTestId('skills-tab-shared').click();
    await expect(
      memberPage.getByTestId(`skill-owner-badge-${skillId}`),
    ).toHaveAttribute('data-owner-type', 'team');

    // Granting membership opens access.
    await fixture.addToTeam(fixture.outsider);
    await outsiderPage.reload();
    await outsiderPage.getByTestId('skills-tab-shared').click();
    await expect(outsiderPage.getByTestId(`skill-card-${skillId}`)).toBeVisible();

    // Moving it to the organization.
    await chooseOwner(page, 'skill-owner-select', 'org');
    await page.getByTestId('confirmation-confirm').click();
    await expect(page.getByTestId('skill-detail-owner-badge')).toHaveAttribute(
      'data-owner-type',
      'org',
    );
    await expect
      .poll(async () => {
        const skill = await generatedApi.skillsControllerFindOne(skillId, {
          api: fixture.member.api,
        });
        return skill.ownerType;
      })
      .toBe('org');
  } finally {
    await memberContext.close();
    await outsiderContext.close();
    await fixture.cleanup();
  }
});

test('team knowledge bases are visible to team members only', async ({
  page,
  api,
  mail,
  browser,
}) => {
  test.setTimeout(120_000);
  const suffix = `team-kb-${Date.now()}`;
  const fixture = await createTeamOwnershipFixture(api, mail, suffix);
  const memberContext = await browser.newContext({
    storageState: fixture.member.storageState,
  });
  const outsiderContext = await browser.newContext({
    storageState: fixture.outsider.storageState,
  });

  try {
    await page.goto('/knowledge-bases');
    await page.getByTestId('knowledge-base-create').first().click();
    await chooseOwner(
      page,
      'knowledge-base-create-owner',
      `team:${fixture.team.id}`,
    );
    await page.getByTestId('entity-form-name').fill(`Building code ${suffix}`);
    await page.getByTestId('create-entity-submit').click();

    await expect(
      page.getByTestId('knowledge-base-detail-owner-badge'),
    ).toHaveAttribute('data-owner-type', 'team');
    const knowledgeBaseId = new URL(page.url()).pathname.split('/').pop() ?? '';

    const outsiderPage = await outsiderContext.newPage();
    await outsiderPage.goto('/knowledge-bases');
    await expect(
      outsiderPage.getByTestId('knowledge-base-create').first(),
    ).toBeVisible();
    await expect(
      outsiderPage.getByTestId(`knowledge-base-card-${knowledgeBaseId}`),
    ).toHaveCount(0);

    const memberPage = await memberContext.newPage();
    await memberPage.goto('/knowledge-bases');
    await memberPage.getByTestId('knowledge-base-tab-shared').click();
    await expect(
      memberPage.getByTestId(`knowledge-base-owner-badge-${knowledgeBaseId}`),
    ).toHaveAttribute('data-owner-type', 'team');

    await fixture.addToTeam(fixture.outsider);
    await outsiderPage.reload();
    await outsiderPage.getByTestId('knowledge-base-tab-shared').click();
    await expect(
      outsiderPage.getByTestId(`knowledge-base-card-${knowledgeBaseId}`),
    ).toBeVisible();
  } finally {
    await memberContext.close();
    await outsiderContext.close();
    await fixture.cleanup();
  }
});
