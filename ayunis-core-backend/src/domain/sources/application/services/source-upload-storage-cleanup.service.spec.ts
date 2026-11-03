import { ObjectNotFoundError } from 'src/domain/storage/application/storage.errors';
import { buildUploadSession } from 'src/domain/sources/application/testing/source-upload.fixtures';
import { SourceUploadStorageCleanupService } from './source-upload-storage-cleanup.service';

describe('SourceUploadStorageCleanupService', () => {
  const abort = { execute: jest.fn() };
  const remove = { execute: jest.fn() };
  const service = new SourceUploadStorageCleanupService(
    abort as never,
    remove as never,
  );

  beforeEach(() => {
    abort.execute.mockReset().mockResolvedValue(undefined);
    remove.execute.mockReset().mockResolvedValue(undefined);
  });

  it('confirms cleanup when both multipart parts and the object are removed', async () => {
    await expect(
      service.discard(
        buildUploadSession({ multipartUploadId: 'pending-parts' }),
      ),
    ).resolves.toBe(true);
    expect(abort.execute).toHaveBeenCalled();
    expect(remove.execute).toHaveBeenCalled();
  });

  it('reports failed object removal so the session can be retained for retry', async () => {
    remove.execute.mockRejectedValue(new Error('object store unavailable'));
    await expect(service.discard(buildUploadSession())).resolves.toBe(false);
  });

  it('still removes the object when aborting multipart parts fails', async () => {
    abort.execute.mockRejectedValue(new Error('object store unavailable'));
    await expect(
      service.discard(
        buildUploadSession({ multipartUploadId: 'pending-parts' }),
      ),
    ).resolves.toBe(false);
    expect(remove.execute).toHaveBeenCalled();
  });

  it('treats an already missing object as cleaned', async () => {
    remove.execute.mockRejectedValue(
      new ObjectNotFoundError({ objectName: 'already-removed.csv' }),
    );
    await expect(service.discard(buildUploadSession())).resolves.toBe(true);
  });
});
