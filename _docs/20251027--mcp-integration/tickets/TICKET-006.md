# TICKET-006: Implement Predefined MCP Integration Registry Service

## Description

Create an injectable service that maintains the registry of predefined MCP integration configurations. This service provides metadata for hardcoded integrations like server URLs, default auth methods, and display information. Initially starts with a single TEST integration.

**Why**: Predefined integrations don't store their server URLs in the database (only the slug). The registry service is the single source of truth for mapping slugs to configuration details. This allows adding new predefined integrations by simply updating the service code.

**Technical Approach**:
1. Create `PredefinedMcpIntegrationConfig` interface
2. Create injectable `PredefinedMcpIntegrationRegistryService` with instance methods
3. Store configurations in a private record keyed by slug
4. Provide methods to get config by slug, get all configs, and validate slug
5. Register service as provider in MCP module

## Acceptance Criteria

- [ ] `PredefinedMcpIntegrationConfig` interface created in `src/domain/mcp/application/services/predefined-mcp-integration-registry.service.ts`
- [ ] Interface has fields: `slug`, `displayName`, `description`, `url`, `defaultAuthMethod?`, `defaultAuthHeaderName?`
- [ ] `PredefinedMcpIntegrationRegistryService` class created with `@Injectable()` decorator
- [ ] Service has private `configs` record mapping `PredefinedMcpIntegrationSlug` to `PredefinedMcpIntegrationConfig`
- [ ] TEST integration config added: `slug: 'test'`, `displayName: 'Test MCP Server'`, `url: 'http://localhost:3100/mcp'`, no auth required
- [ ] Service method `getConfig(slug): PredefinedMcpIntegrationConfig` implemented
- [ ] `getConfig()` throws error for unknown slugs
- [ ] Service method `getAllConfigs(): PredefinedMcpIntegrationConfig[]` implemented
- [ ] Service method `isValidSlug(slug: string): slug is PredefinedMcpIntegrationSlug` implemented
- [ ] Service is registered in `McpModule` providers array
- [ ] Service is exported from `McpModule` for use in other modules if needed
- [ ] Unit tests added for:
  - `getConfig()` returns correct config for TEST slug
  - `getConfig()` throws error for unknown slug
  - `getAllConfigs()` returns array with TEST config
  - `isValidSlug()` returns true for 'test'
  - `isValidSlug()` returns false for invalid slug
  - Service is injectable (can be instantiated by NestJS DI)

## Dependencies

None - this is a foundation ticket

## Status

- [x] To Do
- [ ] In Progress
- [ ] Done

## Complexity

Small

## Technical Notes

**Files to create**:
- `src/domain/mcp/application/services/predefined-mcp-integration-registry.service.ts`

**Files to modify**:
- `src/domain/mcp/mcp.module.ts` (register service as provider and export)

**Service Implementation**:
```typescript
import { Injectable } from '@nestjs/common';
import { PredefinedMcpIntegrationSlug } from '../../domain/predefined-mcp-integration-slug.enum';
import { McpAuthMethod } from '../../domain/mcp-auth-method.enum';

export interface PredefinedMcpIntegrationConfig {
  slug: PredefinedMcpIntegrationSlug;
  displayName: string;
  description: string;
  url: string;
  defaultAuthMethod?: McpAuthMethod;
  defaultAuthHeaderName?: string;
}

@Injectable()
export class PredefinedMcpIntegrationRegistryService {
  private readonly configs: Record<PredefinedMcpIntegrationSlug, PredefinedMcpIntegrationConfig> = {
    [PredefinedMcpIntegrationSlug.TEST]: {
      slug: PredefinedMcpIntegrationSlug.TEST,
      displayName: 'Test MCP Server',
      description: 'Test integration for development and testing',
      url: 'http://localhost:3100/mcp',
      defaultAuthMethod: undefined, // No auth required
    },
  };

  getConfig(slug: PredefinedMcpIntegrationSlug): PredefinedMcpIntegrationConfig {
    const config = this.configs[slug];
    if (!config) {
      throw new Error(`Unknown predefined MCP integration slug: ${slug}`);
    }
    return config;
  }

  getAllConfigs(): PredefinedMcpIntegrationConfig[] {
    return Object.values(this.configs);
  }

  isValidSlug(slug: string): slug is PredefinedMcpIntegrationSlug {
    return slug in this.configs;
  }
}
```

**Module Registration**:
```typescript
// In mcp.module.ts
@Module({
  providers: [
    PredefinedMcpIntegrationRegistryService,
    // ... other providers
  ],
  exports: [
    PredefinedMcpIntegrationRegistryService, // Export for use in other modules if needed
  ],
})
export class McpModule {}
```

**Usage Pattern** (in use cases):
```typescript
constructor(
  private readonly registryService: PredefinedMcpIntegrationRegistryService,
) {}

execute() {
  const config = this.registryService.getConfig(integration.slug);
  const serverUrl = config.url;
  // Use serverUrl to connect to MCP server
}
```

**Future Expansion**:
To add new predefined integrations, simply add entries to the `configs` record and update the `PredefinedMcpIntegrationSlug` enum.

**Testing Approach**:
- Unit test service methods without NestJS (instantiate directly)
- Test error thrown for unknown slugs
- Test all methods return expected values for TEST integration
- Integration test with NestJS module to verify DI works
