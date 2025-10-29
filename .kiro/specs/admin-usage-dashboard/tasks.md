# Implementation Plan

- [x] 1. Extend model entities with cost information
  - Add cost fields to LanguageModel and EmbeddingModel entities
  - Create database migration for model cost columns
  - Update model creation and management to include cost data
  - _Requirements: 1.3, 7.1_

- [ ] 2. Create usage domain model and entities
  - [ ] 2.1 Create Usage entity with all required fields
    - Define Usage domain entity with user, model, token, and cost information
    - Implement proper validation and business rules
    - _Requirements: 1.1, 1.2_

  - [ ] 2.2 Create usage value objects and enums
    - Define DateRange value object for time-based queries
    - Create usage-related enums and constants
    - _Requirements: 1.5, 2.5_

  - [ ] 2.3 Define usage repository interface
    - Create abstract UsageRepository with all required methods
    - Define query interfaces for aggregation operations
    - _Requirements: 1.4, 2.1, 3.1, 4.1_

- [ ] 3. Implement usage collection system
  - [ ] 3.1 Create usage collection service
    - Leverage existing InferenceResponse.meta (inputTokens, outputTokens, totalTokens)
    - Add cost calculation logic based on model pricing (only for self-hosted mode)
    - Use existing app.config.ts isSelfHosted/isCloudHosted configuration
    - No changes needed to inference.handler.ts - data already available
    - _Requirements: 1.1, 1.3, 5.1, 5.2, 7.1, 7.2_

  - [ ] 3.2 Integrate usage collection into execute run use case
    - Extract token data from existing inferenceResponse.meta in ExecuteRunUseCase
    - Add usage collection call after inference (both streaming and non-streaming)
    - Integrate deployment mode detection using ConfigService
    - Ensure collection doesn't impact inference performance
    - Add proper error handling for collection failures
    - _Requirements: 5.1, 5.2, 7.1, 7.3, 7.5_

  - [ ] 3.3 Implement usage repository with TypeORM
    - Create UsageRecord entity for database persistence
    - Implement LocalUsageRepository with all aggregation methods
    - Add proper indexing and query optimization
    - _Requirements: 1.4, 8.1_

- [ ] 4. Build usage aggregation and query use cases
  - [ ] 4.1 Implement GetProviderUsageUseCase
    - Create use case to aggregate usage by provider
    - Generate time-series data for provider comparison charts
    - Calculate percentages and totals
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 4.2 Implement GetModelDistributionUseCase
    - Create use case to aggregate usage by model
    - Group less-used models into "Others" category
    - Calculate model usage percentages
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 4.3 Implement GetUserUsageUseCase
    - Create use case to get individual user statistics
    - Include model breakdown per user
    - Determine user activity status based on recent usage
    - Support pagination and search functionality
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6_

  - [ ] 4.4 Implement GetUsageStatsUseCase
    - Create use case for overall usage statistics
    - Calculate totals, active users, and top models
    - _Requirements: 8.1, 8.2_

- [ ] 5. Create admin usage API endpoints
  - [ ] 5.1 Implement AdminUsageController
    - Create controller with endpoints for all usage queries
    - Integrate deployment mode detection using ConfigService
    - Conditionally exclude cost information in cloud mode
    - Add proper authentication and authorization
    - Implement date range filtering and pagination
    - _Requirements: 5.1, 5.2, 6.4, 8.1_

  - [ ] 5.2 Create usage DTOs and response models
    - Define all response DTOs for usage data
    - Make cost fields optional based on deployment mode
    - Implement proper serialization and validation
    - _Requirements: 2.1, 3.1, 4.1, 5.1, 5.2_

  - [ ] 5.3 Add OpenAPI documentation for usage endpoints
    - Document all usage API endpoints with proper schemas
    - Include deployment mode behavior in documentation
    - Include examples and parameter descriptions
    - _Requirements: 5.1, 6.4_

- [ ] 6. Build frontend usage dashboard components
  - [ ] 6.1 Create usage statistics overview cards
    - Implement cards showing total tokens, requests, users, and cost
    - Add loading states and error handling
    - Support deployment mode conditional rendering
    - _Requirements: 8.1, 8.2, 5.2_

  - [ ] 6.2 Implement ProviderComparisonChart component
    - Create line chart showing provider usage over time
    - Add interactive tooltips and legend
    - Support cost information display for self-hosted mode
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.1_

  - [ ] 6.3 Implement ModelDistributionChart component
    - Create donut chart with model usage distribution
    - Add interactive segments and model breakdown list
    - Support cost information display for self-hosted mode
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1_

  - [ ] 6.4 Implement UserUsageTable component
    - Create paginated table with user usage statistics
    - Add search, sorting, and filtering functionality
    - Include activity status indicators and model breakdown
    - Support cost information display for self-hosted mode
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1_

- [ ] 7. Frontend deployment mode integration
  - [ ] 7.1 Create usage configuration API endpoint
    - Add endpoint to expose deployment mode to frontend
    - Use existing app.config.ts isSelfHosted/isCloudHosted configuration
    - Return whether cost information should be displayed
    - _Requirements: 5.1, 5.2_

  - [ ] 7.2 Implement frontend deployment mode detection
    - Create useUsageConfig hook to fetch deployment configuration
    - Implement conditional rendering logic for cost features
    - Show cost data only in self-hosted mode
    - Implement currency formatting and display
    - _Requirements: 5.1, 5.2, 2.4, 3.4_

- [ ] 8. Integrate usage dashboard into admin settings
  - [ ] 8.1 Create usage settings route
    - Add admin-settings.usage.tsx route file
    - Implement proper navigation and layout integration
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ] 8.2 Update admin settings navigation
    - Add "Usage" tab to admin settings navigation
    - Ensure proper styling and active state handling
    - _Requirements: 6.1, 6.2_

  - [ ] 8.3 Create main UsageSettingsPage component
    - Compose all usage dashboard components
    - Implement responsive layout and styling
    - Add proper loading and error states
    - _Requirements: 6.3, 6.5, 8.3, 8.4_

- [ ] 9. Add API integration and data fetching
  - [ ] 9.1 Create usage API hooks
    - Implement useUsageStats, useProviderUsage, useModelDistribution, useUserUsage hooks
    - Add proper error handling and loading states
    - Use generated API client following project patterns
    - _Requirements: 8.1, 8.4_

  - [ ] 9.2 Implement data refresh and real-time updates
    - Add manual refresh capability to dashboard
    - Implement automatic data refresh intervals
    - Handle stale data and cache invalidation
    - _Requirements: 8.1, 8.2, 8.3_

- [ ] 10. Testing and validation
  - [ ]* 10.1 Write backend unit tests
    - Test usage entity validation and business logic
    - Test usage collection service functionality
    - Test aggregation use case calculations
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 10.2 Write frontend component tests
    - Test chart rendering with different data sets
    - Test table functionality and user interactions
    - Test deployment mode conditional rendering
    - _Requirements: 5.1, 5.2, 6.5_

  - [ ]* 10.3 Write integration tests
    - Test complete usage collection workflow
    - Test API endpoints and data flow
    - Test admin dashboard navigation and access
    - _Requirements: 6.4, 7.1, 8.1_

- [ ] 11. Performance optimization and monitoring
  - [ ]* 11.1 Optimize database queries and indexing
    - Add proper indexes for usage queries
    - Optimize aggregation query performance
    - Implement query result caching
    - _Requirements: 7.3, 8.1_

  - [ ]* 11.2 Implement frontend performance optimizations
    - Add lazy loading for chart components
    - Implement efficient data pagination
    - Optimize re-rendering and state management
    - _Requirements: 8.3, 8.4_

- [ ] 12. Documentation and deployment
  - [ ]* 12.1 Create usage dashboard documentation
    - Document usage collection system and configuration
    - Create admin user guide for dashboard features
    - Document cost calculation and deployment mode differences
    - _Requirements: 5.1, 5.2, 7.1_

  - [ ]* 12.2 Prepare deployment configuration
    - Update environment variables for cost tracking
    - Create database migration scripts
    - Update deployment documentation
    - _Requirements: 1.3, 5.1, 7.1_