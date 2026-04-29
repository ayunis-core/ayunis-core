import { QuotaLimitResolverService } from './quota-limit-resolver.service';
import type { GetFairUseLimitsUseCase } from 'src/iam/platform-config/application/use-cases/get-fair-use-limits/get-fair-use-limits.use-case';
import type { FairUseLimitsByTier } from 'src/iam/platform-config/domain/fair-use-limits';
import { QuotaType } from '../../domain/quota-type.enum';

describe('QuotaLimitResolverService', () => {
  let service: QuotaLimitResolverService;
  let getFairUseLimitsUseCase: jest.Mocked<GetFairUseLimitsUseCase>;

  const limits: FairUseLimitsByTier = {
    low: { limit: 1234, windowMs: 11_111 },
    medium: { limit: 567, windowMs: 22_222 },
    high: { limit: 89, windowMs: 33_333 },
    images: { limit: 42, windowMs: 44_444 },
  };

  beforeEach(() => {
    getFairUseLimitsUseCase = {
      execute: jest.fn().mockResolvedValue(limits),
    } as unknown as jest.Mocked<GetFairUseLimitsUseCase>;

    service = new QuotaLimitResolverService(getFairUseLimitsUseCase);
  });

  it('routes FAIR_USE_MESSAGES_LOW to the low tier from platform config', async () => {
    const result = await service.resolve(QuotaType.FAIR_USE_MESSAGES_LOW);

    expect(result).toEqual(limits.low);
    expect(getFairUseLimitsUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('routes FAIR_USE_MESSAGES_MEDIUM to the medium tier from platform config', async () => {
    const result = await service.resolve(QuotaType.FAIR_USE_MESSAGES_MEDIUM);

    expect(result).toEqual(limits.medium);
  });

  it('routes FAIR_USE_MESSAGES_HIGH to the high tier from platform config', async () => {
    const result = await service.resolve(QuotaType.FAIR_USE_MESSAGES_HIGH);

    expect(result).toEqual(limits.high);
  });

  it('routes FAIR_USE_IMAGES to the images bucket from platform config', async () => {
    const result = await service.resolve(QuotaType.FAIR_USE_IMAGES);

    expect(result).toEqual(limits.images);
  });

  it('reads platform config on every call so super-admin updates take effect immediately', async () => {
    await service.resolve(QuotaType.FAIR_USE_MESSAGES_LOW);
    await service.resolve(QuotaType.FAIR_USE_MESSAGES_MEDIUM);

    expect(getFairUseLimitsUseCase.execute).toHaveBeenCalledTimes(2);
  });
});
