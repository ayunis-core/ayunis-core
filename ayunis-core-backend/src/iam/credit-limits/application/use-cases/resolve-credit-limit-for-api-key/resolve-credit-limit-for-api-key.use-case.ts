import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedCreditLimitError } from 'src/iam/credit-limits/application/credit-limits.errors';
import { CreditLimitRepository } from 'src/iam/credit-limits/application/ports/credit-limit.repository';
import { ResolveCreditLimitForApiKeyQuery } from './resolve-credit-limit-for-api-key.query';
import type { CreditLimitForApiKey } from './resolve-credit-limit-for-api-key.result';

@Injectable()
export class ResolveCreditLimitForApiKeyUseCase {
  constructor(
    @InjectPinoLogger(ResolveCreditLimitForApiKeyUseCase.name)
    private readonly logger: PinoLogger,
    private readonly creditLimitRepository: CreditLimitRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedCreditLimitError)
  async execute(
    query: ResolveCreditLimitForApiKeyQuery,
  ): Promise<CreditLimitForApiKey> {
    this.logger.info(
      { orgId: query.orgId, apiKeyId: query.apiKeyId },
      'Resolving credit limit for API key',
    );

    const limit = await this.creditLimitRepository.findByApiKeyId(
      query.orgId,
      query.apiKeyId,
    );
    return { monthlyCreditLimit: limit?.monthlyCredits ?? null };
  }
}
