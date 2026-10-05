import type { APIRequestContext, Page } from "@playwright/test";
import { test, expect } from "../../src/fixtures/test";
import { generatedApi } from "../../src/clients/api/generated-api";
import { CreateSkillDtoOwnerType } from "../../src/clients/generated/ayunisCoreAPI.schemas";
import { createOcrRejectedPdf } from "../../src/factories/pdf.factory";
import { sendMessage } from "../../src/flows/chat.flow";

const INVOICE = "Invoice 2026-1059: total EUR 119.00";
const INSTRUCTIONS =
  "AYC-1059: Extract invoice totals from the attached documents.";

test("recovers OCR-rejected PDFs and can replace a failed upload in the same skill chat", async ({
  api,
  page,
}) => {
  test.setTimeout(60_000);
  await permitEmbeddingModel(api);
  const skill = await generatedApi.skillsControllerCreate(
    {
      ownerType: CreateSkillDtoOwnerType.personal,
      name: `Invoice extractor ${Date.now()}`,
      shortDescription: "Extract invoice data.",
      instructions: INSTRUCTIONS,
      isActive: true,
    },
    { api },
  );
  await generatedApi.skillsControllerPin(skill.id, { isPinned: true }, { api });
  await page.goto("/chat");
  await page.getByTestId(`pinned-skill-${skill.id}`).click();
  await sendMessage(page, "Keep this conversation for invoice processing.");
  await expect(page.getByTestId("assistant-message").last()).toBeVisible();
  await expect(page).toHaveURL(/\/chats\/[0-9a-f-]+/);
  const threadId = new URL(page.url()).pathname.split("/").at(-1)!;
  const initial = await generatedApi.threadsControllerFindOne(threadId, {
    api,
  });
  expect(JSON.stringify(initial.messages)).toContain(INSTRUCTIONS);

  await uploadPdf(page, "invoice.pdf", INVOICE);
  await expect(page.getByTestId("chat-source")).toHaveAttribute(
    "data-source-status",
    "ready",
    { timeout: 30_000 },
  );
  await uploadPdf(page, "invoice.pdf", INVOICE, 2);
  await expect(page.getByTestId("chat-source")).toHaveCount(3);
  await expect(
    page
      .getByTestId("chat-source")
      .and(page.locator('[data-source-status="ready"]')),
  ).toHaveCount(3, { timeout: 30_000 });

  await uploadPdf(page, "unreadable.pdf", "");
  const failed = page
    .getByTestId("chat-source")
    .filter({ hasText: "unreadable.pdf" });
  await expect(failed).toHaveAttribute("data-source-status", "failed", {
    timeout: 30_000,
  });
  const failedThread = await generatedApi.threadsControllerFindOne(threadId, {
    api,
  });
  const failedSource = failedThread.sources.find(
    (source) => source.name === "unreadable.pdf",
  );
  expect(failedSource?.processingErrorCode).toBe("DOCUMENT_UNREADABLE");
  expect(failedSource?.processingError).toBe("Source processing failed");
  await page.reload();
  await expect(failed).toHaveAttribute("data-source-status", "failed");
  await page.mouse.move(0, 0);
  await failed.focus();
  await expect(
    page.getByRole("tooltip", {
      name: /Diese Datei konnte nicht gelesen werden/,
    }),
  ).toContainText("laden Sie sie erneut hoch");
  await page.screenshot({
    path: test.info().outputPath("localized-pdf-failure.png"),
    animations: "disabled",
  });
  await failed.getByTestId("chat-source-remove").click();
  await expect(page.getByTestId("chat-source")).toHaveCount(3);

  await uploadPdf(page, "replacement.pdf", INVOICE);
  await expect(page.getByTestId("chat-source")).toHaveCount(4);
  await expect(
    page.getByTestId("chat-source").filter({ hasText: "replacement.pdf" }),
  ).toHaveAttribute("data-source-status", "ready", { timeout: 30_000 });
  await expect(page).toHaveURL(new RegExp(`/chats/${threadId}$`));
  const final = await generatedApi.threadsControllerFindOne(threadId, { api });
  expect(JSON.stringify(final.messages)).toContain(INSTRUCTIONS);
  expect(final.sources.map((source) => source.status)).toEqual([
    "ready",
    "ready",
    "ready",
    "ready",
  ]);

  expect(final.sources.every((source) => !source.processingErrorCode)).toBe(
    true,
  );

  await sendMessage(page, "E2E cite first source");
  const citation = page.getByTestId("source-citation").last();
  await expect(citation).toBeVisible();
  await citation.click();
  await expect(page.getByTestId("source-citation-excerpt")).toContainText(
    INVOICE,
  );
});

async function permitEmbeddingModel(api: APIRequestContext): Promise<void> {
  const models = await generatedApi.modelsControllerGetAvailableEmbeddingModels(
    { api },
  );
  const model = models[0];
  if (!model) throw new Error("No embedding model is available");
  if (!model.permittedModelId) {
    await generatedApi.modelsControllerCreatePermittedModel(
      { modelId: model.modelId },
      { api },
    );
  }
}

async function uploadPdf(
  page: Page,
  name: string,
  text: string,
  copies = 1,
): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Hinzufügen", exact: true }).click();
  await page.getByRole("menuitem").first().click();
  await (
    await chooser
  ).setFiles(
    Array.from({ length: copies }, () => ({
      name,
      mimeType: "application/pdf",
      buffer: createOcrRejectedPdf(text),
    })),
  );
  await expect(page.getByRole("menu")).toBeHidden();
}
