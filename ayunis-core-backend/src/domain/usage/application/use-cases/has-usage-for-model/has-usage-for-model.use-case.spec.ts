import { randomUUID } from 'crypto';
import type { UsageRepository } from 'src/domain/usage/application/ports/usage.repository';
import { UnexpectedUsageError } from 'src/domain/usage/application/usage.errors';
import { HasUsageForModelQuery } from './has-usage-for-model.query';
import { HasUsageForModelUseCase } from './has-usage-for-model.use-case';

describe('HasUsageForModelUseCase', () => {
  let usageRepository: jest.Mocked<Pick<UsageRepository, 'existsByModelId'>>;
  let useCase: HasUsageForModelUseCase;

  beforeEach(() => {
    usageRepository = { existsByModelId: jest.fn() };
    useCase = new HasUsageForModelUseCase(
      usageRepository as unknown as UsageRepository,
    );
  });

  it('returns whether historical usage references the model', async () => {
    const modelId = randomUUID();
    usageRepository.existsByModelId.mockResolvedValue(true);

    const result = await useCase.execute(new HasUsageForModelQuery(modelId));

    expect(result).toBe(true);
  });

  it('wraps unexpected persistence errors', async () => {
    usageRepository.existsByModelId.mockRejectedValue(
      new Error('usage lookup failed'),
    );

    await expect(
      useCase.execute(new HasUsageForModelQuery(randomUUID())),
    ).rejects.toBeInstanceOf(UnexpectedUsageError);
  });
});
