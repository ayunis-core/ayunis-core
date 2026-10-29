import { request } from '@playwright/test';
import { createUser } from '../../src/factories/user.factory';
import { test, expect } from '../../src/fixtures/test';
import { editUploadedPhoto, generatedImage } from '../../src/flows/chat.flow';
import { login } from '../../src/clients/api/auth.client';
import { getGeneratedImageResponse } from '../../src/clients/api/threads.client';
import { config } from '../../src/config';

const GENERATED_IMAGE_PATH =
  /\/threads\/([0-9a-f-]+)\/generated-images\/([0-9a-f-]+)$/;

test('serves a generated image through the app to its thread owner only', async ({
  page,
  api,
  mail,
}) => {
  const imageRequestOrigins = new Set<string>();
  page.on('request', (req) => {
    if (req.resourceType() === 'image' && req.url().startsWith('http')) {
      imageRequestOrigins.add(new URL(req.url()).origin);
    }
  });

  await editUploadedPhoto(page, api);
  const image = generatedImage(page);
  await expect(image).toBeVisible();
  await expect
    .poll(() =>
      image.evaluate((element: HTMLImageElement) => element.naturalWidth),
    )
    .toBeGreaterThan(0);

  const src = await image.evaluate(
    (element: HTMLImageElement) => element.currentSrc,
  );
  const [, threadId, imageId] = GENERATED_IMAGE_PATH.exec(src) ?? [];
  expect(threadId, `unexpected generated image src ${src}`).toBeTruthy();
  const appOrigins = [config.baseURL, config.apiURL].map(
    (url) => new URL(url).origin,
  );
  expect(appOrigins).toContain(new URL(src).origin);
  for (const origin of imageRequestOrigins) {
    expect(appOrigins).toContain(origin);
  }

  const ownerResponse = await getGeneratedImageResponse(api, threadId, imageId);
  expect(ownerResponse.status()).toBe(200);
  expect(ownerResponse.headers()['content-type']).toBe('image/png');
  expect(ownerResponse.headers()['x-content-type-options']).toBe('nosniff');
  expect(ownerResponse.headers()['content-disposition']).toBe(
    `inline; filename="${imageId}.png"`,
  );
  expect((await ownerResponse.body()).subarray(1, 4).toString()).toBe('PNG');

  const member = await createUser(
    api,
    mail,
    `generated-image-${Date.now()}`,
  );
  const memberApi = await request.newContext({ baseURL: config.apiURL });
  try {
    await login(memberApi, member.email, member.password);
    const memberResponse = await getGeneratedImageResponse(
      memberApi,
      threadId,
      imageId,
    );
    expect(memberResponse.status()).toBe(404);
  } finally {
    await memberApi.dispose();
  }
});
