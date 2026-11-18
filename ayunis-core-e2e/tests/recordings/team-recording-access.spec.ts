import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import {
  listRecordingIds,
  requestRecording,
  requestRecordingCreation,
  requestRecordingDeletion,
  requestRecordingOwnerChange,
  requestRecordingRename,
} from '../../src/clients/api/recordings.client';
import {
  addTeamMember,
  requestTeamMemberRemoval,
} from '../../src/clients/api/teams.client';
import { createRecordingAccessFixture } from '../../src/factories/recording-access.factory';
import { test, expect } from '../../src/fixtures/test';

async function chooseOwner(page: Page, ownerKey: string): Promise<void> {
  await page.getByTestId('recording-create-owner').click();
  await page.getByTestId(`recording-create-owner-option-${ownerKey}`).click();
}

test('a team recording is managed by permitted members, read-only for other members and hidden outside the team', async ({
  api,
  browser,
  mail,
}) => {
  test.setTimeout(180_000);
  const key = randomUUID().slice(0, 8);
  const fixture = await createRecordingAccessFixture(
    key,
    mail,
    test.info().outputPath('recordings-team-org.json'),
  );
  const { admin, member, outsider, team } = fixture;
  const contexts = await Promise.all(
    [admin, member].map(({ storageState }) =>
      browser.newContext({ storageState }),
    ),
  );
  const [adminPage, memberPage] = await Promise.all(
    contexts.map((context) => context.newPage()),
  );

  try {
    // The admin may manage team and org recordings: both are offered, grouped.
    await adminPage.goto('/recordings');
    await adminPage.getByTestId('recording-create').first().click();
    await adminPage.getByTestId('recording-create-owner').click();
    await expect(
      adminPage.getByTestId('recording-create-owner-group-orgAndTeams'),
    ).toBeVisible();
    await expect(
      adminPage.getByTestId('recording-create-owner-option-org'),
    ).toBeVisible();
    await adminPage.keyboard.press('Escape');
    await chooseOwner(adminPage, `team:${team.id}`);
    await adminPage.getByTestId('entity-form-name').fill(`Bauausschuss ${key}`);
    await adminPage.getByTestId('create-entity-submit').click();
    await expect(
      adminPage.getByTestId('recording-detail-owner-badge'),
    ).toHaveAttribute('data-owner-type', 'team');
    const recordingId = new URL(adminPage.url()).pathname.split('/').pop()!;

    // Without the team and org permission only the user is offered as owner,
    // and the API refuses the other owners.
    await memberPage.goto('/recordings');
    await memberPage.getByTestId('recording-create').first().click();
    await expect(memberPage.getByTestId('entity-form-name')).toBeVisible();
    await expect(memberPage.getByTestId('recording-create-owner')).toHaveCount(
      0,
    );
    await memberPage.keyboard.press('Escape');
    for (const owner of [
      { ownerType: 'team' as const, teamId: team.id },
      { ownerType: 'org' as const },
    ]) {
      const denied = await requestRecordingCreation(member.api, {
        ...owner,
        name: `Nicht erlaubt ${key}`,
      });
      expect(denied.status()).toBe(403);
    }

    // An organization member outside the team and a user of another
    // organization cannot see it.
    expect(await listRecordingIds(outsider.api)).not.toContain(recordingId);
    expect((await requestRecording(outsider.api, recordingId)).status()).toBe(
      404,
    );
    expect((await requestRecording(api, recordingId)).status()).toBe(404);

    // A team member without manage_team_recordings reads it, but cannot
    // rename, move or delete it.
    await memberPage.goto('/recordings');
    await memberPage.getByTestId(`recording-card-${recordingId}`).click();
    await expect(memberPage.getByTestId('recording-page')).toBeVisible();
    await expect(memberPage.getByTestId('entity-form-name')).toBeDisabled();
    await expect(memberPage.getByTestId('recording-rename-submit')).toHaveCount(
      0,
    );
    await expect(memberPage.getByTestId('recording-owner-select')).toHaveCount(
      0,
    );
    await expect(memberPage.getByTestId('recording-detail-delete')).toHaveCount(
      0,
    );
    expect(
      (await requestRecordingRename(member.api, recordingId, 'Umbenannt')).status(),
    ).toBe(403);
    expect(
      (
        await requestRecordingOwnerChange(member.api, recordingId, {
          ownerType: 'personal',
        })
      ).status(),
    ).toBe(403);
    expect(
      (await requestRecordingDeletion(member.api, recordingId)).status(),
    ).toBe(403);

    // Joining the team opens it, leaving the team closes it again at once.
    await addTeamMember(admin.api, team.id, outsider.id);
    expect(await listRecordingIds(outsider.api)).toContain(recordingId);
    expect((await requestRecording(outsider.api, recordingId)).status()).toBe(
      200,
    );
    expect(
      (await requestTeamMemberRemoval(admin.api, team.id, outsider.id)).ok(),
    ).toBe(true);
    expect(await listRecordingIds(outsider.api)).not.toContain(recordingId);
    expect((await requestRecording(outsider.api, recordingId)).status()).toBe(
      404,
    );

    // The admin manages it.
    await adminPage.getByTestId('recording-detail-delete').click();
    await adminPage.getByTestId('confirmation-confirm').click();
    await expect(adminPage).toHaveURL(/\/recordings$/);
    expect((await requestRecording(admin.api, recordingId)).status()).toBe(404);
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
    await fixture.dispose();
  }
});
