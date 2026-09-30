import { request as apiRequest } from "@playwright/test";
import { getCurrentUser, login } from "../../src/clients/api/auth.client";
import {
  acceptInvite,
} from "../../src/clients/api/invites.client";
import {
  createTeam,
  deleteTeam,
  listMyTeams,
  listTeamMembers,
} from "../../src/clients/api/teams.client";
import { config } from "../../src/config";
import { test, expect } from "../../src/fixtures/test";
import type { MailcatcherClient } from "../../src/clients/mailcatcher.client";
import { dismissWelcomeVideo } from "../../src/clients/api/onboarding.client";

test.use({ storageState: { cookies: [], origins: [] } });

test("admin CSV import assigns an invited user to multiple teams", async ({
  page,
  publicApi,
  mail,
}) => {
  const suffix = Date.now().toString();
  await login(publicApi, "admin@usage.local", "admin");
  await dismissWelcomeVideo(publicApi);
  await page.context().addCookies((await publicApi.storageState()).cookies);
  const teams = await Promise.all([
    createTeam(publicApi, `Research ${suffix}`),
    createTeam(publicApi, `Operations ${suffix}`),
  ]);
  const email = `e2e-bulk-admin-${suffix}@e2e.local`;

  try {
    await page.goto("/admin-settings/users");
    await page.getByTestId("invite-menu-trigger").click();
    await page.getByTestId("bulk-invite-menu-item").click();
    await page.getByTestId("bulk-invite-file-input").setInputFiles({
      name: "users.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        `email,role,teams\n${email},user,${teams[0].name}|${teams[1].name}`,
      ),
    });

    await expect(
      page.getByRole("cell", { name: `${teams[0].name}, ${teams[1].name}` }),
    ).toBeVisible();
    const response = page.waitForResponse(
      (candidate) =>
        candidate.request().method() === "POST" &&
        new URL(candidate.url()).pathname === "/api/invites/bulk",
    );
    await page.getByTestId("bulk-invite-submit").click();
    expect((await response).status()).toBe(201);

    for (const team of teams) {
      const members = await listTeamMembers(publicApi, team.id);
      expect(members.data.map((member) => member.userEmail)).not.toContain(
        email,
      );
    }
    const recipientApi = await acceptImportedUser(mail, email);
    const recipientTeams = await listMyTeams(recipientApi);
    expect(recipientTeams.map((team) => team.id)).toEqual(
      expect.arrayContaining(teams.map((team) => team.id)),
    );
    await recipientApi.dispose();
    for (const team of teams) {
      const members = await listTeamMembers(publicApi, team.id);
      expect(members.data.map((member) => member.userEmail)).toContain(email);
    }
  } finally {
    await Promise.all(teams.map((team) => deleteTeam(publicApi, team.id)));
  }
});

test("CSV team preview remains usable across responsive breakpoints", async (
  { page, publicApi },
  testInfo,
) => {
  const suffix = Date.now().toString();
  await login(publicApi, "admin@usage.local", "admin");
  await dismissWelcomeVideo(publicApi);
  await page.context().addCookies((await publicApi.storageState()).cookies);
  const team = await createTeam(publicApi, `Responsive Team ${suffix}`);

  try {
    await page.goto("/admin-settings/users");
    await page.getByTestId("invite-menu-trigger").click();
    await page.getByTestId("bulk-invite-menu-item").click();
    await page.getByTestId("bulk-invite-file-input").setInputFiles({
      name: "users.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        `email,role,teams\nresponsive-${suffix}@e2e.local,user,${team.name}`,
      ),
    });

    for (const [name, width] of [
      ["mobile", 375],
      ["tablet", 768],
      ["desktop", 1280],
    ] as const) {
      await page.setViewportSize({ width, height: 900 });
      const dialog = page.getByTestId("bulk-invite-dialog");
      await expect(dialog).toBeVisible();
      await expect
        .poll(() =>
          dialog.evaluate((element) =>
            element
              .getAnimations()
              .every((animation) => animation.playState === "finished"),
          ),
        )
        .toBe(true);
      const dialogBox = await dialog.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          x: rect.x,
          width: rect.width,
          cssWidth: style.width,
          maxWidth: style.maxWidth,
          minWidth: style.minWidth,
        };
      });
      expect(dialogBox.x, JSON.stringify(dialogBox)).toBeGreaterThanOrEqual(0);
      expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(width);
      const horizontalOverflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(horizontalOverflow).toBeLessThanOrEqual(1);
      await page.screenshot({
        path: testInfo.outputPath(`bulk-preview-${name}.png`),
        fullPage: true,
      });
    }
  } finally {
    await deleteTeam(publicApi, team.id);
  }
});

test("an unknown team identifies the failing CSV row", async ({
  page,
  publicApi,
}) => {
  const suffix = Date.now().toString();
  const unknownTeam = `Unknown Team ${suffix}`;
  await login(publicApi, "admin@usage.local", "admin");
  await dismissWelcomeVideo(publicApi);
  await page.context().addCookies((await publicApi.storageState()).cookies);
  await page.goto("/admin-settings/users");
  await page.getByTestId("invite-menu-trigger").click();
  await page.getByTestId("bulk-invite-menu-item").click();
  await page.getByTestId("bulk-invite-file-input").setInputFiles({
    name: "users.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      `email,role,teams\nunknown-${suffix}@e2e.local,user,${unknownTeam}`,
    ),
  });
  const response = page.waitForResponse(
    (candidate) =>
      candidate.request().method() === "POST" &&
      new URL(candidate.url()).pathname === "/api/invites/bulk",
  );

  await page.getByTestId("bulk-invite-submit").click();

  expect((await response).status()).toBe(400);
  await expect(page.getByTestId("bulk-invite-server-error-2")).toHaveText(
    `Nicht gefundene Teams: ${unknownTeam}`,
  );
  await expect(page.getByTestId("bulk-invite-submit")).toBeDisabled();
});

test("super admin bulk import assigns teams in the selected organization", async (
  { page, publicApi, mail },
  testInfo,
) => {
  const suffix = Date.now().toString();
  const orgAdminApi = await apiRequest.newContext({ baseURL: config.apiURL });
  await login(orgAdminApi, "admin@usage.local", "admin");
  const team = await createTeam(orgAdminApi, `Super Admin Import ${suffix}`);
  const email = `e2e-bulk-super-admin-${suffix}@e2e.local`;
  const orgId = (await getCurrentUser(orgAdminApi)).orgId;

  try {
    await login(publicApi, "admin@demo.local", "admin");
    await dismissWelcomeVideo(publicApi);
    await page.context().addCookies((await publicApi.storageState()).cookies);
    await page.goto(`/super-admin-settings/orgs/${orgId}?tab=users`);
    await page.getByTestId("super-admin-bulk-invite").click();
    await page.getByTestId("bulk-invite-file-input").setInputFiles({
      name: "users.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        `email,role,teams\n${email},user,${team.name}`,
      ),
    });
    const response = page.waitForResponse(
      (candidate) =>
        candidate.request().method() === "POST" &&
        new URL(candidate.url()).pathname ===
          `/api/super-admin/orgs/${orgId}/invites/bulk`,
    );
    await page.getByTestId("bulk-invite-submit").click();
    expect((await response).status()).toBe(201);
    await expect(
      page.locator('[data-sonner-toast][data-type="success"]'),
    ).toHaveText("1 Einladung erfolgreich erstellt!");
    await page
      .getByTestId("bulk-invite-dialog")
      .getByRole("button", { name: "Close" })
      .click();
    await expect(page.getByTestId("bulk-invite-dialog")).toBeHidden();
    await expect(
      page.getByTestId(/super-admin-invite-row-/).filter({ hasText: email }),
    ).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 1100 });
    await page.getByTestId("super-admin-invites-section").evaluate((element) => {
      let ancestor = element.parentElement;
      while (ancestor) {
        ancestor.scrollTop = 0;
        ancestor = ancestor.parentElement;
      }
    });
    await page.screenshot({
      path: testInfo.outputPath("super-admin-invitations-list.png"),
      fullPage: true,
    });

    const recipientApi = await acceptImportedUser(mail, email);
    const recipientTeams = await listMyTeams(recipientApi);
    expect(recipientTeams.map((item) => item.id)).toContain(team.id);
    await recipientApi.dispose();

    const members = await listTeamMembers(orgAdminApi, team.id);
    expect(members.data.map((member) => member.userEmail)).toContain(email);
  } finally {
    await deleteTeam(orgAdminApi, team.id);
    await orgAdminApi.dispose();
  }
});

async function acceptImportedUser(
  mail: MailcatcherClient,
  email: string,
): Promise<Awaited<ReturnType<typeof apiRequest.newContext>>> {
  const recipientApi = await apiRequest.newContext({ baseURL: config.apiURL });
  const inviteToken = await mail.extractLinkToken(email, "/accept-invite");
  await acceptInvite(recipientApi, {
    inviteToken,
    userName: "E2E Bulk Import",
    password: "E2e-Password-1",
    hasAcceptedMarketing: false,
  });
  await login(recipientApi, email, "E2e-Password-1");
  return recipientApi;
}
