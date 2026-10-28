import { test, expect } from "../../src/fixtures/test";
import { editUploadedPhoto, generatedImage } from "../../src/flows/chat.flow";

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

test("displays an edited mobile photo, opens its preview and retains it after reload", async ({
  page,
  api,
}) => {
  await editUploadedPhoto(page, api);

  const image = generatedImage(page);
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
