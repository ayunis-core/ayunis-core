import type { Page } from "@playwright/test";
import {
  stubOfficeHost,
  type OfficeStubReadItem,
  type OfficeStubWindow,
} from "../../src/clients/office-host-stub";
import { expect, test } from "../../src/fixtures/outlook";
import { sendMessage } from "../../src/flows/chat.flow";
import { openSignedInPane } from "../../src/flows/outlook.flow";

const subject = "Review fixture budget";
const readItem: OfficeStubReadItem = {
  itemId: "review-email",
  internetMessageId: "<review-email@e2e.local>",
  subject,
  body: "The city budget is attached.",
  from: { displayName: "Alice", emailAddress: "alice@e2e.local" },
};

const secondReadItem: OfficeStubReadItem = {
  ...readItem,
  itemId: "second-review-email",
  internetMessageId: "<second-review-email@e2e.local>",
  subject: "Second review fixture email",
};

function selectEmail(page: Page, item: OfficeStubReadItem) {
  return page.evaluate((nextItem) => {
    (window as unknown as OfficeStubWindow).__officeStub.selectItem(nextItem);
  }, item);
}

test.use({ storageState: { cookies: [], origins: [] } });

test.beforeEach(async ({ page }) => {
  await stubOfficeHost(page, { readItem });
});

async function reopenLatestThread(page: Page, prompt: string): Promise<void> {
  await page.getByTestId("chat-header-new-chat").click();
  await page.getByTestId("embedded-history").click();
  await page.getByTestId("chat-card").first().click();
  await expect(page.getByTestId("outlook-conversation")).toBeVisible();
  await expect(page.getByTestId("user-message").first()).toHaveText(prompt);
  await expect(page.getByTestId("input")).toBeVisible();
}

test("posts the email read result when the thread remounts before the run finishes", async ({
  page,
  api,
}) => {
  await openSignedInPane(page, api);
  const prompt = "Open a thread for the read test";
  await sendMessage(page, prompt);
  await expect(page.getByTestId("assistant-message").last()).toBeVisible();
  let allowRun!: () => void;
  const release = new Promise<void>((resolve) => {
    allowRun = resolve;
  });
  let calls = 0;
  await page.route("**/api/runs/send-message", async (route) => {
    calls += 1;
    if (calls === 1) await release;
    await route.continue();
  });
  try {
    await sendMessage(page, "Summarize this email.");
    await expect.poll(() => calls).toBe(1);
    await reopenLatestThread(page, prompt);
    // A sent message leaves the composer at once and waits as pending.
    await expect(page.getByTestId("input")).toHaveValue("");
    await expect(page.getByTestId("pending-user-message")).toContainText(
      "Summarize this email.",
    );
  } finally {
    allowRun();
  }
  await expect(page.getByTestId("assistant-message").last()).toContainText(
    `outlook-summary::${subject}`,
  );
  await expect(page.getByTestId("input")).toHaveValue("");
  expect(calls).toBe(2);
});

test("keeps an unsent thread draft when opening history and returning", async ({
  page,
  api,
}) => {
  await openSignedInPane(page, api);
  const prompt = "Open a thread for the draft test";
  await sendMessage(page, prompt);
  await expect(page.getByTestId("assistant-message").last()).toBeVisible();
  const draft = "unsent existing thread draft";
  await page.getByTestId("input").fill(draft);
  await reopenLatestThread(page, prompt);
  await expect(page.getByTestId("input")).toHaveValue(draft);
});

test("preserves the new-chat draft when returning from history and keeps it scoped to its email", async ({
  page,
  api,
}) => {
  await openSignedInPane(page, api);
  const input = page.getByTestId("input");
  const draft = "Private notes for the first fixture email";
  await input.fill(draft);
  await page.getByTestId("embedded-history").click();
  await page.getByTestId("embedded-back-to-start").click();
  await expect(input).toHaveValue(draft);

  await selectEmail(page, secondReadItem);
  await expect(input).toHaveValue("");
  await page.getByTestId("embedded-history").click();
  await page.getByTestId("embedded-back-to-start").click();
  await expect(input).toHaveValue("");

  await selectEmail(page, readItem);
  await expect(input).toHaveValue(draft);
});
