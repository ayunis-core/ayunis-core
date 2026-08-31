import { Test, type TestingModule } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { CreditLimitRepository } from 'src/iam/credit-limits/application/ports/credit-limit.repository';
import {
  anApiKeyCreditLimit,
  createMockCreditLimitRepository,
  TEST_API_KEY_ID,
  TEST_ORG_ID,
} from 'src/iam/credit-limits/application/testing/credit-limit.fixtures';
import { ResolveCreditLimitForApiKeyQuery } from './resolve-credit-limit-for-api-key.query';
import { ResolveCreditLimitForApiKeyUseCase } from './resolve-credit-limit-for-api-key.use-case';

describe('ResolveCreditLimitForApiKeyUseCase', () => {
  let useCase: ResolveCreditLimitForApiKeyUseCase;
  let repository: jest.Mocked<CreditLimitRepository>;

  beforeEach(async () => {
    repository = createMockCreditLimitRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResolveCreditLimitForApiKeyUseCase,
        {
          provide: getLoggerToken(ResolveCreditLimitForApiKeyUseCase.name),
          useValue: createPinoLoggerMock(),
        },
        { provide: CreditLimitRepository, useValue: repository },
      ],
    }).compile();

    useCase = module.get(ResolveCreditLimitForApiKeyUseCase);
  });

  it('returns the configured monthly credit limit', async () => {
    repository.findByApiKeyId.mockResolvedValue(
      anApiKeyCreditLimit({ monthlyCredits: 750 }),
    );

    await expect(
      useCase.execute(
        new ResolveCreditLimitForApiKeyQuery(TEST_ORG_ID, TEST_API_KEY_ID),
      ),
    ).resolves.toEqual({ monthlyCreditLimit: 750 });
  });

  it('returns null when the API key has no configured limit', async () => {
    await expect(
      useCase.execute(
        new ResolveCreditLimitForApiKeyQuery(TEST_ORG_ID, TEST_API_KEY_ID),
      ),
    ).resolves.toEqual({ monthlyCreditLimit: null });
  });
});
