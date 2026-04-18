Usage Analytics
Token consumption and cost tracking across AI model providers

Usage tracks every AI inference request—recording tokens consumed, costs incurred, and models used—then aggregates this data into dashboards showing provider distribution, model popularity, and per-user consumption.

The usage module provides comprehensive analytics for AI resource consumption. The `Usage` entity records each inference request with user, organization, model, provider, token counts (input/output/total), cost, and currency. Supporting entities include `ProviderUsage` (aggregated provider stats with time series), `ModelDistribution` (model popularity breakdown), `UsageStats` (aggregate metrics like active users and request counts), `UserUsageItem` (per-user consumption), and `TimeSeriesPoint` (temporal data).

**Organization-scoped use cases**: collecting usage after each run (`CollectUsageUseCase` — includes `calculateCredits` logic that converts cost to credits via `GetCreditsPerEuroUseCase` from **platform-config**; accepts either a `LanguageModel` or an `ImageGenerationModel` via `CollectableUsageModel`), querying provider-level usage (`GetProviderUsageUseCase`), model distribution analytics (`GetModelDistributionUseCase`), aggregate stats (`GetUsageStatsUseCase`), per-user usage reports (`GetUserUsageUseCase`), and monthly credit usage tracking (`GetMonthlyCreditUsageUseCase`).

**Services**: `CollectUsageAsyncService` (`application/services/collect-usage-async.service.ts`) is the fire-and-forget wrapper around `CollectUsageUseCase`. It emits `TokensConsumedEvent` (`application/events/tokens-consumed.event.ts`) for metrics listeners and then invokes `CollectUsageUseCase`; errors are logged but do not block the calling flow. Exported from `UsageModule` so both the runs module (streaming/non-streaming inference) and the tools module (`GenerateImageToolHandler`) can drive collection.

**Global (cross-organization) use cases**: `GetGlobalProviderUsageUseCase`, `GetGlobalModelDistributionUseCase`, and `GetGlobalUserUsageUseCase` aggregate usage data across all organizations for super admin analytics dashboards.

**Ports**: `UsageRepository` defines abstract methods for both organization-scoped queries (`getMonthlyCreditUsage`) and global analytics (`getGlobalProviderUsage`, `getGlobalModelDistribution`, `getGlobalUserUsage`).

**Presentation layer**: `UsageController` serves organization member requests. Super admin controllers include `SuperAdminUsageController` (org-scoped stats/models), `SuperAdminUsageDataController` (org-scoped providers/users), and `SuperAdminGlobalUsageController` (cross-organization global analytics).

Complex SQL queries handle time-series aggregation and ranking. The module integrates with **runs** which trigger usage collection after inference, **models** for model and provider metadata resolution, **platform-config** for credit pricing configuration, and the **IAM** context for organization-scoped reporting and cross-organization super admin dashboards.
