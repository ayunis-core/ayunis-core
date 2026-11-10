import { mkdir, mkdtemp, readdir, rm, stat, utimes } from 'fs/promises';
import { join } from 'path';

// A running job refreshes its directory far more often than this, so a
// directory this old belongs to a process that was stopped before it could
// clean up.
export const STALE_STAGING_AGE_MS = 6 * 60 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 10 * 60 * 1000;
const DIRECTORY_PREFIX = 'download-';

export async function withStagingDirectory<T>(
  root: string,
  use: (directory: string) => Promise<T>,
): Promise<T> {
  await mkdir(root, { recursive: true, mode: 0o700 });
  await removeAbandonedDirectories(root);
  const directory = await mkdtemp(join(root, DIRECTORY_PREFIX));
  const heartbeat = setInterval(() => {
    const now = new Date();
    void utimes(directory, now, now).catch(() => undefined);
  }, HEARTBEAT_INTERVAL_MS);
  heartbeat.unref();
  try {
    return await use(directory);
  } finally {
    clearInterval(heartbeat);
    await rm(directory, { recursive: true, force: true });
  }
}

// The root may be a directory other software writes to (AUDIO_TEMP_DIRECTORY
// can point at /tmp), so only directories created here are ever removed.
async function removeAbandonedDirectories(root: string): Promise<void> {
  const cutoff = Date.now() - STALE_STAGING_AGE_MS;
  for (const name of await readdir(root)) {
    if (!name.startsWith(DIRECTORY_PREFIX)) continue;
    const entry = join(root, name);
    const modified = await stat(entry).then(
      (stats) => stats.mtimeMs,
      () => undefined,
    );
    if (modified !== undefined && modified < cutoff) {
      await rm(entry, { recursive: true, force: true });
    }
  }
}
