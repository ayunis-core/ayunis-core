import { inviteUser } from '../../src/clients/api/invites.client';
import { generatedApi } from '../../src/clients/api/generated-api';
import type { UserResponseDto } from '../../src/clients/generated/ayunisCoreAPI.schemas';
import { test, expect } from '../../src/fixtures/test';
import { signIn } from '../../src/flows/auth.flow';

test('shares a project with a team and a directly invited member', async ({
  page,
  browser,
  api,
  mail,
}) => {
  test.setTimeout(60_000);
  const suffix = `${Date.now()}`;
  const memberEmail = `project-member-${suffix}@e2e.local`;
  const memberName = `Project Member ${suffix}`;
  const password = 'E2e-Password-1';

  await inviteUser(api, memberEmail);
  const token = await mail.extractLinkToken(memberEmail, '/accept-invite');
  const memberContext = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  const memberPage = await memberContext.newPage();
  await memberPage.goto(`/accept-invite?token=${token}`);
  await memberPage.getByTestId('invite-accept-name').fill(memberName);
  await memberPage.getByTestId('invite-accept-password').fill(password);
  await memberPage.getByTestId('invite-accept-submit').click();
  await expect(memberPage).toHaveURL(/\/login/);
  await signIn(memberPage, memberEmail, password);
  await expect(memberPage).not.toHaveURL(/\/login/);
  await memberPage.getByRole('button', { name: /Close|Schließen/ }).click();

  const users = await generatedApi.userControllerGetUsersInOrganization(
    { limit: 100, offset: 0 },
    { api },
  );
  const member = users.data.find(({ email }) => email === memberEmail);
  expect(member).toBeDefined();
  const memberId = member?.id as string;
  const team = await generatedApi.teamsControllerCreateTeam(
    { name: `Project Team ${suffix}` },
    { api },
  );
  await generatedApi.teamsControllerAddTeamMember(
    team.id,
    { userId: memberId },
    { api },
  );
  const workspace = await generatedApi.workspacesControllerCreate(
    { name: `Shared Project ${suffix}`, description: 'Sharing journey' },
    { api },
  );

  await page.goto(`/workspaces/${workspace.id}`);
  await page.getByTestId('workspace-sharing-open').click();
  await page.getByTestId('workspace-sharing-recipient').click();
  await page.getByRole('option', { name: `${team.name} (1)` }).click();
  await page.getByTestId('workspace-sharing-invite').click();
  await expect(page.getByTestId(`workspace-sharing-team-${team.id}`)).toBeVisible();

  await page.getByTestId(`workspace-sharing-team-expand-${team.id}`).click();
  await page.getByTestId(`workspace-sharing-team-member-access-level-${memberId}`).click();
  await page.getByRole('option', { name: 'Kein Zugriff' }).click();

  await page.getByTestId('workspace-sharing-recipient').click();
  await page.getByRole('option', { name: memberName }).click();
  await page.getByTestId('workspace-sharing-invite').click();
  await expect(page.getByTestId(`workspace-sharing-user-${memberId}`)).toBeVisible();

  await page.getByTestId('workspace-sharing-organization-toggle').click();
  await expect
    .poll(async () => {
      const sharing = await generatedApi.workspaceSharingControllerGetSharing(
        workspace.id,
        { api },
      );
      return {
        visibility: sharing.visibility,
        memberStatus: sharing.members[0]?.status,
        excluded: sharing.teamGrants[0]?.overrides[0]?.excluded,
      };
    })
    .toEqual({
      visibility: 'organization',
      memberStatus: 'pending',
      excluded: true,
    });

  await memberPage.goto('/workspaces');
  await expect(memberPage.getByTestId('workspace-invitations')).toBeVisible();
  await memberPage
    .getByTestId(`workspace-invitation-accept-${workspace.id}`)
    .click();
  await expect(
    memberPage.getByRole('link', { name: workspace.name, exact: true }),
  ).toBeVisible();

  await memberPage
    .getByRole('link', { name: workspace.name, exact: true })
    .click();
  await expect(memberPage.getByTestId('workspace-page')).toBeVisible();
  await expect(memberPage.getByTestId('workspace-sharing-open')).toHaveCount(0);
  await expect(memberPage.getByRole('button', { name: 'Einstellungen' })).toHaveCount(0);
  await memberPage.getByTestId('workspace-tab-instructions').click();
  await expect(memberPage.getByTestId('workspace-instruction-input')).toHaveAttribute(
    'readonly',
    '',
  );

  await memberContext.close();
});

test('invites a user returned after the first organization-users page', async ({
  page,
  api,
  mail,
}) => {
  const suffix = `${Date.now()}`;
  const memberEmail = `paginated-member-${suffix}@e2e.local`;
  const memberName = `Paginated Member ${suffix}`;
  await inviteUser(api, memberEmail);
  const token = await mail.extractLinkToken(memberEmail, '/accept-invite');
  await generatedApi.invitesControllerAcceptInvite(
    {
      inviteToken: token,
      userName: memberName,
      password: 'E2e-Password-1',
      hasAcceptedMarketing: false,
    },
    { api },
  );
  const organizationUsers = await generatedApi.userControllerGetUsersInOrganization(
    { limit: 100, offset: 0 },
    { api },
  );
  const member = findUserByEmail(organizationUsers.data, memberEmail);

  const requestedOffsets: number[] = [];
  await page.route(/\/api\/users\?.*/, async (route) => {
    const url = new URL(route.request().url());
    const offset = Number(url.searchParams.get('offset'));
    requestedOffsets.push(offset);
    await route.fulfill({
      json: {
        data: offset === 0 ? createFirstUsersPage(member.orgId) : [member],
        pagination: { limit: 100, offset, total: 101 },
      },
    });
  });

  const workspace = await generatedApi.workspacesControllerCreate(
    { name: `Paginated Sharing ${suffix}`, description: 'Pagination journey' },
    { api },
  );
  await page.goto(`/workspaces/${workspace.id}`);
  await page.getByTestId('workspace-sharing-open').click();
  await expect.poll(() => requestedOffsets).toContain(100);
  await page.getByTestId('workspace-sharing-recipient').click();
  await page.getByRole('option', { name: memberName }).click();
  await page.getByTestId('workspace-sharing-invite').click();
  await expect(
    page.getByTestId(`workspace-sharing-user-${member.id}`),
  ).toBeVisible();
});

function findUserByEmail(users: UserResponseDto[], email: string): UserResponseDto {
  const user = users.find((candidate) => candidate.email === email);
  if (!user) {
    throw new Error('Accepted member is missing from the organization user list');
  }
  return user;
}

function createFirstUsersPage(orgId: string): UserResponseDto[] {
  return Array.from({ length: 100 }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    name: `First page user ${index}`,
    email: `first-page-${index}@e2e.local`,
    role: 'user',
    orgId,
    createdAt: new Date(0).toISOString(),
  }));
}
