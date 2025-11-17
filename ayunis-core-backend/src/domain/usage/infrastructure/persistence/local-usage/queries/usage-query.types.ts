import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { ModelProvider } from '../../../../../models/domain/value-objects/model-provider.enum';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';

export interface ProviderStatsRow {
  provider: ModelProvider | string;
  tokens: string; // numeric aggregates come back as strings
  requests: string;
  cost: string | null;
}

export interface ModelStatsRow {
  modelId: UUID;
  provider: ModelProvider;
  modelName: string | null;
  displayName: string | null;
  tokens: string;
  requests: string;
  cost: string | null;
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
  cost: string | null;
}

export interface UsageAggregateRow {
  totalTokens: string | null;
  totalRequests: string;
  totalCost: string | null;
  totalUsers: string;
}

export interface UserUsageRow {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  tokens: string | null;
  requests: string;
  cost: string | null;
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

