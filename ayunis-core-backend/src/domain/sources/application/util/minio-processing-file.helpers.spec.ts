import { createHash } from 'crypto';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { StoredFileMismatchError } from 'src/domain/sources/application/sources.errors';
import { downloadMinioFileToPath } from './minio-processing-file.helpers';

function stream(...parts: string[]) {
  return (async function* () {
    for (const part of parts) yield Buffer.from(part);
  })();
}

describe('downloadMinioFileToPath', () => {
  let directory: string;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'minio-download-'));
  });
  afterEach(() => rm(directory, { recursive: true, force: true }));

  it('writes the object to the destination and hashes it on the way', async () => {
    const downloadObject = {
      execute: jest.fn().mockResolvedValue(stream('abc', 'def')),
    };
    const destination = join(directory, 'recording');

    await expect(
      downloadMinioFileToPath(
        downloadObject as never,
        'org/uploads/s/file.mp3',
        destination,
        6,
        'etag',
      ),
    ).resolves.toEqual({
      size: 6,
      sha256: createHash('sha256').update('abcdef').digest('hex'),
    });
    await expect(readFile(destination, 'utf8')).resolves.toBe('abcdef');
  });

  it('stops as soon as the object exceeds the verified size', async () => {
    const downloadObject = {
      execute: jest.fn().mockResolvedValue(stream('abc', 'def', 'ghi')),
    };

    await expect(
      downloadMinioFileToPath(
        downloadObject as never,
        'org/uploads/s/file.mp3',
        join(directory, 'recording'),
        6,
      ),
    ).rejects.toBeInstanceOf(StoredFileMismatchError);
  });
});
