import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { GetMonthlyCreditUsageForApiKeyQuery } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-api-key/get-monthly-credit-usage-for-api-key.query';
import { GetMonthlyCreditUsageForApiKeyUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-api-key/get-monthly-credit-usage-for-api-key.use-case';
import { ApiKeyCreditLimitExceededError } from 'src/iam/credit-limits/application/credit-limits.errors';
import { ResolveCreditLimitForApiKeyQuery } from 'src/iam/credit-limits/application/use-cases/resolve-credit-limit-for-api-key/resolve-credit-limit-for-api-key.query';
import { ResolveCreditLimitForApiKeyUseCase } from 'src/iam/credit-limits/application/use-cases/resolve-credit-limit-for-api-key/resolve-credit-limit-for-api-key.use-case';
import { IsUsageBasedSubscriptionQuery } from 'src/iam/subscriptions/application/use-cases/is-usage-based-subscription/is-usage-based-subscription.query';
import { IsUsageBasedSubscriptionUseCase } from 'src/iam/subscriptions/application/use-cases/is-usage-based-subscription/is-usage-based-subscription.use-case';

@Injectable()
export class ApiKeyCreditLimitGuardService {
  constructor(
    private readonly resolveCreditLimitForApiKeyUseCase: ResolveCreditLimitForApiKeyUseCase,
    private readonly getMonthlyCreditUsageForApiKeyUseCase: GetMonthlyCreditUsageForApiKeyUseCase,
    private readonly isUsageBasedSubscriptionUseCase: IsUsageBasedSubscriptionUseCase,
    @InjectPinoLogger(ApiKeyCreditLimitGuardService.name)
    private readonly logger: PinoLogger,
  ) {}

  async ensureWithinLimit(orgId: UUID, apiKeyId: UUID): Promise<void> {
    const { monthlyCreditLimit } =
      await this.resolveCreditLimitForApiKeyUseCase.execute(
        new ResolveCreditLimitForApiKeyQuery(orgId, apiKeyId),
      );
    if (monthlyCreditLimit === null) return;

    const isUsageBased = await this.isUsageBasedSubscriptionUseCase.execute(
      new IsUsageBasedSubscriptionQuery(orgId),
    );
    if (!isUsageBased) return;

    const { creditsUsed } =
      await this.getMonthlyCreditUsageForApiKeyUseCase.execute(
        new GetMonthlyCreditUsageForApiKeyQuery(orgId, apiKeyId),
      );
    if (creditsUsed < monthlyCreditLimit) return;

    this.logger.warn(
      { apiKeyId, creditsUsed, monthlyCreditLimit },
      'API key credit limit exceeded',
    );
    throw new ApiKeyCreditLimitExceededError({
      apiKeyId,
      creditsUsed,
      limit: monthlyCreditLimit,
    });
  }
}
