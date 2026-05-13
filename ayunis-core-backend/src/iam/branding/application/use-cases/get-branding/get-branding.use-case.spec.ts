import { GetBrandingUseCase } from './get-branding.use-case';
import { GetBrandingQuery } from './get-branding.query';
import type { BrandingRepository } from '../../ports/branding.repository';
import { UnexpectedBrandingError } from '../../branding.errors';
import { Branding } from '../../../domain/branding.entity';
import { Org } from '../../../../orgs/domain/org.entity';
import type { FindOrgByIdUseCase } from '../../../../orgs/application/use-cases/find-org-by-id/find-org-by-id.use-case';
import type { GetPresignedUrlUseCase } from '../../../../../domain/storage/application/use-cases/get-presigned-url/get-presigned-url.use-case';
import type { UUID } from 'crypto';

describe('GetBrandingUseCase', () => {
  let useCase: GetBrandingUseCase;
  let repository: jest.Mocked<BrandingRepository>;
  let findOrgByIdUseCase: jest.Mocked<Pick<FindOrgByIdUseCase, 'execute'>>;
  let getPresignedUrlUseCase: jest.Mocked<
    Pick<GetPresignedUrlUseCase, 'execute'>
  >;

  const orgId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' as UUID;
  const org = new Org({ id: orgId, name: 'Stadt Musterstadt' });

  beforeEach(() => {
    repository = {
      findByOrgId: jest.fn(),
      upsert: jest.fn(),
    } as jest.Mocked<BrandingRepository>;

    findOrgByIdUseCase = { execute: jest.fn().mockResolvedValue(org) };
    getPresignedUrlUseCase = {
      execute: jest
        .fn()
        .mockResolvedValue({ url: 'https://storage.example/favicon.png' }),
    };

    useCase = new GetBrandingUseCase(
      repository,
      findOrgByIdUseCase as unknown as FindOrgByIdUseCase,
      getPresignedUrlUseCase as unknown as GetPresignedUrlUseCase,
    );
  });

  it('should fall back to the org name as displayName when no branding row exists', async () => {
    repository.findByOrgId.mockResolvedValue(null);

    const result = await useCase.execute(new GetBrandingQuery(orgId));

    expect(result).toEqual({
      name: 'Stadt Musterstadt',
      displayName: 'Stadt Musterstadt',
      faviconUrl: null,
      primaryColor: null,
    });
  });

  it('should return the stored primary color', async () => {
    repository.findByOrgId.mockResolvedValue(
      new Branding({ orgId, primaryColor: '#3b82f6' }),
    );

    const result = await useCase.execute(new GetBrandingQuery(orgId));

    expect(result.primaryColor).toBe('#3b82f6');
  });

  it('should return null displayName (platform default) when the row has displayName cleared', async () => {
    repository.findByOrgId.mockResolvedValue(
      new Branding({ orgId, displayName: null }),
    );

    const result = await useCase.execute(new GetBrandingQuery(orgId));

    expect(result.displayName).toBeNull();
  });

  it('should return the stored displayName when set', async () => {
    repository.findByOrgId.mockResolvedValue(
      new Branding({ orgId, displayName: 'Bürgerportal Musterstadt' }),
    );

    const result = await useCase.execute(new GetBrandingQuery(orgId));

    expect(result.displayName).toBe('Bürgerportal Musterstadt');
  });

  it('should resolve a presigned favicon URL when a favicon is stored', async () => {
    repository.findByOrgId.mockResolvedValue(
      new Branding({
        orgId,
        faviconStoragePath: `${orgId}/branding/favicon.png`,
      }),
    );

    const result = await useCase.execute(new GetBrandingQuery(orgId));

    expect(result.faviconUrl).toBe('https://storage.example/favicon.png');
  });

  it('should serve the favicon URL from cache on subsequent calls', async () => {
    repository.findByOrgId.mockResolvedValue(
      new Branding({
        orgId,
        faviconStoragePath: `${orgId}/branding/favicon.png`,
      }),
    );

    await useCase.execute(new GetBrandingQuery(orgId));
    await useCase.execute(new GetBrandingQuery(orgId));

    expect(getPresignedUrlUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('should re-resolve the favicon URL after the cache is invalidated', async () => {
    repository.findByOrgId.mockResolvedValue(
      new Branding({
        orgId,
        faviconStoragePath: `${orgId}/branding/favicon.png`,
      }),
    );

    await useCase.execute(new GetBrandingQuery(orgId));
    useCase.invalidateCache(orgId);
    await useCase.execute(new GetBrandingQuery(orgId));

    expect(getPresignedUrlUseCase.execute).toHaveBeenCalledTimes(2);
  });

  it('should return null faviconUrl when presigned URL resolution fails', async () => {
    repository.findByOrgId.mockResolvedValue(
      new Branding({
        orgId,
        faviconStoragePath: `${orgId}/branding/favicon.png`,
      }),
    );
    getPresignedUrlUseCase.execute.mockRejectedValue(
      new Error('storage unavailable'),
    );

    const result = await useCase.execute(new GetBrandingQuery(orgId));

    expect(result.faviconUrl).toBeNull();
  });

  it('should throw UnexpectedBrandingError when the repository throws an unexpected error', async () => {
    repository.findByOrgId.mockRejectedValue(new Error('DB connection lost'));

    await expect(useCase.execute(new GetBrandingQuery(orgId))).rejects.toThrow(
      UnexpectedBrandingError,
    );
  });
});
