import { randomUUID } from "node:crypto";
import type { BrowserContext } from "@playwright/test";
import {
  getPiiWhitelist,
  setPiiWhitelist,
} from "../../src/clients/api/anonymization-settings.client";
import { login } from "../../src/clients/api/auth.client";
import { promoteToAdmin } from "../../src/clients/api/users.client";
import { createApiContext } from "../../src/factories/api-context.factory";
import { createOrg } from "../../src/factories/org.factory";
import { createMemberSession } from "../../src/factories/user.factory";
import { sendMessage } from "../../src/flows/chat.flow";
import { test, expect } from "../../src/fixtures/test";

const emptySession = { cookies: [], origins: [] };

function exceptionTrigger(word: string): string {
  return `E2E anonymization exception: ${JSON.stringify({
    category: "location",
    word,
  })}`;
}

test("adds the exception an admin confirms to the org whitelist, keeping the other rules", async ({
  api,
  page,
}) => {
  const word = `Bayern${randomUUID().slice(0, 8)}`;
  // The worker org is shared with other specs, so its whitelist is restored.
  const original = await getPiiWhitelist(api);
  try {
    await setPiiWhitelist(api, [
      { category: "location", pattern: "Marl" },
      { category: "email_address", pattern: null },
    ]);
    await page.goto("/chat");
    await sendMessage(page, exceptionTrigger(word));

    const widget = page.getByTestId("anonymization-exception-widget");
    await expect(widget.getByTestId("anonymization-exception-word")).toHaveText(
      word,
    );
    await expect(
      widget.getByTestId("anonymization-exception-previous"),
    ).toHaveText("Marl");
    await expect(widget.getByTestId("anonymization-exception-new")).toHaveText(
      `Marl|${word}`,
    );
    expect(await getPiiWhitelist(api)).toEqual([
      { category: "location", pattern: "Marl" },
      { category: "email_address", pattern: null },
    ]);

    await widget.getByTestId("anonymization-exception-save").click();

    await expect
      .poll(async () =>
        (await getPiiWhitelist(api)).sort((a, b) =>
          a.category.localeCompare(b.category),
        ),
      )
      .toEqual([
        { category: "email_address", pattern: null },
        { category: "location", pattern: `Marl|${word}` },
      ]);
    await page.reload();
    await expect(widget.getByTestId("anonymization-exception-saved")).toBeVisible();
    await expect(widget.getByTestId("anonymization-exception-save")).toHaveCount(
      0,
    );
  } finally {
    await setPiiWhitelist(api, original);
  }
});

// Promotes a member of its own organization, so it cannot affect the worker
// organization other specs share.
test("offers the exception card only to org admins", async ({
  browser,
  mail,
}) => {
  test.setTimeout(120_000);
  const key = randomUUID().slice(0, 8);
  const org = await createOrg(
    `anonymization-exception-${key}`,
    test.info().outputPath("anonymization-exception-org.json"),
  );
  const adminApi = await createApiContext(emptySession);
  await login(adminApi, org.admin.email, org.admin.password);
  const { member, api: memberApi } = await createMemberSession(
    adminApi,
    mail,
    `anonymization-exception-${key}`,
  );
  const contexts: BrowserContext[] = [];
  try {
    const memberContext = await browser.newContext({
      storageState: await memberApi.storageState(),
    });
    contexts.push(memberContext);
    const memberPage = await memberContext.newPage();

    await memberPage.goto("/chat");
    await sendMessage(memberPage, exceptionTrigger(`Bayern${key}`));
    // The mock's default reply names the model; it answers so only without the tool.
    await expect(
      memberPage.getByTestId("assistant-message").last(),
    ).toContainText("::");
    await expect(
      memberPage.getByTestId("anonymization-exception-widget"),
    ).toHaveCount(0);

    await promoteToAdmin(adminApi, member.id);
    await login(memberApi, member.email, member.password);
    const promotedContext = await browser.newContext({
      storageState: await memberApi.storageState(),
    });
    contexts.push(promotedContext);
    const promotedPage = await promotedContext.newPage();

    await promotedPage.goto("/chat");
    await sendMessage(promotedPage, exceptionTrigger(`Bayern${key}`));
    await expect(
      promotedPage.getByTestId("anonymization-exception-save"),
    ).toBeVisible();
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
    await memberApi.dispose();
    await adminApi.dispose();
  }
});
