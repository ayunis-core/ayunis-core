import { randomUUID } from 'crypto';
import type { Repository } from 'typeorm';
import type { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import type { UsageMapper } from './mappers/usage.mapper';
import type { UsageQueryMapper } from './mappers/usage-query.mapper';
import type { UsageRecord } from './schema/usage.record';
import { LocalUsageRepository } from './local-usage.repository';

describe('LocalUsageRepository', () => {
  it('reports when usage exists for a catalog model', async () => {
    const modelId = randomUUID();
    const usageRepository = {
      existsBy: jest.fn().mockResolvedValue(true),
    } as unknown as Repository<UsageRecord>;
    const repository = new LocalUsageRepository(
      usageRepository,
      {} as Repository<UserRecord>,
      {} as UsageMapper,
      {} as UsageQueryMapper,
    );

    const result = await repository.existsByModelId(modelId);

    expect(result).toBe(true);
    expect(usageRepository.existsBy).toHaveBeenCalledWith({ modelId });
  });
});
