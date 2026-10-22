import { createHash } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createSha256ReadStream } from './sha256-read-stream';

async function drain(stream: NodeJS.ReadableStream): Promise<number> {
  let bytes = 0;
  for await (const chunk of stream) bytes += (chunk as Buffer).length;
  return bytes;
}

describe('createSha256ReadStream', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'sha256-stream-'));
  });

  afterAll(async () => {
    await fs.promises.rm(dir, { recursive: true, force: true });
  });

  it('hashes exactly the bytes the consumer read', async () => {
    const file = path.join(dir, 'report.pdf');
    await fs.promises.writeFile(file, 'fake pdf content');

    const hashed = createSha256ReadStream(file);
    await expect(drain(hashed.stream)).resolves.toBe(16);

    expect(hashed.digest()).toBe(
      createHash('sha256').update('fake pdf content').digest('hex'),
    );
  });

  it('surfaces a missing file as a stream error', async () => {
    const hashed = createSha256ReadStream(path.join(dir, 'missing.pdf'));

    await expect(drain(hashed.stream)).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });
});
