import type { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import type { DownloadObjectUseCase } from 'src/domain/storage/application/use-cases/download-object/download-object.use-case';
import type { UploadSystemObjectUseCase } from 'src/domain/storage/application/use-cases/upload-system-object/upload-system-object.use-case';
import { extractOrgIdFromKey } from 'src/domain/storage/domain/org-storage-layout';
import { AdventCalendarImageUnsupportedError } from 'src/domain/advent-calendar/application/advent-calendar.errors';
import { AdventCalendarImageService } from './advent-calendar-image.service';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

describe(AdventCalendarImageService.name, () => {
  const upload = { execute: jest.fn().mockResolvedValue(undefined) };
  const service = new AdventCalendarImageService(
    upload as unknown as UploadSystemObjectUseCase,
    {} as DownloadObjectUseCase,
    {} as DeleteObjectUseCase,
  );

  beforeEach(() => jest.clearAllMocks());

  it('stores an image under advent-calendar/<day>/, outside every org layout, typed by its bytes', async () => {
    const image = await service.store(7, PNG);

    expect(image.contentType).toBe('image/png');
    expect(image.storageKey).toMatch(
      /^advent-calendar\/7\/[0-9a-f-]{36}\.png$/,
    );
    expect(extractOrgIdFromKey(image.storageKey)).toBeNull();
    expect(upload.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        objectName: image.storageKey,
        options: { contentType: 'image/png' },
      }),
    );
  });

  it('refuses bytes that are not a supported image, whatever the file claims to be', async () => {
    await expect(
      service.store(7, Buffer.from('<svg onload="alert(1)"></svg>')),
    ).rejects.toThrow(AdventCalendarImageUnsupportedError);
    expect(upload.execute).not.toHaveBeenCalled();
  });
});
