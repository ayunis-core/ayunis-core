# Design Document

## Overview

The Admin Usage Dashboard is a comprehensive analytics system that tracks and visualizes AI model usage across an organization. The system consists of a backend usage tracking service that collects data during model inference and a frontend dashboard that presents this data through interactive charts and tables.

## Architecture

The system follows a hexagonal architecture pattern with clear separation between data collection, storage, and presentation layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Provider Chart  │  │ Model Chart     │  │ User Table      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Layer (Controllers)                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Usage Stats     │  │ Provider Usage  │  │ User Usage      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer (Use Cases)                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Collect Usage   │  │ Aggregate Usage │  │ Query Usage     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Domain Layer (Entities)                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Usage Entity    │  │ Model Entity    │  │ User Entity     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                Infrastructure Layer (Persistence)               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Usage Repository│  │ Usage Records   │  │ Database        │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Existing Infrastructure to Leverage

The system already has token usage tracking infrastructure that we can use:

1. **InferenceResponse.meta**: Already contains `inputTokens`, `outputTokens`, `totalTokens`
2. **ExecuteRunUseCase**: Already processes `InferenceResponse` but ignores the meta data
3. **App Configuration**: Already has `isSelfHosted`/`isCloudHosted` detection

**Integration Points in ExecuteRunUseCase**:
```typescript
// Current code (around line 412-431)
const inferenceResponse = await this.triggerInferenceUseCase.execute(/*...*/);

// Add usage collection here:
await this.usageCollectionService.collectUsage({
  userId,
  organizationId: orgId,
  model: params.model,
  inferenceResponse, // ✅ Already available with meta data
  requestId: /* generate or use existing */
});

const assistantMessage = await this.createAssistantMessageUseCase.execute(/*...*/);
```

### Backend Components

#### 0. Deployment Mode Configuration

The system leverages existing deployment mode detection from `app.config.ts`:

```typescript
// Existing configuration in app.config.ts
export const appConfig = registerAs('app', () => ({
  isSelfHosted: process.env.APP_ENVIRONMENT === 'self-hosted',
  isCloudHosted: process.env.APP_ENVIRONMENT === 'cloud',
  // ... other config
}));

// Usage in services
@Injectable()
export class UsageCollectionService {
  constructor(private readonly configService: ConfigService) {}
  
  private shouldCalculateCost(): boolean {
    return this.configService.get<boolean>('app.isSelfHosted', false);
  }
}
```

#### 1. Usage Domain Model

```typescript
// Usage Entity - Core business object
class Usage {
  id: UUID;
  userId: UUID;
  organizationId: UUID;
  modelId: UUID;
  provider: ModelProvider;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost?: number;
  currency?: string;
  requestId: UUID;
  createdAt: Date;
}

// Enhanced Model Entity with Cost Information
class LanguageModel extends Model {
  // Existing properties...
  inputTokenCost?: number;  // Cost per 1K input tokens
  outputTokenCost?: number; // Cost per 1K output tokens
  currency?: string;        // Currency for cost calculation
}
```

#### 2. Usage Collection Service

**Leverages Existing Infrastructure**: The `InferenceResponse.meta` already contains token usage data:

```typescript
// Existing InferenceResponse (no changes needed)
export class InferenceResponse {
  constructor(
    public content: Array<TextMessageContent | ToolUseMessageContent | ThinkingMessageContent>,
    public meta: {
      inputTokens?: number;    // ✅ Already available
      outputTokens?: number;   // ✅ Already available  
      totalTokens?: number;    // ✅ Already available
    },
  ) {}
}

// New Usage Collection Service
interface UsageCollectionService {
  collectUsage(params: {
    userId: UUID;
    organizationId: UUID;
    model: LanguageModel;
    inferenceResponse: InferenceResponse; // Uses existing response with meta data
    requestId: UUID;
  }): Promise<void>;
}

// Implementation with deployment mode integration
@Injectable()
export class UsageCollectionService {
  constructor(private readonly configService: ConfigService) {}
  
  async collectUsage(params: CollectUsageParams): Promise<void> {
    const isSelfHosted = this.configService.get<boolean>('app.isSelfHosted', false);
    
    // Extract token data from existing inferenceResponse.meta
    const { inputTokens, outputTokens, totalTokens } = params.inferenceResponse.meta;
    
    const usage = new Usage({
      userId: params.userId,
      organizationId: params.organizationId,
      modelId: params.model.id,
      provider: params.model.provider,
      inputTokens: inputTokens || 0,
      outputTokens: outputTokens || 0,
      totalTokens: totalTokens || (inputTokens || 0) + (outputTokens || 0),
      cost: isSelfHosted ? this.calculateCost(params.model, inputTokens, outputTokens) : undefined,
      currency: isSelfHosted ? params.model.currency : undefined,
      requestId: params.requestId,
    });
    
    await this.usageRepository.save(usage);
  }
}
```

#### 3. Usage Repository Interface

```typescript
interface UsageRepository {
  save(usage: Usage): Promise<void>;
  findByOrganization(orgId: UUID, dateRange: DateRange): Promise<Usage[]>;
  getProviderUsage(orgId: UUID, dateRange: DateRange): Promise<ProviderUsage[]>;
  getModelDistribution(orgId: UUID, dateRange: DateRange): Promise<ModelDistribution[]>;
  getUserUsage(orgId: UUID, dateRange: DateRange, pagination: Pagination): Promise<UserUsageResult>;
  getTotalUsage(orgId: UUID, dateRange: DateRange): Promise<UsageStats>;
}
```

#### 4. Usage Aggregation Use Cases

```typescript
class GetProviderUsageUseCase {
  execute(query: GetProviderUsageQuery): Promise<ProviderUsage[]>;
}

class GetModelDistributionUseCase {
  execute(query: GetModelDistributionQuery): Promise<ModelDistribution[]>;
}

class GetUserUsageUseCase {
  execute(query: GetUserUsageQuery): Promise<UserUsageResult>;
}
```

### Frontend Components

#### 1. Usage Dashboard Page

```typescript
interface UsageSettingsPageProps {
  // Main container component
}

// Composed of:
// - Usage Statistics Cards
// - Provider Comparison Chart
// - Model Distribution Chart  
// - User Usage Table
```

#### 2. Provider Comparison Chart

```typescript
interface ProviderComparisonChartProps {
  startDate?: string;
  endDate?: string;
  showCostInformation?: boolean;
}

// Features:
// - Line chart showing token usage over time
// - Multiple provider lines with different colors
// - Interactive tooltips with usage details
// - Legend with provider percentages
// - Cost information (self-hosted only)
```

#### 3. Model Distribution Chart

```typescript
interface ModelDistributionChartProps {
  startDate?: string;
  endDate?: string;
  showCostInformation?: boolean;
}

// Features:
// - Donut chart with model usage percentages
// - Interactive segments with hover effects
// - Model breakdown list with statistics
// - Cost breakdown per model (self-hosted only)
// - "Others" category for less-used models
```

#### 4. User Usage Table

```typescript
interface UserUsageTableProps {
  startDate?: string;
  endDate?: string;
  showCostInformation?: boolean;
}

// Features:
// - Paginated table with user statistics
// - Search and sorting functionality
// - Activity status indicators
// - Model breakdown per user
// - Cost information per user (self-hosted only)
```

## Data Models

### Database Schema

```sql
-- Usage tracking table
CREATE TABLE usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    model_id UUID NOT NULL REFERENCES models(id),
    provider VARCHAR(50) NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    cost DECIMAL(10,6), -- Nullable for cloud deployments
    currency VARCHAR(3), -- ISO currency code
    request_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for efficient querying
    INDEX idx_usage_org_date (organization_id, created_at),
    INDEX idx_usage_user_date (user_id, created_at),
    INDEX idx_usage_model_date (model_id, created_at),
    INDEX idx_usage_provider_date (provider, created_at)
);

-- Enhanced models table with cost information
ALTER TABLE language_models ADD COLUMN input_token_cost DECIMAL(10,6);
ALTER TABLE language_models ADD COLUMN output_token_cost DECIMAL(10,6);
ALTER TABLE language_models ADD COLUMN currency VARCHAR(3);
```

### API Response Models

```typescript
// Usage Statistics Overview
interface UsageStatsDto {
  totalTokens: number;
  totalRequests: number;
  totalCost?: number; // Only for self-hosted
  currency?: string;
  topModels: string[];
  activeUsers: number;
  totalUsers: number;
  dateRange: DateRange;
}

// Provider Usage Data
interface ProviderUsageDto {
  provider: string;
  tokens: number;
  requests: number;
  cost?: number; // Only for self-hosted
  percentage: number;
  timeSeriesData: TimeSeriesPoint[];
}

// Model Distribution Data
interface ModelDistributionDto {
  modelId: string;
  modelName: string;
  displayName: string;
  provider: string;
  tokens: number;
  requests: number;
  cost?: number; // Only for self-hosted
  percentage: number;
}

// User Usage Data
interface UserUsageDto {
  users: UserUsageItemDto[];
  total: number;
  limit: number;
  offset: number;
}

interface UserUsageItemDto {
  userId: string;
  userName: string;
  userEmail: string;
  tokens: number;
  requests: number;
  cost?: number; // Only for self-hosted
  lastActivity: Date;
  isActive: boolean;
  modelBreakdown: ModelBreakdownDto[];
}
```

## Error Handling

### Backend Error Handling

```typescript
// Usage-specific errors
export enum UsageErrorCode {
  USAGE_COLLECTION_FAILED = 'USAGE_COLLECTION_FAILED',
  USAGE_AGGREGATION_FAILED = 'USAGE_AGGREGATION_FAILED',
  INVALID_DATE_RANGE = 'INVALID_DATE_RANGE',
  USAGE_DATA_NOT_FOUND = 'USAGE_DATA_NOT_FOUND',
}

export class UsageCollectionFailedError extends ApplicationError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(`Usage collection failed: ${reason}`, UsageErrorCode.USAGE_COLLECTION_FAILED, 500, metadata);
  }
}
```

### Frontend Error Handling

```typescript
// Graceful error handling in components
const { data, isLoading, isError, error } = useUsageStats(params, {
  query: {
    onError: (error) => {
      if (error.response?.status === 403) {
        showError(t("errors.insufficientPermissions"));
      } else {
        showError(t("errors.usageDataLoadFailed"));
      }
    }
  }
});
```

## Testing Strategy

### Backend Testing

1. **Unit Tests**
   - Usage entity validation and business logic
   - Usage collection service functionality
   - Aggregation use case calculations
   - Cost calculation accuracy

2. **Integration Tests**
   - Usage repository database operations
   - API endpoint responses and error handling
   - Usage collection during inference execution

3. **Performance Tests**
   - Usage collection impact on inference performance
   - Database query performance with large datasets
   - API response times for dashboard data

### Frontend Testing

1. **Component Tests**
   - Chart rendering with different data sets
   - Table pagination and sorting functionality
   - Deployment mode conditional rendering

2. **Integration Tests**
   - API integration and data flow
   - Error handling and loading states
   - User interactions and state management

3. **E2E Tests**
   - Complete dashboard workflow
   - Admin navigation and access control
   - Data refresh and real-time updates

## Performance Considerations

### Backend Optimizations

1. **Database Indexing**
   - Composite indexes on organization_id + created_at
   - Separate indexes for user, model, and provider queries
   - Partitioning by date for large datasets

2. **Caching Strategy**
   - Cache aggregated usage statistics for common time ranges
   - Redis caching for frequently accessed data
   - Cache invalidation on new usage data

3. **Batch Processing**
   - Batch usage record insertions to reduce database load
   - Background aggregation jobs for historical data
   - Async processing for non-critical usage collection

### Frontend Optimizations

1. **Data Loading**
   - Lazy loading for chart components
   - Pagination for user usage table
   - Debounced search and filtering

2. **Caching**
   - TanStack Query caching for API responses
   - Stale-while-revalidate strategy for dashboard data
   - Optimistic updates where appropriate

## Security Considerations

1. **Access Control**
   - Admin-only access to usage dashboard
   - Organization-scoped data access
   - Proper authentication and authorization

2. **Data Privacy**
   - User data anonymization options
   - Audit logging for usage data access
   - Compliance with data protection regulations

3. **API Security**
   - Rate limiting for usage API endpoints
   - Input validation and sanitization
   - Secure handling of cost information