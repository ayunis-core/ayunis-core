import { test, expect } from "../../src/fixtures/test";
import { createLargePng } from "../../src/factories/png.factory";
import { sendMessage } from "../../src/flows/chat.flow";

const PROVIDER_IMAGE_CEILING_BYTES = 3_932_160;

test("sends a phone-sized photo and stores it downscaled", async ({ page }) => {
  const photo = createLargePng(3000, 2000, 8 * 1024 * 1024);
  expect(photo.length).toBeGreaterThan(PROVIDER_IMAGE_CEILING_BYTES);

  await page.goto("/chat");
  await page.getByRole("button", { name: /^(Add|Hinzufügen)$/ }).click();
  const chooserEvent = page.waitForEvent("filechooser");
  await page
    .getByRole("menuitem", {
      name: /Upload File or Image|Datei oder Bild hochladen/,
    })
    .click();
  const chooser = await chooserEvent;
  await chooser.setFiles({
    name: "large-photo.png",
    mimeType: "image/png",
    buffer: photo,
  });
  await sendMessage(page, "E2E large photo");

  await expect(page.getByTestId("assistant-message").last()).toBeVisible();
  const image = page
    .getByTestId("user-message")
    .last()
    .getByRole("img", { name: "large-photo.png", exact: true });
  await page.reload();
  await expect(image).toBeVisible();
  await expect
    .poll(() =>
      image.evaluate((element: HTMLImageElement) => [
        element.naturalWidth,
        element.naturalHeight,
      ]),
    )
    .toEqual([2048, 1365]);
  const storedBytes = await image.evaluate(async (element: HTMLImageElement) => {
    const response = await fetch(element.src, { credentials: "include" });
    return (await response.arrayBuffer()).byteLength;
  });
  expect(storedBytes).toBeLessThanOrEqual(PROVIDER_IMAGE_CEILING_BYTES);
});
