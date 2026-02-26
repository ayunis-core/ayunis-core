Usage Analytics
Token consumption and cost tracking across AI model providers

Usage tracks every AI inference request—recording tokens consumed, costs incurred, and models used—then aggregates this data into dashboards showing provider distribution, model popularity, and per-user consumption.

The usage module provides comprehensive analytics for AI resource consumption. The `Usage` entity records each inference request with user, organization, model, provider, token counts (input/output/total), cost, and currency. Supporting entities include `ProviderUsage` (aggregated provider stats with time series), `ModelDistribution` (model popularity breakdown), `UsageStats` (aggregate metrics like active users and request counts), `UserUsageItem` (per-user consumption), and `TimeSeriesPoint` (temporal data).

**Organization-scoped use cases**: collecting usage after each run (`CollectUsageUseCase`), querying provider-level usage (`GetProviderUsageUseCase`), model distribution analytics (`GetModelDistributionUseCase`), aggregate stats (`GetUsageStatsUseCase`), and per-user usage reports (`GetUserUsageUseCase`).

**Global (cross-organization) use cases**: `GetGlobalProviderUsageUseCase`, `GetGlobalModelDistributionUseCase`, and `GetGlobalUserUsageUseCase` aggregate usage data across all organizations for super admin analytics dashboards.

**Ports**: `UsageRepository` defines abstract methods for both organization-scoped queries and global analytics (`getGlobalProviderUsage`, `getGlobalModelDistribution`, `getGlobalUserUsage`).

**Presentation layer**: `UsageController` serves organization member requests. Super admin controllers include `SuperAdminUsageController` (org-scoped stats/models), `SuperAdminUsageDataController` (org-scoped providers/users), and `SuperAdminGlobalUsageController` (cross-organization global analytics).

Complex SQL queries handle time-series aggregation and ranking. The module integrates with **runs** which trigger usage collection after inference, **models** for model and provider metadata resolution, and the **IAM** context for organization-scoped reporting and cross-organization super admin dashboards.
