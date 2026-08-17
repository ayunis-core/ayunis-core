import { rmSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import type { Page } from '@playwright/test';
import { test, expect } from '../../src/fixtures/test';
import { sendMessage, startThread } from '../../src/flows/chat.flow';

// Captures full-page screenshots of key routes for PR review — run
// explicitly via `--project=screenshots` (not part of the regular suite).
// Output lands in screenshots-output/ (override with SCREENSHOTS_DIR);
// CI publishes it to the PR via scripts/publish-pr-screenshots.sh.
const outDir = process.env.SCREENSHOTS_DIR ?? 'screenshots-output';

const VIEWPORTS = [
  { label: 'desktop', width: 1280, height: 800 },
  { label: 'mobile', width: 375, height: 812 },
] as const;

// Anchor: proves the page rendered before shooting. Sidebars only exist in
// the DOM on desktop (mobile puts them in an on-demand Sheet), so mobile
// waits on the always-mounted content wrapper instead.
const MOBILE_ANCHOR = '[data-slot="sidebar-inset"]';

const ROUTES = [
  { path: '/chat', name: 'chat', anchor: 'sidebar' },
  {
    path: '/admin-settings/users',
    name: 'admin-users',
    anchor: 'settings-sidebar',
  },
  {
    path: '/admin-settings/instructions',
    name: 'admin-instructions',
    anchor: 'settings-sidebar',
  },
  {
    path: '/settings/account',
    name: 'settings-account',
    anchor: 'settings-sidebar',
  },
] as const;

const selectedRoutes = process.env.SCREENSHOT_ROUTES?.split(',').filter(
  Boolean,
);

function shouldCapture(name: string): boolean {
  return selectedRoutes === undefined || selectedRoutes.includes(name);
}

function shotPath(name: string, viewport: string): string {
  return path.join(outDir, `${name}--${viewport}.png`);
}

function gifPath(name: string, viewport: string): string {
  return path.join(outDir, `${name}--${viewport}.gif`);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function recordGif(
  page: Page,
  name: string,
  viewport: string,
  action: () => Promise<void>,
): Promise<void> {
  const framesDir = path.join(outDir, 'frames', `${name}--${viewport}`);
  rmSync(framesDir, { recursive: true, force: true });
  mkdirSync(framesDir, { recursive: true });

  const session = await page.context().newCDPSession(page);
  let frameCount = 0;
  session.on('Page.screencastFrame', ({ data, sessionId }) => {
    const frameName = `f-${String(frameCount).padStart(4, '0')}.jpg`;
    writeFileSync(path.join(framesDir, frameName), Buffer.from(data, 'base64'));
    frameCount += 1;
    void session.send('Page.screencastFrameAck', { sessionId });
  });

  await session.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 80,
    everyNthFrame: 1,
  });
  try {
    await action();
    await delay(400);
  } finally {
    await session.send('Page.stopScreencast');
    await session.detach();
  }

  if (frameCount === 0) return;
  const result = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-framerate',
      '10',
      '-pattern_type',
      'glob',
      '-i',
      path.join(framesDir, 'f-*.jpg'),
      '-vf',
      'fps=10,scale=1000:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
      gifPath(name, viewport),
    ],
    { stdio: 'inherit' },
  );
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed for ${name} (${viewport})`);
  }
}

async function interactWithRoute(page: Page, name: string): Promise<void> {
  if (name === 'chat') {
    await page.getByTestId('input').fill('Kurzer Video-Check');
    await delay(700);
    await page.getByTestId('input').clear();
    return;
  }
  if (name === 'admin-users') {
    await page.getByRole('button').last().click();
    await delay(900);
    await page.keyboard.press('Escape');
    return;
  }
  if (name === 'admin-instructions') {
    await page.locator('#org-system-prompt-textarea').fill('Kurzer Video-Check');
    await delay(700);
    await page.locator('#disable-internet-access-switch').scrollIntoViewIfNeeded();
    return;
  }
  if (name === 'settings-account') {
    await page.locator('#full-name').focus();
    await delay(700);
    await page.locator('#email').scrollIntoViewIfNeeded();
  }
}

for (const viewport of VIEWPORTS) {
  const anchorOf =
    viewport.label === 'desktop'
      ? (page: Page, route: (typeof ROUTES)[number]) =>
          page.getByTestId(route.anchor)
      : (page: Page) => page.locator(MOBILE_ANCHOR);

  test.describe(`${viewport.label}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of ROUTES) {
      if (shouldCapture(route.name)) {
        test(`${route.name}`, async ({ page }) => {
          await page.goto(route.path);
          await expect(anchorOf(page, route)).toBeVisible();
          await page.screenshot({
            path: shotPath(route.name, viewport.label),
            fullPage: true,
          });
          await recordGif(page, route.name, viewport.label, () =>
            interactWithRoute(page, route.name),
          );
        });
      }
    }

    if (shouldCapture('chat-conversation')) {
      test('chat-conversation', async ({ page }) => {
        await startThread(page, 'Screenshot this conversation');
        await page.screenshot({
          path: shotPath('chat-conversation', viewport.label),
          fullPage: true,
        });
        await recordGif(page, 'chat-conversation', viewport.label, () =>
          sendMessage(page, 'Kurzer Video-Check'),
        );
      });
    }
  });
}
