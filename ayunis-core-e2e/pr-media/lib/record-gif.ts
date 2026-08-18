import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { delay } from './delay';
import { framesPath, gifPath } from './media-paths';

export async function recordGif(
  page: Page,
  routeName: string,
  sceneName: string,
  viewport: string,
  action: () => Promise<void>,
): Promise<void> {
  const framesDir = framesPath(routeName, sceneName, viewport);
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
  writeGif(framesDir, routeName, sceneName, viewport);
}

function writeGif(
  framesDir: string,
  routeName: string,
  sceneName: string,
  viewport: string,
): void {
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
      gifPath(routeName, sceneName, viewport),
    ],
    { stdio: 'inherit' },
  );
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed for ${routeName}/${sceneName} (${viewport})`);
  }
}
