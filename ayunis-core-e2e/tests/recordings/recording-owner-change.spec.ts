import { randomUUID } from 'node:crypto';
import type { APIRequestContext } from '@playwright/test';
import {
  changeRecordingOwner,
  createRecording,
  getRecording,
  requestRecording,
  requestRecordingOwnerChange,
  requestRecordingRename,
} from '../../src/clients/api/recordings.client';
import { generatedApi } from '../../src/clients/api/generated-api';
import { createRecordingAccessFixture } from '../../src/factories/recording-access.factory';
import { test, expect } from '../../src/fixtures/test';

async function readStatus(
  api: APIRequestContext,
  recordingId: string,
): Promise<number> {
  return (await requestRecording(api, recordingId)).status();
}

test('a recording moves between the user, a team and the organization and access follows its owner', async ({
  browser,
  mail,
}) => {
  test.setTimeout(180_000);
  const key = randomUUID().slice(0, 8);
  const fixture = await createRecordingAccessFixture(
    key,
    mail,
    test.info().outputPath('recordings-move-org.json'),
  );
  const { admin, member, outsider, team } = fixture;

  try {
    const recording = await createRecording(admin.api, {
      ownerType: 'personal',
      name: `Ortsbeirat ${key}`,
    });
    expect(await readStatus(member.api, recording.id)).toBe(404);
    expect(await readStatus(outsider.api, recording.id)).toBe(404);

    await changeRecordingOwner(admin.api, recording.id, {
      ownerType: 'team',
      teamId: team.id,
    });
    expect(await readStatus(member.api, recording.id)).toBe(200);
    expect(await readStatus(outsider.api, recording.id)).toBe(404);

    // Moving it away takes the right to manage the team, which the member
    // lacks.
    expect(
      (
        await requestRecordingOwnerChange(member.api, recording.id, {
          ownerType: 'org',
        })
      ).status(),
    ).toBe(403);

    // The admin moves it to the organization through the owner card.
    const context = await browser.newContext({
      storageState: admin.storageState,
    });
    try {
      const page = await context.newPage();
      await page.goto(`/recordings/${recording.id}`);
      await page.getByTestId('recording-owner-select').click();
      await page.getByTestId('recording-owner-select-option-org').click();
      await page.getByTestId('confirmation-confirm').click();
      await expect(
        page.getByTestId('recording-detail-owner-badge'),
      ).toHaveAttribute('data-owner-type', 'org');
    } finally {
      await context.close();
    }
    expect(await readStatus(outsider.api, recording.id)).toBe(200);

    // Every member reads an org recording; managing it takes
    // manage_org_recordings.
    expect(
      (
        await requestRecordingRename(outsider.api, recording.id, 'Ortsbeirat')
      ).status(),
    ).toBe(403);
    await fixture.setUserRecordingPermissions([
      'manage_recordings',
      'manage_org_recordings',
    ]);
    expect(
      (
        await requestRecordingRename(outsider.api, recording.id, `Ortsbeirat ${key}`)
      ).status(),
    ).toBe(200);

    await changeRecordingOwner(admin.api, recording.id, {
      ownerType: 'personal',
    });
    expect(await readStatus(member.api, recording.id)).toBe(404);
    expect(await readStatus(outsider.api, recording.id)).toBe(404);
    const moved = await getRecording(admin.api, recording.id);
    expect(moved).toMatchObject({ ownerType: 'personal', id: recording.id });
  } finally {
    await fixture.dispose();
  }
});

test('a workspace recording stays in its workspace and only its owner sees it', async ({
  mail,
}) => {
  test.setTimeout(120_000);
  const key = randomUUID().slice(0, 8);
  const fixture = await createRecordingAccessFixture(
    key,
    mail,
    test.info().outputPath('recordings-workspace-org.json'),
  );
  const { admin, member } = fixture;

  try {
    const workspace = await generatedApi.workspacesControllerCreate(
      { name: `Haushalt ${key}`, icon: 'building-2' },
      { api: admin.api },
    );
    const recording = await createRecording(admin.api, {
      ownerType: 'workspace',
      workspaceId: workspace.id,
      name: `Haushaltsklausur ${key}`,
    });
    expect(await readStatus(member.api, recording.id)).toBe(404);

    const move = await requestRecordingOwnerChange(admin.api, recording.id, {
      ownerType: 'personal',
    });
    expect(move.status()).toBe(400);
    expect(await move.json()).toMatchObject({
      code: 'RECORDING_OWNER_CHANGE_NOT_ALLOWED',
    });
    expect(await getRecording(admin.api, recording.id)).toMatchObject({
      ownerType: 'workspace',
      workspaceId: workspace.id,
    });
  } finally {
    await fixture.dispose();
  }
});
