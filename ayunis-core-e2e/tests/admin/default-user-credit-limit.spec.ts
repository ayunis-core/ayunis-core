import {
  getDefaultUserCreditLimit,
  getUserCreditLimit,
  removeDefaultUserCreditLimit,
  setDefaultUserCreditLimit,
} from '../../src/clients/api/credit-limits.client';
import {
  createEmptyThread,
  sendThreadMessage,
} from '../../src/clients/api/threads.client';
import { createCreditLimitsFixture } from '../../src/factories/credit-limits.factory';
import {
  openCreditLimitDialog,
  openDefaultUserCreditLimitDialog,
  removeCreditLimit,
  saveCreditLimit,
} from '../../src/flows/credit-limits.flow';
import { expect, test } from '../../src/fixtures/test';

test('default personal credit limit blocks users without an individual limit until overridden or removed', async ({
  page,
  api,
  publicApi,
  mail,
  org,
}) => {
  test.setTimeout(90_000);
  const fixture = await createCreditLimitsFixture(
    api,
    publicApi,
    mail,
    `default-${Date.now()}`,
  );
  const mockReply = `${org.defaultModel.provider}::${org.defaultModel.name}`;
  try {
    const thread = await createEmptyThread(
      fixture.member.api,
      fixture.model.id,
    );

    await openDefaultUserCreditLimitDialog(page);
    await expect(page.getByTestId('credit-limit-remove')).toHaveCount(0);
    await saveCreditLimit(page, 0);
    await expect.poll(() => getDefaultUserCreditLimit(api)).toBe(0);
    expect(await getUserCreditLimit(api, fixture.member.id)).toBeNull();

    const blockedByDefault = await sendThreadMessage(
      fixture.member.api,
      thread.id,
      'Blocked by the org default',
    );
    expect(await blockedByDefault.text()).toContain(
      'USER_CREDIT_LIMIT_EXCEEDED',
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
    const allowedByIndividual = await sendThreadMessage(
      fixture.member.api,
      thread.id,
      'An individual limit overrides the default',
    );
    expect(await allowedByIndividual.text()).toContain(mockReply);

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
    const blockedAgain = await sendThreadMessage(
      fixture.member.api,
      thread.id,
      'Removing the individual limit falls back to the default',
    );
    expect(await blockedAgain.text()).toContain('USER_CREDIT_LIMIT_EXCEEDED');

    await openDefaultUserCreditLimitDialog(page);
    await expect(page.getByTestId('credit-limit-input')).toHaveValue('0');
    await removeCreditLimit(page);
    await expect.poll(() => getDefaultUserCreditLimit(api)).toBeNull();
    const allowedWithoutDefault = await sendThreadMessage(
      fixture.member.api,
      thread.id,
      'No default means no personal limit',
    );
    expect(await allowedWithoutDefault.text()).toContain(mockReply);
  } finally {
    await removeDefaultUserCreditLimit(api);
    await fixture.cleanup();
  }
});

test('only admins can read or change the default personal credit limit', async ({
  api,
  publicApi,
  mail,
}) => {
  test.setTimeout(90_000);
  const fixture = await createCreditLimitsFixture(
    api,
    publicApi,
    mail,
    `default-boundary-${Date.now()}`,
  );
  try {
    await expect(getDefaultUserCreditLimit(fixture.member.api)).rejects.toThrow(
      /HTTP 403/,
    );
    await expect(
      setDefaultUserCreditLimit(fixture.member.api, 1),
    ).rejects.toThrow(/HTTP 403/);
    expect(await getDefaultUserCreditLimit(api)).toBeNull();

    await setDefaultUserCreditLimit(api, 50);
    await expect(
      removeDefaultUserCreditLimit(fixture.member.api),
    ).rejects.toThrow(/HTTP 403/);
    expect(await getDefaultUserCreditLimit(api)).toBe(50);
  } finally {
    await removeDefaultUserCreditLimit(api);
    await fixture.cleanup();
  }
});
