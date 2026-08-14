import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { randomUUID } from 'crypto';
import type { UsageRepository } from '../../ports/usage.repository';
import { UnexpectedUsageError } from '../../usage.errors';
import { HasUsageForModelQuery } from './has-usage-for-model.query';
import { HasUsageForModelUseCase } from './has-usage-for-model.use-case';

describe('HasUsageForModelUseCase', () => {
  let usageRepository: jest.Mocked<Pick<UsageRepository, 'existsByModelId'>>;
  let useCase: HasUsageForModelUseCase;

  beforeEach(() => {
    usageRepository = { existsByModelId: jest.fn() };
    useCase = new HasUsageForModelUseCase(
      usageRepository as unknown as UsageRepository,
      createPinoLoggerMock(),
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
