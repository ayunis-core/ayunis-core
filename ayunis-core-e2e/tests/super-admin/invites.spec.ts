import { login, markWelcomeVideoSeen } from "../../src/clients/api/auth.client";
import {
  inviteUser,
  bulkInviteUserAsSuperAdmin,
} from "../../src/clients/api/invites.client";
import { createSuperAdminOrg } from "../../src/clients/api/super-admin-orgs.client";
import {
  createSuperAdminSubscription,
  e2eSubscriptionBilling,
  updateSuperAdminSeats,
} from "../../src/clients/api/super-admin-subscriptions.client";
import {
  listSuperAdminInvites,
  requestSuperAdminInviteDeletion,
  deleteAllSuperAdminInvites,
  createSuperAdminInvites,
} from "../../src/clients/api/super-admin-invites.client";
import { createApiContext } from "../../src/factories/api-context.factory";
import { createOrg } from "../../src/factories/org.factory";
import { createUser } from "../../src/factories/user.factory";
import { test, expect } from "../../src/fixtures/test";

test.setTimeout(90_000);

test("super admin confirms individual and all-org invite cleanup and can book fewer seats", async ({
  page,
  api,
  publicApi,
}) => {
  const key = Date.now();
  const org = await createOrg(
    `invite-cleanup-${key}`,
    test.info().outputPath("cleanup-org.json"),
  );
  await login(api, org.admin.email, org.admin.password);
  const firstEmail = `e2e-cleanup-first-${key}@e2e.local`;
  const secondEmail = `e2e-cleanup-second-${key}@e2e.local`;
  await inviteUser(api, firstEmail);
  await inviteUser(api, secondEmail);
  await login(publicApi, "admin@demo.local", "admin");
  await markWelcomeVideoSeen(publicApi);
  const foreignOrg = await createSuperAdminOrg(
    publicApi,
    `Foreign invites ${key}`,
  );
  await createSuperAdminSubscription(publicApi, foreignOrg.id, {
    ...e2eSubscriptionBilling,
    type: "USAGE_BASED",
    monthlyCredits: 500,
  });
  await bulkInviteUserAsSuperAdmin(
    publicApi,
    foreignOrg.id,
    `e2e-foreign-${key}@e2e.local`,
    [],
  );
  await createSuperAdminSubscription(publicApi, org.orgId, {
    ...e2eSubscriptionBilling,
    type: "SEAT_BASED",
    noOfSeats: 12,
  });
  await createSuperAdminInvites(
    publicApi,
    org.orgId,
    Array.from(
      { length: 9 },
      (_, index) => `e2e-cleanup-${key}-${index}@e2e.local`,
    ),
  );
  const before = await listSuperAdminInvites(publicApi, org.orgId);
  const first = before.data[10];
  expect(first).toBeTruthy();

  expect(
    (await requestSuperAdminInviteDeletion(api, org.orgId, first.id)).status(),
  ).toBe(403);
  expect(
    (await requestSuperAdminInviteDeletion(api, org.orgId, "all")).status(),
  ).toBe(403);
  expect(
    (
      await requestSuperAdminInviteDeletion(publicApi, foreignOrg.id, first.id)
    ).status(),
  ).toBe(404);
  expect(
    (
      await requestSuperAdminInviteDeletion(publicApi, org.orgId, "invalid-id")
    ).status(),
  ).toBe(400);
  expect((await listSuperAdminInvites(publicApi, org.orgId)).data).toEqual(
    before.data,
  );
  await expect(updateSuperAdminSeats(publicApi, org.orgId, 1)).rejects.toThrow(
    "TOO_MANY_USED_SEATS",
  );

  await page.context().addCookies((await publicApi.storageState()).cookies);
  await page.goto(
    `/super-admin-settings/orgs/${org.orgId}?tab=users&invitesPage=2`,
  );
  const firstRow = page.getByTestId(`super-admin-invite-row-${first.id}`);
  await firstRow.getByTestId(`super-admin-invite-delete-${first.id}`).click();
  await page.getByTestId("confirmation-cancel").click();
  await expect(firstRow).toBeVisible();
  expect((await listSuperAdminInvites(publicApi, org.orgId)).data).toEqual(
    before.data,
  );
  await firstRow.getByTestId(`super-admin-invite-delete-${first.id}`).click();
  await page.getByTestId("confirmation-confirm").click();
  await expect(firstRow).toHaveCount(0);
  await expect(page).not.toHaveURL(/invitesPage=2/);
  await expect(
    page.getByRole("cell", { name: secondEmail, exact: true }),
  ).toBeVisible();
  expect(
    (
      await requestSuperAdminInviteDeletion(publicApi, org.orgId, first.id)
    ).status(),
  ).toBe(404);

  await inviteUser(api, first.email);
  const recreated = (
    await listSuperAdminInvites(publicApi, org.orgId)
  ).data.find((invite) => invite.email === first.email);
  expect(recreated).toBeTruthy();
  expect(recreated?.id).not.toBe(first.id);
  await page.reload();
  await page.getByTestId("super-admin-invites-search").fill(secondEmail);
  await expect(
    page.getByRole("cell", { name: secondEmail, exact: true }),
  ).toBeVisible();
  await page.getByTestId("super-admin-invites-delete-all").click();
  await page.getByTestId("confirmation-cancel").click();
  expect((await listSuperAdminInvites(publicApi, org.orgId)).data).toHaveLength(
    11,
  );
  await page.getByTestId("super-admin-invites-delete-all").click();
  await page.getByTestId("confirmation-confirm").click();
  await expect
    .poll(async () => (await listSuperAdminInvites(publicApi, org.orgId)).data)
    .toEqual([]);
  await expect(page.getByTestId("super-admin-invites-section")).toBeVisible();
  await expect(
    page.getByTestId("super-admin-invites-section").getByRole("row"),
  ).toHaveCount(0);
  expect(
    (await listSuperAdminInvites(publicApi, foreignOrg.id)).data,
  ).toHaveLength(1);
  expect(await deleteAllSuperAdminInvites(publicApi, org.orgId)).toEqual({
    deletedCount: 0,
  });
  await updateSuperAdminSeats(publicApi, org.orgId, 1);
});

test("ordinary members cannot delete selected-org invites individually or in bulk", async ({
  api,
  publicApi,
  mail,
  org,
}) => {
  const key = Date.now();
  const member = await createUser(api, mail, `super-admin-invites-${key}`);
  const memberApi = await createApiContext({ cookies: [], origins: [] });
  try {
    await login(memberApi, member.email, member.password);
    await inviteUser(api, `e2e-member-denied-${key}@e2e.local`);
    await login(publicApi, "admin@demo.local", "admin");
    const before = await listSuperAdminInvites(publicApi, org.orgId);
    expect(before.data).toHaveLength(1);
    expect(
      (
        await requestSuperAdminInviteDeletion(
          memberApi,
          org.orgId,
          before.data[0].id,
        )
      ).status(),
    ).toBe(403);
    expect(
      (
        await requestSuperAdminInviteDeletion(memberApi, org.orgId, "all")
      ).status(),
    ).toBe(403);
    expect((await listSuperAdminInvites(publicApi, org.orgId)).data).toEqual(
      before.data,
    );
    expect(
      (
        await requestSuperAdminInviteDeletion(
          publicApi,
          org.orgId,
          before.data[0].id,
        )
      ).status(),
    ).toBe(204);
    expect((await listSuperAdminInvites(publicApi, org.orgId)).data).toEqual(
      [],
    );
  } finally {
    await memberApi.dispose();
  }
});
