import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { GetMonthlyCreditUsageForApiKeysQuery } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-api-keys/get-monthly-credit-usage-for-api-keys.query';
import { GetMonthlyCreditUsageForApiKeysUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-api-keys/get-monthly-credit-usage-for-api-keys.use-case';
import { ListApiKeysByOrgUseCase } from 'src/iam/api-keys/application/use-cases/list-api-keys-by-org/list-api-keys-by-org.use-case';
import { UnexpectedCreditLimitError } from 'src/iam/credit-limits/application/credit-limits.errors';
import { CreditLimitRepository } from 'src/iam/credit-limits/application/ports/credit-limit.repository';
import type { ApiKeyCreditLimit } from 'src/iam/credit-limits/domain/api-key-credit-limit.entity';
import type { ApiKeyCreditLimitOverviewItem } from './api-key-credit-limit.view';
import { GetApiKeyCreditLimitsOverviewQuery } from './get-api-key-credit-limits-overview.query';

@Injectable()
export class GetApiKeyCreditLimitsOverviewUseCase {
  private readonly logger = new Logger(
    GetApiKeyCreditLimitsOverviewUseCase.name,
  );

  constructor(
    private readonly creditLimitRepository: CreditLimitRepository,
    private readonly contextService: ContextService,
    private readonly listApiKeysByOrgUseCase: ListApiKeysByOrgUseCase,
    private readonly getMonthlyCreditUsageForApiKeysUseCase: GetMonthlyCreditUsageForApiKeysUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedCreditLimitError)
  async execute(
    query: GetApiKeyCreditLimitsOverviewQuery = new GetApiKeyCreditLimitsOverviewQuery(),
  ): Promise<ApiKeyCreditLimitOverviewItem[]> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.log({ orgId }, 'Listing API key credit limits');
    const limits = await this.creditLimitRepository.findApiKeyLimits(orgId);
    if (limits.length === 0) {
      return [];
    }

    return this.enrich(orgId, limits, query.since);
  }

  private async enrich(
    orgId: UUID,
    limits: ApiKeyCreditLimit[],
    since?: Date,
  ): Promise<ApiKeyCreditLimitOverviewItem[]> {
    const apiKeys = await this.listApiKeysByOrgUseCase.execute();
    const apiKeyById = new Map(apiKeys.map((apiKey) => [apiKey.id, apiKey]));
    const existingIds = limits
      .map((limit) => limit.apiKeyId)
      .filter((apiKeyId) => apiKeyById.has(apiKeyId));
    const usageByApiKey =
      existingIds.length === 0
        ? new Map<UUID, number>()
        : await this.getMonthlyCreditUsageForApiKeysUseCase.execute(
            new GetMonthlyCreditUsageForApiKeysQuery(orgId, existingIds, since),
          );

    return limits.map(({ apiKeyId, monthlyCredits }) => ({
      apiKeyId,
      name: apiKeyById.get(apiKeyId)?.name ?? '',
      monthlyCredits,
      creditsUsed: apiKeyById.has(apiKeyId)
        ? (usageByApiKey.get(apiKeyId) ?? 0)
        : 0,
    }));
  }
}
