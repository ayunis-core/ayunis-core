import type { Repository } from 'typeorm';
import type { UUID } from 'crypto';
import type { ModelProvider } from '../../../../../models/domain/value-objects/model-provider.enum';
import type { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';

export interface ProviderStatsRow {
  provider: ModelProvider | string;
  tokens: string; // numeric aggregates come back as strings
  requests: string;
}

export interface ModelStatsRow {
  modelId: UUID;
  provider: ModelProvider;
  modelName: string | null;
  displayName: string | null;
  tokens: string;
  requests: string;
}

export interface TopModelRow {
  modelId: UUID;
  displayName: string | null;
  tokens: string;
}

export interface TimeSeriesRow {
  date: string | Date;
  tokens: string;
  requests: string;
}

export interface UsageAggregateRow {
  totalTokens: string | null;
  totalRequests: string;
  totalUsers: string;
}

export interface UserUsageRow {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  tokens: string | null;
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
