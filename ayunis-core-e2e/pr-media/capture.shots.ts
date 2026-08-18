import { expect } from '@playwright/test';
import { test } from '../src/fixtures/test';
import { recordGif } from './lib/record-gif';
import { shotPath } from './lib/media-paths';
import scenes from './scenes.generated';
import {
  PR_MEDIA_VIEWPORTS,
  type PrMediaContext,
  type PrMediaScene,
  type PrMediaViewport,
} from './types';

async function waitForScene(context: PrMediaContext, scene: PrMediaScene) {
  const locator = await scene.waitFor?.(context);
  if (locator) {
    await expect(locator).toBeVisible();
  }
}

async function prepareScene(
  scene: PrMediaScene,
  context: PrMediaContext,
): Promise<void> {
  await context.page.goto(scene.path);
  await waitForScene(context, scene);
}

function viewportsFor(scene: PrMediaScene): PrMediaViewport[] {
  return scene.viewports ?? ['desktop', 'mobile'];
}

for (const scene of scenes) {
  for (const viewport of viewportsFor(scene)) {
    const size = PR_MEDIA_VIEWPORTS[viewport];

    test.describe(`${scene.name} ${viewport}`, () => {
      test.use({ viewport: size });

      test(`${scene.name} screenshot`, async ({ page }) => {
        const context = { page, expect, viewport } satisfies PrMediaContext;
        await prepareScene(scene, context);
        await page.screenshot({
          path: shotPath(scene.name, viewport),
          fullPage: true,
        });
      });

      for (const demo of scene.demos ?? []) {
        test(`${scene.name} ${demo.name} demo`, async ({ page }) => {
          const context = { page, expect, viewport } satisfies PrMediaContext;
          await prepareScene(scene, context);
          await recordGif(page, scene.name, demo.name, viewport, () =>
            demo.action(context),
          );
        });
      }
    });
  }
}
