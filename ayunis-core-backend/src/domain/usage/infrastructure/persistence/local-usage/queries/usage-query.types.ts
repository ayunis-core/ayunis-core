import type { Repository } from 'typeorm';
import type { UUID } from 'crypto';
import type { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import type { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import type { ApiKeyRecord } from 'src/iam/api-keys/infrastructure/repositories/local/schema/api-key.record';

export interface ProviderStatsRow {
  provider: ModelProvider | string;
  credits: string; // numeric aggregates come back as strings
  requests: string;
}

export interface ModelStatsRow {
  modelId: UUID;
  provider: ModelProvider;
  modelName: string | null;
  displayName: string | null;
  credits: string;
  requests: string;
}

export interface TopModelRow {
  modelId: UUID;
  displayName: string | null;
  credits: string;
}

export interface TimeSeriesRow {
  date: string | Date;
  credits: string;
  requests: string;
}

export interface UsageAggregateRow {
  totalCredits: string | null;
  totalRequests: string;
  totalUsers: string;
}

export interface UserUsageRow {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  credits: string | null;
  requests: string;
  lastActivity: Date | null;
}

export interface GetUserUsageQueryParams {
  userRepository: Repository<UserRecord>;
  organizationId: UUID;
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
  sortField: string; // pre-mapped sort field expression
  sortOrder: 'ASC' | 'DESC';
  offset: number;
  limit: number;
}

type NullableTimestamp = Date | string | null;

export interface ApiKeyUsageRow {
  apiKeyId: string;
  name: string;
  revokedAt: NullableTimestamp;
  expiresAt: NullableTimestamp;
  inputTokens: string;
  outputTokens: string;
  totalTokens: string;
  requests: string;
  pricedRequests: string;
  credits: string | null;
  lastUsedAt: NullableTimestamp;
}

export interface GetApiKeyUsageQueryParams {
  apiKeyRepository: Repository<ApiKeyRecord>;
  organizationId: UUID;
  startDate?: Date;
  endDate?: Date;
}
