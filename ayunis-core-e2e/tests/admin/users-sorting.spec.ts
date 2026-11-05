import {
  inviteUser,
  requestDeleteInvite,
} from '../../src/clients/api/invites.client';
import { generatedApi } from '../../src/clients/api/generated-api';
import { test, expect } from '../../src/fixtures/test';

test('admin sorts pending invites and users by column', async ({
  page,
  api,
}) => {
  const key = `sort${Date.now()}`;
  await inviteUser(api, `${key}-a@e2e.local`);
  await inviteUser(api, `${key}-b@e2e.local`);

  try {
    await page.goto(`/admin-settings/users?invitesSearch=${key}`);
    const inviteRows = page.getByTestId('admin-invite-row');
    await expect(inviteRows).toHaveCount(2);

    const emailSort = page.getByTestId('admin-invites-sort-email');
    await emailSort.getByRole('button').click();
    await expect(emailSort).toHaveAttribute('aria-sort', 'ascending');
    await expect(
      inviteRows.first().getByRole('cell', { name: `${key}-a@e2e.local` }),
    ).toBeVisible();

    await emailSort.getByRole('button').click();
    await expect(emailSort).toHaveAttribute('aria-sort', 'descending');
    await expect(page).toHaveURL(/invitesSortBy=email&invitesSortOrder=desc/);
    await expect(
      inviteRows.first().getByRole('cell', { name: `${key}-b@e2e.local` }),
    ).toBeVisible();

    const nameSort = page.getByTestId('admin-users-sort-name');
    await nameSort.getByRole('button').click();
    await expect(nameSort).toHaveAttribute('aria-sort', 'ascending');
    await expect(page).toHaveURL(/sortBy=name&sortOrder=asc/);
    await expect(page).toHaveURL(/invitesSortBy=email&invitesSortOrder=desc/);
  } finally {
    // The worker org is shared with other specs that count its invites.
    const { data } = await generatedApi.invitesControllerGetInvites(
      { search: key },
      { api },
    );
    await Promise.all(data.map((invite) => requestDeleteInvite(api, invite.id)));
  }
});
