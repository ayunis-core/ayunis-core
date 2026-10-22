import { fileURLToPath } from "node:url";
import { test, expect } from "../../src/fixtures/test";
import { generatedApi } from "../../src/clients/api/generated-api";
import { getConfiguredImageCandidates } from "../../src/clients/api/models.client";
import { sendMessage } from "../../src/flows/chat.flow";

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

test("displays an edited mobile photo, opens its preview and retains it after reload", async ({
  page,
  api,
}) => {
  const model = (await getConfiguredImageCandidates(api))[0];
  expect(model).toBeDefined();
  await generatedApi.modelsControllerCreatePermittedModel(
    { modelId: model.modelId },
    { api },
  );
  await page.goto("/chat");
  await page.getByRole("button", { name: /^(Add|Hinzufügen)$/ }).click();
  const chooserEvent = page.waitForEvent("filechooser");
  await page
    .getByRole("menuitem", {
      name: /Upload File or Image|Datei oder Bild hochladen/,
    })
    .click();
  const chooser = await chooserEvent;
  await chooser.setFiles(
    fileURLToPath(
      new URL(
        "../../../ayunis-core-backend/src/domain/models/infrastructure/image-generation/fixtures/mobile-hdr.jpg",
        import.meta.url,
      ),
    ),
  );
  await sendMessage(page, "E2E edit uploaded image");

  const image = page.getByRole("img", {
    name: "Coloring page from mobile photo",
    exact: true,
  });
  await expect(image).toBeVisible();
  await expect
    .poll(() =>
      image.evaluate((element: HTMLImageElement) => element.naturalWidth),
    )
    .toBeGreaterThan(0);
  await expect(page.getByTestId("input")).toHaveValue("");
  await image.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("img")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(image).toBeVisible();
  await expect
    .poll(() =>
      image.evaluate((element: HTMLImageElement) => element.naturalWidth),
    )
    .toBeGreaterThan(0);
});
