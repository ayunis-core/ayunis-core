import { Readable } from 'stream';
import { ProcessingCheckpointService } from './processing-checkpoint.service';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { ObjectNotFoundError } from 'src/domain/storage/application/storage.errors';

const orgId = 'e430c88d-83ad-4188-976e-a2cc3d03a5ac';
const sourceId = 'b55dfeef-b820-4d6c-bb84-5cd5205dfc62';
const key = 'a'.repeat(64);

describe('processing checkpoints', () => {
  const objects = new Map<string, string>();
  let status: SourceStatus | undefined;
  let deleteWhileWriting: boolean;

  function service() {
    const repository = { findById: async () => (status ? { status } : null) };
    const download = {
      execute: async ({ objectName }: { objectName: string }) => {
        const value = objects.get(objectName);
        if (value === undefined) throw new ObjectNotFoundError({ objectName });
        return Readable.from([Buffer.from(value)]);
      },
    };
    const upload = {
      execute: async ({
        objectName,
        data,
      }: {
        objectName: string;
        data: Buffer;
      }) => {
        objects.set(objectName, data.toString());
        if (deleteWhileWriting) status = undefined;
      },
    };
    const purge = {
      execute: async ({ prefixes }: { prefixes: string[] }) => {
        for (const name of objects.keys()) {
          if (prefixes.some((prefix) => name.startsWith(prefix)))
            objects.delete(name);
        }
      },
    };
    return new ProcessingCheckpointService(
      repository as never,
      download as never,
      upload as never,
      purge as never,
    );
  }

  beforeEach(() => {
    objects.clear();
    status = SourceStatus.PROCESSING;
    deleteWhileWriting = false;
  });

  it('loads saved results after a new service instance is created', async () => {
    await service()
      .create(orgId, sourceId)
      .write(key, '{"text":"Council minutes"}');
    expect(await service().create(orgId, sourceId).read(key)).toBe(
      '{"text":"Council minutes"}',
    );
  });

  it('isolates results by organization and source', async () => {
    await service().create(orgId, sourceId).write(key, 'private result');
    const other = service().create(
      'ca9abe76-5069-4c56-99ca-50dab9d2e2cd',
      sourceId,
    );
    expect(await other.read(key)).toBeUndefined();
  });

  it('removes a late checkpoint written while the source was being deleted', async () => {
    deleteWhileWriting = true;
    await expect(
      service().create(orgId, sourceId).write(key, 'late result'),
    ).rejects.toThrow('no longer active');
    expect(objects.size).toBe(0);
  });

  it('keeps the original file when cleaning processing results', async () => {
    objects.set(`${orgId}/uploads/original.pdf`, 'original');
    await service().create(orgId, sourceId).write(key, 'result');
    await service().cleanup(orgId, sourceId);
    expect([...objects.values()]).toEqual(['original']);
  });
});
