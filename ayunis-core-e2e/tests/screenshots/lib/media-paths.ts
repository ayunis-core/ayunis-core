import path from 'node:path';

export const screenshotsOutDir = process.env.SCREENSHOTS_DIR ?? 'screenshots-output';

export function shotPath(routeName: string, viewport: string): string {
  return path.join(screenshotsOutDir, `${routeName}--${viewport}.png`);
}

export function gifPath(
  routeName: string,
  sceneName: string,
  viewport: string,
): string {
  return path.join(
    screenshotsOutDir,
    `${routeName}--${sceneName}--${viewport}.gif`,
  );
}

export function framesPath(
  routeName: string,
  sceneName: string,
  viewport: string,
): string {
  return path.join(
    screenshotsOutDir,
    'frames',
    `${routeName}--${sceneName}--${viewport}`,
  );
}
