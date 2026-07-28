import { randomUUID } from 'crypto';
import { UploadIncompleteError, UploadNotFoundError } from '../uploads.errors';

const getUploadMock = jest.fn();
const handleMock = jest.fn();
const cleanUpExpiredUploadsMock = jest.fn();

jest.mock('@tus/server', () => ({
  Server: jest.fn().mockImplementation(() => ({
    handle: handleMock,
    cleanUpExpiredUploads: cleanUpExpiredUploadsMock,
  })),
}));

jest.mock('@tus/file-store', () => ({
  FileStore: jest.fn().mockImplementation(() => ({
    getUpload: getUploadMock,
  })),
}));

import { TusUploadService } from './tus-upload.service';

describe('TusUploadService', () => {
  const userId = randomUUID();
  let service: TusUploadService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TusUploadService();
  });

  it('resolves a completed owned upload to a multer-equivalent file ref', async () => {
    getUploadMock.mockResolvedValue({
      id: 'abc123',
      offset: 42,
      size: 42,
      metadata: {
        filename: 'haushalt.pdf',
        filetype: 'application/pdf',
        userId,
      },
    });

    const file = await service.resolveCompletedUpload('abc123', userId);

    expect(file).toEqual({
      path: 'uploads/abc123',
      originalname: 'haushalt.pdf',
      mimetype: 'application/pdf',
    });
  });

  it('reports 404 for an upload created by another user', async () => {
    getUploadMock.mockResolvedValue({
      id: 'abc123',
      offset: 42,
      size: 42,
      metadata: { userId: randomUUID() },
    });

    await expect(
      service.resolveCompletedUpload('abc123', userId),
    ).rejects.toBeInstanceOf(UploadNotFoundError);
  });

  it('reports 409 while the upload is still transferring', async () => {
    getUploadMock.mockResolvedValue({
      id: 'abc123',
      offset: 10,
      size: 42,
      metadata: { userId },
    });

    await expect(
      service.resolveCompletedUpload('abc123', userId),
    ).rejects.toBeInstanceOf(UploadIncompleteError);
  });

  it('rejects ids that are not plain store ids without touching the store', async () => {
    await expect(
      service.resolveCompletedUpload('../etc/passwd', userId),
    ).rejects.toBeInstanceOf(UploadNotFoundError);
    expect(getUploadMock).not.toHaveBeenCalled();
  });

  it('reports 404 for ids unknown to the store', async () => {
    getUploadMock.mockRejectedValue(new Error('FILE_NOT_FOUND'));

    await expect(
      service.resolveCompletedUpload('missing1', userId),
    ).rejects.toBeInstanceOf(UploadNotFoundError);
  });

  it('stamps the authenticated user id onto delegated requests', async () => {
    handleMock.mockResolvedValue(undefined);
    const req = { headers: {} as Record<string, string> };

    await service.handle(req as never, {} as never, userId);

    expect(req.headers['x-ayunis-upload-user-id']).toBe(userId);
    expect(handleMock).toHaveBeenCalled();
  });
});
