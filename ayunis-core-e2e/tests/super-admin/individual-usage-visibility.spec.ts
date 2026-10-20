import { config } from "../../src/config";
import { createOrg } from "../../src/factories/org.factory";
import { test, expect } from "../../src/fixtures/test";
import {
  login,
  getAuthenticatedPrincipalId,
  markWelcomeVideoSeen,
} from "../../src/clients/api/auth.client";
import { ensureUsageSubscription } from "../../src/clients/api/credit-limits.client";
import { getSuperAdminOrg } from "../../src/clients/api/super-admin-orgs.client";
import {
  addSuperAdminTeamMember,
  removeSuperAdminTeamMember,
  setSuperAdminTeamLimit,
  removeSuperAdminTeamLimit,
  requestIndividualUsage,
  requestUsageVisibilityChange,
  readUsageConfig,
  readUsageStats,
  readIndividualLimits,
  setIndividualLimit,
  readSuperAdminIndividualUsage,
  readSuperAdminUsageConfig,
  readTeamLimits,
  setTeamLimit,
  removeTeamLimit,
  removeTeamMember,
} from "../../src/clients/api/usage-visibility.client";
import { createTeam, addTeamMember, bulkAddTeamMembers } from "../../src/clients/api/teams.client";
import { startThread } from "../../src/flows/chat.flow";

test("super admin hides individual usage from a separate organisation admin and restores access", async ({
  page,
  api,
  publicApi,
  browser,
  org,
}) => {
  test.setTimeout(120_000);
  await login(publicApi, "admin@demo.local", "admin");
  await markWelcomeVideoSeen(publicApi);
  await ensureUsageSubscription(api, publicApi);
  const userId = await getAuthenticatedPrincipalId(api);
  await setIndividualLimit(api, userId, 5000);
  await startThread(page, "Reply with a brief greeting.");
  await expect
    .poll(async () => (await readUsageStats(api)).totalRequests)
    .toBeGreaterThan(0);
  const before = await readUsageStats(api);
  const team = await createTeam(api, `privacy-team-${Date.now()}`);
  await addTeamMember(api, team.id, userId);
  await setTeamLimit(api, team.id, 7000);
  expect((await readTeamLimits(api))[0].creditsUsed).toBeGreaterThanOrEqual(0);
  expect(
    (await getSuperAdminOrg(publicApi, org.orgId)).hideIndividualUsage,
  ).toBe(false);
  expect((await requestIndividualUsage(api)).status()).toBe(200);
  const adminDenied = await requestUsageVisibilityChange(api, org.orgId, {
    hideIndividualUsage: true,
  });
  expect(adminDenied.status()).toBe(403);
  await expect(readSuperAdminUsageConfig(api, org.orgId)).rejects.toThrow(
    "403",
  );

  await page.goto("/admin-settings/credit-limits?tab=users");
  await expect(page.getByTestId(`credit-limits-row-${userId}`)).toContainText(
    "/ 5",
  );
  await page.goto("/admin-settings/credit-limits?tab=teams");
  await expect(page.getByTestId(`credit-limits-row-${team.id}`)).toContainText(
    "/ 7",
  );
  await page.goto("/admin-settings/usage");

  await expect(page.getByTestId("individual-usage-section")).toBeVisible();
  const superContext = await browser.newContext({
    storageState: await publicApi.storageState(),
  });
  const superPage = await superContext.newPage();
  try {
    await superPage.goto(`/super-admin-settings/orgs/${org.orgId}`);
    const toggle = superPage.getByTestId("org-hide-individual-usage");
    await expect(toggle).not.toBeChecked();
    await toggle.click();
    await expect(toggle).toBeChecked();
    await expect
      .poll(async () => (await readUsageConfig(api)).hideIndividualUsage)
      .toBe(true);

    await expect(page.getByTestId("individual-usage-section")).toHaveCount(0, {
      timeout: 10_000,
    });

    expect(
      (await readSuperAdminUsageConfig(publicApi, org.orgId))
        .hideIndividualUsage,
    ).toBe(true);

    const reportQueries: Record<string, string>[] = [
      {},
      { search: org.admin.email, sortBy: "requests" },
      { sortBy: "credits", offset: "0", limit: "1" },
    ];
    for (const params of reportQueries) {
      const denied = await requestIndividualUsage(api, params);
      expect(denied.status()).toBe(403);
      expect(await denied.json()).toMatchObject({
        code: "INDIVIDUAL_USAGE_FORBIDDEN",
      });
    }
    const hiddenLimits = await readIndividualLimits(api);
    expect(hiddenLimits).toContainEqual(
      expect.objectContaining({ userId, monthlyCredits: 5000 }),
    );
    expect(
      hiddenLimits.every((limit) => !Object.hasOwn(limit, "creditsUsed")),
    ).toBe(true);
    const membershipTransitions = [
      () => Promise.resolve(),
      () => removeSuperAdminTeamMember(publicApi, org.orgId, team.id, userId),
      () => addSuperAdminTeamMember(publicApi, org.orgId, team.id, userId),
      async () => {
        await removeSuperAdminTeamLimit(publicApi, org.orgId, team.id);
        await setSuperAdminTeamLimit(publicApi, org.orgId, team.id, 7000);
      },
    ];
    for (const transition of membershipTransitions) {
      await transition();
      const teamLimits = await readTeamLimits(api);
      expect(teamLimits).toContainEqual({
        teamId: team.id,
        name: team.name,
        monthlyCredits: 7000,
        creditsUsed: expect.any(Number),
      });
    }
    expect(await readUsageStats(api)).toEqual(before);
    expect(
      (await readSuperAdminIndividualUsage(publicApi, org.orgId)).data,
    ).toContainEqual(expect.objectContaining({ userId }));
    await superPage.getByTestId("super-admin-org-usage-tab").click();
    await expect(
      superPage.getByTestId("individual-usage-section"),
    ).toBeVisible();
    await superPage
      .getByRole("tab", { name: "Organisation", exact: true })
      .click();
    await page.goto("/admin-settings/credit-limits?tab=users");
    await expect(
      page.getByTestId(`credit-limits-row-${userId}`),
    ).not.toContainText("/");
    await page.goto("/admin-settings/credit-limits?tab=teams");
    await expect(
      page.getByTestId(`credit-limits-row-${team.id}`),
    ).toContainText("/");
    await page.goto(`/admin-settings/teams/${team.id}`);
    await expect(
      page.getByTestId(`credit-limits-team-${team.id}`),
    ).toBeEnabled();
    await expect(
      page.getByTestId(`credit-limits-team-card-${team.id}`),
    ).toContainText("/");
    const requests: string[] = [];
    page.on("request", (request) =>
      requests.push(new URL(request.url()).pathname),
    );
    await page.goto("/admin-settings/usage");
    await expect(page.getByTestId("usage-aggregate-stats")).toBeVisible();
    await expect(page.getByTestId("individual-usage-section")).toHaveCount(0);
    expect(requests).not.toContain("/api/usage/users");
    await page.reload();
    await expect(page.getByTestId("usage-aggregate-stats")).toBeVisible();
    await expect(page.getByTestId("individual-usage-section")).toHaveCount(0);

    for (const data of [
      {},
      { hideIndividualUsage: null },
      { hideIndividualUsage: "false" },
    ]) {
      expect(
        (
          await requestUsageVisibilityChange(publicApi, org.orgId, data)
        ).status(),
      ).toBe(400);
      expect((await readUsageConfig(api)).hideIndividualUsage).toBe(true);
    }
    await toggle.click();
    await expect(toggle).not.toBeChecked();
    expect((await requestIndividualUsage(api)).status()).toBe(200);
    expect(
      (await readSuperAdminUsageConfig(publicApi, org.orgId))
        .hideIndividualUsage,
    ).toBe(false);
    expect(
      (await readIndividualLimits(api))[0].creditsUsed,
    ).toBeGreaterThanOrEqual(0);
    expect((await readTeamLimits(api))[0].creditsUsed).toBeGreaterThanOrEqual(
      0,
    );
    await expect(page.getByTestId("individual-usage-section")).toBeVisible({
      timeout: 10_000,
    });
    await toggle.click();
    await expect(toggle).toBeChecked();
    expect((await requestIndividualUsage(api)).status()).toBe(403);
    await expect(page.getByTestId("individual-usage-section")).toHaveCount(0, {
      timeout: 10_000,
    });
    await superPage.reload();
    await expect(toggle).toBeChecked();
  } finally {
    await superContext.close();
    await requestUsageVisibilityChange(publicApi, org.orgId, {
      hideIndividualUsage: false,
    });
  }
});

test("hiding usage is scoped to one organisation and cannot create missing organisations", async ({
  api,
  publicApi,
  browser,
  org,
}, testInfo) => {
  await login(publicApi, "admin@demo.local", "admin");
  const other = await createOrg(
    `privacy-control-${Date.now()}`,
    testInfo.outputPath("other-org.json"),
  );
  const otherContext = await browser.newContext({
    baseURL: config.apiURL,
    storageState: other.storageState,
  });
  try {
    expect(
      (
        await requestUsageVisibilityChange(publicApi, org.orgId, {
          hideIndividualUsage: true,
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await requestUsageVisibilityChange(publicApi, org.orgId, {
          hideIndividualUsage: true,
        })
      ).status(),
    ).toBe(200);
    expect((await requestIndividualUsage(api)).status()).toBe(403);
    expect(
      (await readUsageConfig(otherContext.request)).hideIndividualUsage,
    ).toBe(false);
    expect((await requestIndividualUsage(otherContext.request)).status()).toBe(
      200,
    );
    expect(
      (
        await requestUsageVisibilityChange(otherContext.request, org.orgId, {
          hideIndividualUsage: false,
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await requestUsageVisibilityChange(
          publicApi,
          "11111111-1111-4111-8111-111111111111",
          { hideIndividualUsage: true },
        )
      ).status(),
    ).toBe(404);
    expect((await getSuperAdminOrg(publicApi, org.orgId)).name).toBe(
      org.orgName,
    );
  } finally {
    await otherContext.close();
    await requestUsageVisibilityChange(publicApi, org.orgId, {
      hideIndividualUsage: false,
    });
  }
});

test("hidden individual usage errors omit numeric consumption while keeping enforcement", async ({
  api,
  publicApi,
  mail,
  org,
}) => {
  const { createCreditLimitsFixture } =
    await import("../../src/factories/credit-limits.factory");
  const { createEmptyThread, sendThreadMessage } =
    await import("../../src/clients/api/threads.client");
  await login(publicApi, "admin@demo.local", "admin");
  const fixture = await createCreditLimitsFixture(
    api,
    publicApi,
    mail,
    `privacy-errors-${Date.now()}`,
  );
  try {
    await addTeamMember(
      api,
      fixture.team.id,
      await getAuthenticatedPrincipalId(api),
    );
    await setTeamLimit(api, fixture.team.id, 0);
    expect(
      (
        await requestUsageVisibilityChange(publicApi, org.orgId, {
          hideIndividualUsage: true,
        })
      ).status(),
    ).toBe(200);
    const thread = await createEmptyThread(api, fixture.model.id);
    const denied = await sendThreadMessage(
      api,
      thread.id,
      "Explain municipal budget planning.",
    );
    const body = await denied.text();
    expect(body).toContain("TEAM_CREDIT_LIMIT_EXCEEDED");
    expect(body).not.toContain("creditsUsed");
    await removeSuperAdminTeamLimit(publicApi, org.orgId, fixture.team.id);
    const allowed = await sendThreadMessage(
      api,
      thread.id,
      "Explain municipal budget planning.",
    );
    expect(await allowed.text()).not.toContain("TEAM_CREDIT_LIMIT_EXCEEDED");
  } finally {
    await requestUsageVisibilityChange(publicApi, org.orgId, {
      hideIndividualUsage: false,
    });
    await fixture.cleanup();
  }
});

test("open credit-limit views observe privacy changes from a separate super admin without reloading", async ({
  page,
  api,
  publicApi,
  org,
}) => {
  test.setTimeout(60_000);
  await login(publicApi, "admin@demo.local", "admin");
  await ensureUsageSubscription(api, publicApi);
  const userId = await getAuthenticatedPrincipalId(api);
  await setIndividualLimit(api, userId, 5000);
  const team = await createTeam(api, `live-privacy-${Date.now()}`);
  await addTeamMember(api, team.id, userId);
  await setTeamLimit(api, team.id, 7000);
  const views = [
    {
      path: "/admin-settings/credit-limits?tab=users",
      testId: `credit-limits-row-${userId}`,
    },
    {
      path: "/admin-settings/credit-limits?tab=teams",
      testId: `credit-limits-row-${team.id}`,
    },
    {
      path: `/admin-settings/teams/${team.id}`,
      testId: `credit-limits-team-card-${team.id}`,
    },
  ];
  try {
    for (const view of views) {
      await page.goto(view.path);
      const row = page.getByTestId(view.testId);
      await expect(row).toContainText("/");
      expect(
        (
          await requestUsageVisibilityChange(publicApi, org.orgId, {
            hideIndividualUsage: true,
          })
        ).status(),
      ).toBe(200);
      if (view.path.endsWith("tab=users")) {
        await expect(row).not.toContainText("/", { timeout: 10_000 });
      } else {
        await expect(row).toContainText("/");
      }
      expect(
        (
          await requestUsageVisibilityChange(publicApi, org.orgId, {
            hideIndividualUsage: false,
          })
        ).status(),
      ).toBe(200);
      await expect(row).toContainText("/", { timeout: 10_000 });
    }
  } finally {
    await requestUsageVisibilityChange(publicApi, org.orgId, {
      hideIndividualUsage: false,
    });
  }
});

test("org admins retain team management with hidden individual usage", async ({
  api,
  publicApi,
  mail,
  org,
  page,
}) => {
  const { createCreditLimitsFixture } =
    await import("../../src/factories/credit-limits.factory");
  const { listTeamMembers, deleteTeam } =
    await import("../../src/clients/api/teams.client");
  const { deleteCreditLimitMember } =
    await import("../../src/clients/api/credit-limits.client");
  await login(publicApi, "admin@demo.local", "admin");
  const fixture = await createCreditLimitsFixture(
    api,
    publicApi,
    mail,
    `team-privacy-${Date.now()}`,
  );
  let cleaned = false;
  try {
    // A separate ordinary member cannot manage the team's credit limit.
    expect(
      (
        await fixture.member.api.put(
          `${config.apiURL}/api/credit-limits/teams/${fixture.team.id}`,
          {
            data: { monthlyCredits: 5000 },
          },
        )
      ).status(),
    ).toBe(403);
    await requestUsageVisibilityChange(publicApi, org.orgId, {
      hideIndividualUsage: true,
    });
    await page.goto(`/admin-settings/teams/${fixture.team.id}`);
    await expect(page.getByTestId("team-members-add")).toBeEnabled();
    await expect(
      page.getByTestId(`team-member-remove-${fixture.member.id}`),
    ).toBeEnabled();
    await page.getByTestId(`credit-limits-team-${fixture.team.id}`).click();
    await expect(page.getByTestId("credit-limit-dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await setTeamLimit(api, fixture.team.id, 5000);
    expect(await readTeamLimits(api)).toContainEqual(
      expect.objectContaining({
        teamId: fixture.team.id,
        monthlyCredits: 5000,
        creditsUsed: expect.any(Number),
      }),
    );
    await removeTeamLimit(api, fixture.team.id);
    await removeTeamLimit(api, fixture.team.id);
    expect(await readTeamLimits(api)).not.toContainEqual(
      expect.objectContaining({ teamId: fixture.team.id }),
    );
    await setTeamLimit(api, fixture.team.id, 7000);
    expect(await readTeamLimits(api)).toContainEqual(
      expect.objectContaining({
        teamId: fixture.team.id,
        monthlyCredits: 7000,
      }),
    );
    await removeTeamMember(api, fixture.team.id, fixture.member.id);
    expect((await listTeamMembers(api, fixture.team.id)).data).toHaveLength(0);
    await bulkAddTeamMembers(api, fixture.team.id, [fixture.member.id, fixture.member.id]);
    expect((await listTeamMembers(api, fixture.team.id)).data).toHaveLength(1);
    await removeTeamMember(api, fixture.team.id, fixture.member.id);
    await addTeamMember(api, fixture.team.id, fixture.member.id);
    expect((await listTeamMembers(api, fixture.team.id)).data).toContainEqual(
      expect.objectContaining({ userId: fixture.member.id }),
    );
    expect((await requestIndividualUsage(api)).status()).toBe(403);
    // The privacy toggle never grants ordinary members administrative access.
    expect(
      (
        await fixture.member.api.put(
          `${config.apiURL}/api/credit-limits/teams/${fixture.team.id}`,
          {
            data: { monthlyCredits: 5000 },
          },
        )
      ).status(),
    ).toBe(403);
    await deleteCreditLimitMember(api, fixture.member.id);
    expect((await listTeamMembers(api, fixture.team.id)).data).toHaveLength(0);
    await deleteTeam(api, fixture.team.id);
    cleaned = true;
  } finally {
    await requestUsageVisibilityChange(publicApi, org.orgId, {
      hideIndividualUsage: false,
    });
    if (cleaned) await fixture.member.api.dispose();
    else await fixture.cleanup();
  }
});

test("hidden individual usage accepts admin team invitations created before and after hiding usage", async ({
  api,
  publicApi,
  mail,
  org,
}) => {
  const { request } = await import("@playwright/test");
  const { bulkInviteUser } =
    await import("../../src/clients/api/invites.client");
  const { findUserByEmail } =
    await import("../../src/clients/api/users.client");
  const { listTeamMembers, deleteTeam } =
    await import("../../src/clients/api/teams.client");
  const { deleteCreditLimitMember } =
    await import("../../src/clients/api/credit-limits.client");
  await login(publicApi, "admin@demo.local", "admin");
  const team = await createTeam(api, `Invite privacy ${Date.now()}`);
  const adminEmail = `privacy-admin-grant-${Date.now()}@e2e.local`;
  const superEmail = `privacy-super-grant-${Date.now()}@e2e.local`;
  const anonymous = await request.newContext({ baseURL: config.apiURL });
  try {
    await bulkInviteUser(api, adminEmail, [team.name]);
    const adminToken = await mail.extractLinkToken(
      adminEmail,
      "/accept-invite",
    );
    await requestUsageVisibilityChange(publicApi, org.orgId, {
      hideIndividualUsage: true,
    });
    const submit = (inviteToken: string) =>
      anonymous.post(`${config.apiURL}/api/invites/accept`, {
        data: {
          inviteToken,
          userName: "Invited Member",
          password: "E2e-Password-1",
          hasAcceptedMarketing: false,
        },
      });
    expect((await submit(adminToken)).ok()).toBe(true);
    const adminUser = await findUserByEmail(api, adminEmail);
    expect((await listTeamMembers(api, team.id)).data).toContainEqual(
      expect.objectContaining({ userId: adminUser?.id }),
    );
    await bulkInviteUser(api, superEmail, [team.name]);
    const superToken = await mail.extractLinkToken(
      superEmail,
      "/accept-invite",
    );
    expect((await submit(superToken)).ok()).toBe(true);
    const superUser = await findUserByEmail(api, superEmail);
    expect((await listTeamMembers(api, team.id)).data).toContainEqual(
      expect.objectContaining({ userId: superUser?.id }),
    );
    await requestUsageVisibilityChange(publicApi, org.orgId, {
      hideIndividualUsage: false,
    });
    expect((await listTeamMembers(api, team.id)).data).toHaveLength(2);
  } finally {
    await requestUsageVisibilityChange(publicApi, org.orgId, {
      hideIndividualUsage: false,
    });
    await deleteTeam(api, team.id);
    const users = await Promise.all(
      [adminEmail, superEmail].map((email) => findUserByEmail(api, email)),
    );
    await Promise.all(
      users
        .filter((user) => user !== undefined)
        .map((user) => deleteCreditLimitMember(api, user.id)),
    );
    await anonymous.dispose();
  }
});
