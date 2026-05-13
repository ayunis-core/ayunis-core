import { UpdateBrandingUseCase } from './update-branding.use-case';
import { UpdateBrandingCommand } from './update-branding.command';
import type { BrandingRepository } from '../../ports/branding.repository';
import {
  BrandingInvalidFileError,
  UnexpectedBrandingError,
} from '../../branding.errors';
import { Branding } from '../../../domain/branding.entity';
import { Org } from '../../../../orgs/domain/org.entity';
import type { FindOrgByIdUseCase } from '../../../../orgs/application/use-cases/find-org-by-id/find-org-by-id.use-case';
import type { GetBrandingUseCase } from '../get-branding/get-branding.use-case';
import type { UploadObjectUseCase } from '../../../../../domain/storage/application/use-cases/upload-object/upload-object.use-case';
import type { DeleteObjectUseCase } from '../../../../../domain/storage/application/use-cases/delete-object/delete-object.use-case';
import type { UUID } from 'crypto';

describe('UpdateBrandingUseCase', () => {
  let useCase: UpdateBrandingUseCase;
  let repository: jest.Mocked<BrandingRepository>;
  let uploadObjectUseCase: jest.Mocked<Pick<UploadObjectUseCase, 'execute'>>;
  let deleteObjectUseCase: jest.Mocked<Pick<DeleteObjectUseCase, 'execute'>>;
  let getBrandingUseCase: jest.Mocked<
    Pick<GetBrandingUseCase, 'invalidateCache'>
  >;
  let findOrgByIdUseCase: jest.Mocked<Pick<FindOrgByIdUseCase, 'execute'>>;

  const orgId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' as UUID;
  const org = new Org({ id: orgId, name: 'Stadt Musterstadt' });
  const pngBuffer = Buffer.from('fake-png-bytes');

  beforeEach(() => {
    repository = {
      findByOrgId: jest.fn().mockResolvedValue(null),
      upsert: jest
        .fn()
        .mockImplementation((branding: Branding) => Promise.resolve(branding)),
    } as jest.Mocked<BrandingRepository>;

    uploadObjectUseCase = { execute: jest.fn().mockResolvedValue(undefined) };
    deleteObjectUseCase = { execute: jest.fn().mockResolvedValue(undefined) };
    getBrandingUseCase = { invalidateCache: jest.fn() };
    findOrgByIdUseCase = { execute: jest.fn().mockResolvedValue(org) };

    useCase = new UpdateBrandingUseCase(
      repository,
      uploadObjectUseCase as unknown as UploadObjectUseCase,
      deleteObjectUseCase as unknown as DeleteObjectUseCase,
      getBrandingUseCase as unknown as GetBrandingUseCase,
      findOrgByIdUseCase as unknown as FindOrgByIdUseCase,
    );
  });

  it('should store a trimmed displayName', async () => {
    const result = await useCase.execute(
      new UpdateBrandingCommand({
        orgId,
        displayName: '  Bürgerportal Musterstadt  ',
      }),
    );

    expect(result.displayName).toBe('Bürgerportal Musterstadt');
  });

  it('should store null when displayName is cleared with an empty string', async () => {
    repository.findByOrgId.mockResolvedValue(
      new Branding({ orgId, displayName: 'Bürgerportal Musterstadt' }),
    );

    const result = await useCase.execute(
      new UpdateBrandingCommand({ orgId, displayName: '' }),
    );

    expect(result.displayName).toBeNull();
  });

  it('should keep the existing displayName when the command omits it', async () => {
    repository.findByOrgId.mockResolvedValue(
      new Branding({ orgId, displayName: 'Bürgerportal Musterstadt' }),
    );

    const result = await useCase.execute(
      new UpdateBrandingCommand({ orgId, removeFavicon: true }),
    );

    expect(result.displayName).toBe('Bürgerportal Musterstadt');
  });

  it('should default displayName to the org name when creating the first branding row without one', async () => {
    const result = await useCase.execute(
      new UpdateBrandingCommand({
        orgId,
        faviconBuffer: pngBuffer,
        faviconMimeType: 'image/png',
      }),
    );

    expect(result.displayName).toBe('Stadt Musterstadt');
  });

  it('should upload the favicon and store its storage path', async () => {
    const result = await useCase.execute(
      new UpdateBrandingCommand({
        orgId,
        faviconBuffer: pngBuffer,
        faviconMimeType: 'image/png',
      }),
    );

    expect(result.faviconStoragePath).toBe(`${orgId}/branding/favicon.png`);
    expect(uploadObjectUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        objectName: `${orgId}/branding/favicon.png`,
        data: pngBuffer,
      }),
    );
  });

  it('should delete the previous favicon object when replacing it', async () => {
    repository.findByOrgId.mockResolvedValue(
      new Branding({
        orgId,
        faviconStoragePath: `${orgId}/branding/favicon.jpg`,
      }),
    );

    await useCase.execute(
      new UpdateBrandingCommand({
        orgId,
        faviconBuffer: pngBuffer,
        faviconMimeType: 'image/png',
      }),
    );

    expect(deleteObjectUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        objectName: `${orgId}/branding/favicon.jpg`,
      }),
    );
  });

  it('should clear the favicon and delete the stored object when removeFavicon is set', async () => {
    repository.findByOrgId.mockResolvedValue(
      new Branding({
        orgId,
        faviconStoragePath: `${orgId}/branding/favicon.png`,
      }),
    );

    const result = await useCase.execute(
      new UpdateBrandingCommand({ orgId, removeFavicon: true }),
    );

    expect(result.faviconStoragePath).toBeNull();
    expect(deleteObjectUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        objectName: `${orgId}/branding/favicon.png`,
      }),
    );
  });

  it('should not delete the previous favicon when persisting the update fails', async () => {
    repository.findByOrgId.mockResolvedValue(
      new Branding({
        orgId,
        faviconStoragePath: `${orgId}/branding/favicon.jpg`,
      }),
    );
    repository.upsert.mockRejectedValue(new Error('DB connection lost'));

    await expect(
      useCase.execute(
        new UpdateBrandingCommand({
          orgId,
          faviconBuffer: pngBuffer,
          faviconMimeType: 'image/png',
        }),
      ),
    ).rejects.toThrow(UnexpectedBrandingError);

    expect(deleteObjectUseCase.execute).not.toHaveBeenCalled();
  });

  it('should not delete the stored object when removeFavicon fails to persist', async () => {
    repository.findByOrgId.mockResolvedValue(
      new Branding({
        orgId,
        faviconStoragePath: `${orgId}/branding/favicon.png`,
      }),
    );
    repository.upsert.mockRejectedValue(new Error('DB connection lost'));

    await expect(
      useCase.execute(
        new UpdateBrandingCommand({ orgId, removeFavicon: true }),
      ),
    ).rejects.toThrow(UnexpectedBrandingError);

    expect(deleteObjectUseCase.execute).not.toHaveBeenCalled();
  });

  it('should not delete the storage object when the replacement favicon reuses the same path', async () => {
    repository.findByOrgId.mockResolvedValue(
      new Branding({
        orgId,
        faviconStoragePath: `${orgId}/branding/favicon.png`,
      }),
    );

    await useCase.execute(
      new UpdateBrandingCommand({
        orgId,
        faviconBuffer: pngBuffer,
        faviconMimeType: 'image/png',
      }),
    );

    expect(deleteObjectUseCase.execute).not.toHaveBeenCalled();
  });

  it('should reject favicon uploads with a non-image mime type', async () => {
    await expect(
      useCase.execute(
        new UpdateBrandingCommand({
          orgId,
          faviconBuffer: pngBuffer,
          faviconMimeType: 'image/svg+xml',
        }),
      ),
    ).rejects.toThrow(BrandingInvalidFileError);
  });

  it('should reject favicon uploads larger than 512 KB', async () => {
    await expect(
      useCase.execute(
        new UpdateBrandingCommand({
          orgId,
          faviconBuffer: Buffer.alloc(512 * 1024 + 1),
          faviconMimeType: 'image/png',
        }),
      ),
    ).rejects.toThrow(BrandingInvalidFileError);
  });

  it('should invalidate the favicon URL cache after a successful update', async () => {
    await useCase.execute(
      new UpdateBrandingCommand({ orgId, displayName: 'Neues Portal' }),
    );

    expect(getBrandingUseCase.invalidateCache).toHaveBeenCalledWith(orgId);
  });

  it('should throw UnexpectedBrandingError when the repository throws an unexpected error', async () => {
    repository.upsert.mockRejectedValue(new Error('DB connection lost'));

    await expect(
      useCase.execute(
        new UpdateBrandingCommand({ orgId, displayName: 'Neues Portal' }),
      ),
    ).rejects.toThrow(UnexpectedBrandingError);
  });
});
