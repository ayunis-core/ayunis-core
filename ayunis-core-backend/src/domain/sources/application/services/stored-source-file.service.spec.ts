import { ObjectChangedError } from 'src/domain/storage/application/storage.errors';
import { StoredSourceFileService } from './stored-source-file.service';
import { StoredFileMismatchError } from 'src/domain/sources/application/sources.errors';

function stream(...parts: string[]) {
  return (async function* () {
    for (const part of parts) yield Buffer.from(part);
  })();
}

describe('StoredSourceFileService', () => {
  const getObjectInfo = { execute: jest.fn() };
  const downloadObject = { execute: jest.fn() };
  const deleteObject = { execute: jest.fn().mockResolvedValue(undefined) };
  const service = new StoredSourceFileService(
    getObjectInfo as never,
    downloadObject as never,
    deleteObject as never,
  );
  const key = 'org/uploads/session/file.pdf';

  beforeEach(() => {
    jest.clearAllMocks();
    downloadObject.execute.mockImplementation(() =>
      Promise.resolve(stream('abc', 'def')),
    );
  });

  it('reads a file whose stored size matches the verified one', async () => {
    getObjectInfo.execute.mockResolvedValue({ size: 6 });

    await expect(service.read(key, 6)).resolves.toEqual(Buffer.from('abcdef'));
    expect(deleteObject.execute).not.toHaveBeenCalled();
  });

  it('removes and rejects a file whose stored size differs', async () => {
    getObjectInfo.execute.mockResolvedValue({ size: 6000 });

    await expect(service.read(key, 6)).rejects.toBeInstanceOf(
      StoredFileMismatchError,
    );
    expect(deleteObject.execute).toHaveBeenCalledWith(
      expect.objectContaining({ objectName: key }),
    );
    expect(downloadObject.execute).not.toHaveBeenCalled();
  });

  it('stops reading when the object grows past the verified size mid-download', async () => {
    getObjectInfo.execute.mockResolvedValue({ size: 6 });
    downloadObject.execute.mockImplementation(() =>
      Promise.resolve(stream('abc', 'def', 'ghi')),
    );

    await expect(service.read(key, 6)).rejects.toBeInstanceOf(
      StoredFileMismatchError,
    );
  });

  it('binds the download to the identity saved at completion', async () => {
    getObjectInfo.execute.mockResolvedValue({ size: 6 });
    await service.read(key, 6, 'verified');
    expect(downloadObject.execute).toHaveBeenCalledWith(
      expect.objectContaining({ expectedETag: 'verified' }),
    );
  });

  it('removes a same-size replacement and reports a permanent file mismatch', async () => {
    getObjectInfo.execute.mockResolvedValue({ size: 6 });
    downloadObject.execute.mockRejectedValueOnce(new ObjectChangedError());
    await expect(service.read(key, 6, 'verified')).rejects.toBeInstanceOf(
      StoredFileMismatchError,
    );
    expect(deleteObject.execute).toHaveBeenCalledWith(
      expect.objectContaining({ objectName: key }),
    );
  });

  it('reads legacy staged files without a size check', async () => {
    await expect(service.read(key)).resolves.toEqual(Buffer.from('abcdef'));
    expect(getObjectInfo.execute).not.toHaveBeenCalled();
  });
});
