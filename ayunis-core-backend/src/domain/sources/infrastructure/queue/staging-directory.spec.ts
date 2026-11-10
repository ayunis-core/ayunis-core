import {
  mkdir,
  mkdtemp,
  readdir,
  rm,
  stat,
  utimes,
  writeFile,
} from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  STALE_STAGING_AGE_MS,
  withStagingDirectory,
} from './staging-directory';

describe('withStagingDirectory', () => {
  let root: string;

  beforeEach(async () => {
    root = join(await mkdtemp(join(tmpdir(), 'staging-spec-')), 'root');
  });

  afterEach(async () => {
    await rm(join(root, '..'), { recursive: true, force: true });
  });

  async function leftover(name: string, ageMs: number): Promise<string> {
    const directory = join(root, name);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, 'file'), 'abandoned');
    const modified = new Date(Date.now() - ageMs);
    await utimes(directory, modified, modified);
    return directory;
  }

  it('gives the job a private directory and removes it afterwards', async () => {
    let seen = '';
    const result = await withStagingDirectory(root, async (directory) => {
      seen = directory;
      await writeFile(join(directory, 'file'), 'content');
      expect((await stat(directory)).mode & 0o777).toBe(0o700);
      return 'done';
    });

    expect(result).toBe('done');
    expect(seen.startsWith(join(root, 'download-'))).toBe(true);
    expect(await readdir(root)).toEqual([]);
  });

  it('removes the directory when the job fails', async () => {
    await expect(
      withStagingDirectory(root, async (directory) => {
        await writeFile(join(directory, 'file'), 'content');
        throw new Error('extraction failed');
      }),
    ).rejects.toThrow('extraction failed');

    expect(await readdir(root)).toEqual([]);
  });

  it('removes what a process that was stopped mid-job left behind', async () => {
    await leftover('download-crashed', STALE_STAGING_AGE_MS + 60_000);

    await withStagingDirectory(root, () => Promise.resolve());

    expect(await readdir(root)).toEqual([]);
  });

  it('leaves the files of jobs that may still be running', async () => {
    await leftover('download-running', STALE_STAGING_AGE_MS - 60_000);

    await withStagingDirectory(root, () => Promise.resolve());

    expect(await readdir(root)).toEqual(['download-running']);
  });

  it('leaves old entries it did not create, so a shared directory such as /tmp is safe to configure', async () => {
    await leftover('other-application', STALE_STAGING_AGE_MS + 60_000);
    await leftover('recording-in-use', STALE_STAGING_AGE_MS + 60_000);

    await withStagingDirectory(root, () => Promise.resolve());

    expect(new Set(await readdir(root))).toEqual(
      new Set(['other-application', 'recording-in-use']),
    );
  });

  it('keeps the directory of a job that is still running, however long it runs', async () => {
    jest.useFakeTimers({
      doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'],
    });
    try {
      let finish: () => void = () => undefined;
      let running = '';
      const longJob = withStagingDirectory(root, (directory) => {
        running = directory;
        return new Promise<void>((resolve) => {
          finish = resolve;
        });
      });
      while (running === '') {
        await new Promise((resolve) => setImmediate(resolve));
      }

      await jest.advanceTimersByTimeAsync(STALE_STAGING_AGE_MS + 60_000);
      await new Promise((resolve) => setImmediate(resolve));
      await withStagingDirectory(root, () => Promise.resolve());

      expect((await stat(running)).isDirectory()).toBe(true);
      finish();
      await longJob;
      expect(await readdir(root)).toEqual([]);
    } finally {
      jest.useRealTimers();
    }
  });
});
