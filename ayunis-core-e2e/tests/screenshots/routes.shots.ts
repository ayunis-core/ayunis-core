import { expect, type Page } from '@playwright/test';
import { test } from '../../src/fixtures/test';
import { startThread } from '../../src/flows/chat.flow';
import { recordGif } from './lib/record-gif';
import { shotPath } from './lib/media-paths';
import {
  routeAnchor,
  SCREENSHOT_ROUTES,
  VIEWPORTS,
  type ScreenshotRoute,
  type ScreenshotRouteName,
  type ViewportLabel,
} from './routes';
import { demoScenesByRoute } from './scenes';

// Captures full-page screenshots and short demos of key routes for PR review —
// run explicitly via `--project=screenshots` (not part of the regular suite).
// CI publishes output to the PR via scripts/publish-pr-screenshots.sh.
const selectedRoutes = process.env.SCREENSHOT_ROUTES?.split(',').filter(
  Boolean,
);

function shouldCapture(name: string): boolean {
  return selectedRoutes === undefined || selectedRoutes.includes(name);
}

async function expectRouteReady(
  page: Page,
  route: ScreenshotRoute,
  viewport: ViewportLabel,
): Promise<void> {
  await expect(routeAnchor(page, route, viewport)).toBeVisible();
}

async function recordRouteScenes(
  page: Page,
  route: ScreenshotRoute,
  viewport: ViewportLabel,
): Promise<void> {
  for (const scene of demoScenesByRoute[route.name]) {
    await page.goto(route.path);
    await expectRouteReady(page, route, viewport);
    await recordGif(page, route.name, scene.name, viewport, () =>
      scene.action(page),
    );
  }
}

async function recordConversationScenes(
  page: Page,
  viewport: ViewportLabel,
): Promise<void> {
  const routeName: ScreenshotRouteName = 'chat-conversation';
  for (const scene of demoScenesByRoute[routeName]) {
    await startThread(page, 'Screenshot this conversation');
    await recordGif(page, routeName, scene.name, viewport, () =>
      scene.action(page),
    );
  }
}

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.label}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of SCREENSHOT_ROUTES) {
      if (shouldCapture(route.name)) {
        test(`${route.name}`, async ({ page }) => {
          await page.goto(route.path);
          await expect(routeAnchor(page, route, viewport.label)).toBeVisible();
          await page.screenshot({
            path: shotPath(route.name, viewport.label),
            fullPage: true,
          });
          await recordRouteScenes(page, route, viewport.label);
        });
      }
    }

    if (shouldCapture('chat-conversation')) {
      test('chat-conversation', async ({ page }) => {
        await startThread(page, 'Screenshot this conversation');
        await expect(page.getByTestId('input')).toBeVisible();
        await page.screenshot({
          path: shotPath('chat-conversation', viewport.label),
          fullPage: true,
        });
        await recordConversationScenes(page, viewport.label);
      });
    }
  });
}
