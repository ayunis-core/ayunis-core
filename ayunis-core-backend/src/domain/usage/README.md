# Usage Domain

The Usage domain is responsible for tracking and analyzing user interactions with AI models in the Ayunis Core system. It provides comprehensive usage analytics for administrators to monitor token consumption, costs, and user activity patterns.

## Overview

This domain implements usage collection, aggregation, and reporting functionality that supports both cloud and self-hosted deployments with different cost visibility requirements. The module follows Feature-Sliced Design architecture principles and uses CQRS pattern for operations.

## Key Features

- **Usage Collection**: Automatic tracking of token usage during AI inference
- **Cost Calculation**: Self-hosted deployment cost tracking with configurable pricing
- **Usage Analytics**: Provider, model, and user-level usage statistics
- **Deployment Mode Awareness**: Conditional cost information based on hosting type
- **Time-based Analysis**: Flexible date range queries and time series data
- **Pagination & Search**: Efficient handling of large user datasets
- **Model Distribution**: Smart grouping of less-used models into "Others" category
- **User Activity Tracking**: Automatic detection of active vs inactive users

## Architecture

### Domain Layer

#### Entities
- **Usage**: Core domain entity representing a single usage record with token counts, cost, and metadata
- **ProviderUsage**: Aggregated usage statistics grouped by model provider with time series data
- **UsageStats**: Overall usage statistics including totals, active users, and top models
- **ModelDistribution**: Usage distribution by individual models with percentage breakdown
- **UserUsageItem**: Per-user usage statistics with optional model breakdown
- **ModelBreakdownItem**: Detailed model usage within a user's usage data
- **TimeSeriesPoint**: Time-based data point for trend analysis

#### Value Objects
- **UsageAggregationType**: Enum for different aggregation strategies (by_provider, by_model, by_user, by_date, by_organization)
- **UserActivityStatus**: Enum for user activity classification (active, inactive)
- **UsageConstants**: Configuration constants including thresholds, limits, and defaults

### Application Layer

#### Use Cases
- **CollectUsageUseCase**: Collects and persists usage data with cost calculation
- **GetProviderUsageUseCase**: Retrieves provider-level usage statistics with optional time series
- **GetModelDistributionUseCase**: Retrieves model distribution with "Others" grouping
- **GetUserUsageUseCase**: Retrieves paginated user usage with search and sorting
- **GetUsageStatsUseCase**: Retrieves overall usage statistics

#### Ports
- **UsageRepository**: Abstract repository interface defining persistence operations
  - Basic CRUD operations (save, saveBatch)
  - Query methods (findByOrganization, findByUser, findByModel)
  - Analytics queries (getProviderUsage, getModelDistribution, getUserUsage, getUsageStats)
  - Utility methods (deleteOlderThan, getUsageCount)

#### Commands/Queries
- **CollectUsageCommand**: Command for collecting new usage data
- **GetProviderUsageQuery**: Query for provider usage with filters
- **GetModelDistributionQuery**: Query for model distribution
- **GetUserUsageQuery**: Query for user usage with pagination and search
- **GetUsageStatsQuery**: Query for overall statistics

### Infrastructure Layer

- **LocalUsageRepository**: TypeORM-based persistence implementation
- **UsageRecord**: Database entity with optimized indexes
- **UsageMapper**: Domain-to-record conversion utilities
- **UsageQueryMapper**: Query result mapping utilities

### Presentation Layer

- **AdminUsageController**: REST API endpoints for usage analytics
- **DTOs**: Response data transfer objects
  - UsageStatsResponseDto
  - ProviderUsageResponseDto
  - ProviderUsageChartResponseDto
  - ModelDistributionResponseDto
  - UserUsageResponseDto
  - UsageConfigResponseDto
- **Mappers**: Domain-to-DTO conversion utilities

## Usage Collection

Usage data is automatically collected during AI inference through integration with the `ExecuteRunUseCase`:

- **Non-streaming**: Collects usage after inference completion
- **Streaming**: Accumulates usage from streaming chunks
- **Fire-and-forget**: Doesn't block main inference flow
- **Error handling**: Graceful failure without affecting user experience
- **Cost Calculation**: Automatic cost calculation for self-hosted deployments based on model pricing

### Collection Process

1. Usage data is collected after inference completion
2. Cost is calculated based on model pricing (self-hosted only)
3. Usage entity is created and persisted asynchronously
4. Errors are logged but don't affect the main inference flow

## API Endpoints

All endpoints are prefixed with `/admin/usage` and require admin authentication.

### Configuration
- `GET /admin/usage/config` - Get deployment mode and cost display settings

### Analytics
- `GET /admin/usage/stats` - Get overall usage statistics
  - Query params: `startDate`, `endDate` (optional)
- `GET /admin/usage/providers` - Get provider usage breakdown with time series
  - Query params: `startDate`, `endDate`, `includeTimeSeries`, `provider`, `modelId` (optional)
- `GET /admin/usage/providers/chart` - Get chart-ready provider time series aligned by date
  - Query params: `startDate`, `endDate`, `provider`, `modelId` (optional)
- `GET /admin/usage/models` - Get model distribution with "Others" grouping
  - Query params: `startDate`, `endDate`, `maxModels`, `modelId` (optional)
- `GET /admin/usage/users` - Get user usage with pagination and search
  - Query params: `startDate`, `endDate`, `limit`, `offset`, `search`, `sortBy`, `sortOrder`, `includeModelBreakdown` (optional)

## Deployment Modes

### Cloud Mode
- Pure usage tracking without cost information
- Cost fields automatically filtered from responses
- Focus on token consumption and request patterns
- No cost calculation or storage

### Self-hosted Mode
- Full cost tracking and reporting
- Configurable pricing per provider/model
- Cost calculations in EUR (default currency) with 6 decimal precision
- Cost information included in all analytics responses

## Database Schema

The usage table (`UsageRecord`) includes optimized indexes for common query patterns:
- Organization + Date (primary queries)
- User + Date (user-specific analysis)
- Model + Date (model performance)
- Provider + Date (provider comparison)
- Combined Organization + Provider + Date (dashboard queries)

### Schema Fields
- `id`: UUID primary key
- `userId`: UUID reference to user
- `organizationId`: UUID reference to organization
- `modelId`: UUID reference to model
- `provider`: Model provider enum
- `inputTokens`: Number of input tokens
- `outputTokens`: Number of output tokens
- `totalTokens`: Total tokens (input + output)
- `cost`: Optional cost in EUR
- `currency`: Optional currency code
- `requestId`: UUID reference to request
- `createdAt`: Timestamp

## Constants and Configuration

- **ACTIVE_USER_DAYS_THRESHOLD**: 30 days (determines active vs inactive users)
- **MAX_INDIVIDUAL_MODELS_IN_CHART**: 10 (models beyond this grouped as "Others")
- **DEFAULT_USER_USAGE_LIMIT**: 50 users per page
- **MAX_USER_USAGE_LIMIT**: 1000 users per page
- **MAX_DATE_RANGE_DAYS**: 730 days (2 years, guard against heavy queries)
- **MIN_COST_THRESHOLD**: 0.000001 (minimum cost value)
- **DEFAULT_CURRENCY**: EUR
- **COST_DECIMAL_PLACES**: 6

## Performance Considerations

- **Async Collection**: Usage collection runs asynchronously to avoid blocking inference
- **Optimized Queries**: Strategic indexing for dashboard performance
- **Pagination**: Efficient handling of large user datasets (configurable limits)
- **Aggregation**: Database-level aggregations for better performance
- **Time Series**: Optional time series data to reduce payload when not needed
- **Batch Operations**: Support for batch usage saving
- **Date Range Limits**: Maximum date range to prevent heavy queries

## Error Handling

- **InvalidUsageDataError**: Thrown when usage data validation fails
- **UsageCollectionFailedError**: Thrown when usage collection encounters errors
- Errors are logged but don't affect the main inference flow
- Graceful degradation ensures user experience is not impacted

## Future Enhancements

- Real-time usage streaming
- Advanced cost modeling per model/provider
- Usage alerts and quotas
- Export functionality for usage reports
- Integration with billing systems
- Custom date range presets
- Usage forecasting and trends