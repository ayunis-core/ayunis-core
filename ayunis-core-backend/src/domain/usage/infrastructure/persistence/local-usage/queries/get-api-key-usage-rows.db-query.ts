import { UsageRecord } from 'src/domain/usage/infrastructure/persistence/local-usage/schema/usage.record';
import type {
  ApiKeyUsageRow,
  GetApiKeyUsageQueryParams,
} from './usage-query.types';

export async function getApiKeyUsageRows(
  params: GetApiKeyUsageQueryParams,
): Promise<ApiKeyUsageRow[]> {
  const usageSubquery = params.apiKeyRepository.manager
    .createQueryBuilder()
    .select('usage.apiKeyId', 'apiKeyId')
    .addSelect('SUM(usage.inputTokens)', 'inputTokens')
    .addSelect('SUM(usage.outputTokens)', 'outputTokens')
    .addSelect('SUM(usage.totalTokens)', 'totalTokens')
    .addSelect('COUNT(usage.id)', 'requests')
    .addSelect('COUNT(usage.creditsConsumed)', 'pricedRequests')
    .addSelect('SUM(usage.creditsConsumed)', 'credits')
    .addSelect('MAX(usage.createdAt)', 'lastUsedAt')
    .from(UsageRecord, 'usage')
    .where('usage.organizationId = :orgId', { orgId: params.organizationId })
    .andWhere('usage.apiKeyId IS NOT NULL')
    .groupBy('usage.apiKeyId');

  if (params.startDate) {
    usageSubquery.andWhere('usage.createdAt >= :startDate', {
      startDate: params.startDate,
    });
  }
  if (params.endDate) {
    usageSubquery.andWhere('usage.createdAt < :endDate', {
      endDate: params.endDate,
    });
  }

  return params.apiKeyRepository
    .createQueryBuilder('apiKey')
    .leftJoin(
      `(${usageSubquery.getQuery()})`,
      'usageagg',
      '"usageagg"."apiKeyId" = "apiKey"."id"',
    )
    .select('apiKey.id', 'apiKeyId')
    .addSelect('apiKey.name', 'name')
    .addSelect('apiKey.revokedAt', 'revokedAt')
    .addSelect('apiKey.expiresAt', 'expiresAt')
    .addSelect('COALESCE("usageagg"."inputTokens", 0)', 'inputTokens')
    .addSelect('COALESCE("usageagg"."outputTokens", 0)', 'outputTokens')
    .addSelect('COALESCE("usageagg"."totalTokens", 0)', 'totalTokens')
    .addSelect('COALESCE("usageagg"."requests", 0)', 'requests')
    .addSelect('COALESCE("usageagg"."pricedRequests", 0)', 'pricedRequests')
    .addSelect('"usageagg"."credits"', 'credits')
    .addSelect('"usageagg"."lastUsedAt"', 'lastUsedAt')
    .where('apiKey.orgId = :orgId', { orgId: params.organizationId })
    .setParameters(usageSubquery.getParameters())
    .orderBy('COALESCE("usageagg"."totalTokens", 0)', 'DESC')
    .addOrderBy('apiKey.name', 'ASC')
    .addOrderBy('apiKey.id', 'ASC')
    .getRawMany<ApiKeyUsageRow>();
}
