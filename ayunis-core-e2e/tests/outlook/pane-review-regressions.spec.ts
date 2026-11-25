import type { APIRequestContext, Page } from "@playwright/test";
import {
  stubOfficeHost,
  type OfficeStubReadItem,
  type OfficeStubWindow,
} from "../../src/clients/office-host-stub";
import { expect, test } from "../../src/fixtures/outlook";
import { sendMessage } from "../../src/flows/chat.flow";
import { openSignedInPane } from "../../src/flows/outlook.flow";
import { generatedApi } from "../../src/clients/api/generated-api";
import type { GetThreadResponseDto } from "../../src/clients/generated/ayunisCoreAPI.schemas";

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

test.beforeEach(async ({ page, api }) => {
  await stubOfficeHost(page, { readItem });
  await openSignedInPane(page, api);
});

async function reopenLatestThread(page: Page, prompt: string): Promise<void> {
  await page.getByTestId("embedded-history").click();
  await page.getByTestId("chat-card").first().click();
  await expect(page.getByTestId("outlook-conversation")).toBeVisible();
  await expect(page.getByTestId("user-message").first()).toHaveText(prompt);
  await expect(page.getByTestId("input")).toBeVisible();
}

test("posts the email read result when the thread remounts before the run finishes", async ({
  page,
}) => {
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
    await expect(page.getByTestId("input")).toHaveValue(
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
}) => {
  const prompt = "Open a thread for the draft test";
  await sendMessage(page, prompt);
  await expect(page.getByTestId("assistant-message").last()).toBeVisible();
  const draft = "unsent existing thread draft";
  await page.getByTestId("input").fill(draft);
  await reopenLatestThread(page, prompt);
  await expect(page.getByTestId("input")).toHaveValue(draft);
});

test("keeps the first email’s unsent draft out of another email’s new chat", async ({
  page,
}) => {
  const input = page.getByTestId("input");
  const draft = "Private notes for the first fixture email";
  await input.fill(draft);

  await selectEmail(page, secondReadItem);
  await expect(input).toHaveValue("");
  await page.getByTestId("embedded-new-chat").click();
  await expect(input).toHaveValue("");

  await selectEmail(page, readItem);
  await expect(input).toHaveValue(draft);
});

test("stops a first send and lets a retry finish on its original email", async ({
  page,
  api,
}) => {
  await permitEmbeddingModel(api);
  let processingPolls = 0;
  let holdProcessing = true;
  await page.route(
    (url) => /\/api\/threads\/[0-9a-f-]{36}$/.test(url.pathname),
    async (route) => {
      if (!holdProcessing || route.request().method() !== "GET")
        return route.continue();
      const response = await route.fetch();
      if (!response.ok()) return route.fulfill({ response });
      const thread = (await response.json()) as GetThreadResponseDto;
      if (!thread.sources.length) return route.fulfill({ response });
      processingPolls += 1;
      await route.fulfill({
        response,
        json: {
          ...thread,
          sources: thread.sources.map((source) => ({
            ...source,
            status: "processing",
          })),
        },
      });
    },
  );
  const runRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/api/runs/send-message")) {
      runRequests.push(request.postData() ?? "");
    }
  });
  await attachReviewSource(page);
  await sendMessage(page, "Read the attachment");
  await expect.poll(() => processingPolls).toBeGreaterThan(0);
  await page.getByTestId("stop").click();
  await expect(page.getByTestId("input")).toHaveValue("Read the attachment");
  await expect(page.getByTestId("send")).toBeEnabled();

  const pollsAfterStop = processingPolls;
  await sendMessage(page, "This send is stopped by History");
  await expect.poll(() => processingPolls).toBeGreaterThan(pollsAfterStop);
  await page.getByTestId("embedded-history").click();
  await expect(page.getByTestId("chat-card").first()).toBeVisible();
  await selectEmail(page, secondReadItem);
  await expect(page.getByTestId("input")).toHaveValue("");
  await selectEmail(page, readItem);
  await expect(page.getByTestId("input")).toHaveValue(
    "This send is stopped by History",
  );
  await expect(page.getByTestId("send")).toBeEnabled();
  await attachReviewSource(page);

  const pollsAfterHistory = processingPolls;
  await sendMessage(page, "Retry the attachment");
  await expect.poll(() => processingPolls).toBeGreaterThan(pollsAfterHistory);
  await selectEmail(page, secondReadItem);
  await expect(page.getByTestId("stop")).toBeHidden();
  await expect(page.getByTestId("input")).toHaveValue("");
  await sendMessage(page, "A separate new chat");
  await expect(page.getByTestId("assistant-message").last()).toBeVisible();
  expect(runRequests).toHaveLength(1);
  expect(runRequests[0]).toContain("A separate new chat");

  holdProcessing = false;
  await expect.poll(() => runRequests).toHaveLength(2);
  expect(runRequests[1]).toContain("Retry the attachment");
  await expect(page.getByTestId("user-message")).toHaveText(
    "A separate new chat",
  );
  await selectEmail(page, readItem);
  await expect(page.getByTestId("user-message")).toHaveText(
    "Retry the attachment",
  );
  expect(runRequests).toHaveLength(2);
});

async function attachReviewSource(page: Page): Promise<void> {
  await page.getByTestId("chat-attach-files").setInputFiles({
    name: "review-source.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Budget information for review"),
  });
}

async function permitEmbeddingModel(api: APIRequestContext): Promise<void> {
  const [embedding] =
    await generatedApi.modelsControllerGetAvailableEmbeddingModels({ api });
  if (embedding && !embedding.permittedModelId) {
    await generatedApi.modelsControllerCreatePermittedModel(
      { modelId: embedding.modelId },
      { api },
    );
  }
}
