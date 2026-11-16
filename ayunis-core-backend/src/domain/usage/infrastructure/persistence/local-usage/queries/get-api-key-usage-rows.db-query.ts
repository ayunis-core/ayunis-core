import type { SelectQueryBuilder } from 'typeorm';
import { UsageRecord } from 'src/domain/usage/infrastructure/persistence/local-usage/schema/usage.record';
import type {
  ApiKeyUsageRow,
  GetApiKeyUsageQueryParams,
} from './usage-query.types';

export async function getApiKeyUsageRows(
  params: GetApiKeyUsageQueryParams,
): Promise<ApiKeyUsageRow[]> {
  const usageSubquery = buildUsageSubquery(params);

  const query = params.apiKeyRepository
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
    .where('apiKey.orgId = :apiKeyOrgId', {
      apiKeyOrgId: params.organizationId,
    })
    .setParameters(usageSubquery.getParameters());

  const activeInRange = activeInRangeCondition(params);
  if (activeInRange) {
    query.andWhere(`("usageagg"."apiKeyId" IS NOT NULL OR (${activeInRange}))`);
  }

  return query
    .orderBy('COALESCE("usageagg"."totalTokens", 0)', 'DESC')
    .addOrderBy('apiKey.name', 'ASC')
    .addOrderBy('apiKey.id', 'ASC')
    .getRawMany<ApiKeyUsageRow>();
}

function buildUsageSubquery(
  params: GetApiKeyUsageQueryParams,
): SelectQueryBuilder<UsageRecord> {
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
  return usageSubquery;
}

// A key that did not exist or was already revoked or expired during the
// whole range can have no usage in it, so listing it only adds noise.
function activeInRangeCondition(
  params: GetApiKeyUsageQueryParams,
): string | null {
  const conditions: string[] = [];
  if (params.endDate) {
    conditions.push('"apiKey"."createdAt" < :endDate');
  }
  if (params.startDate) {
    conditions.push(
      '("apiKey"."revoked_at" IS NULL OR "apiKey"."revoked_at" > :startDate)',
      '("apiKey"."expires_at" IS NULL OR "apiKey"."expires_at" > :startDate)',
    );
  }
  return conditions.length > 0 ? conditions.join(' AND ') : null;
}
