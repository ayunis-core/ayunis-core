# TICKET-004: Create MCP Database Records and Mapper

## Description

Implement TypeORM database records for MCP integrations using single-table inheritance, create the database migration, implement the bidirectional mapper, and set up the repository. This ticket establishes the persistence layer for the MCP module.

**Why**: Domain entities need to be persisted to PostgreSQL. TypeORM's single-table inheritance pattern allows storing predefined and custom integrations in one table with a discriminator column.

**Technical Approach**:
1. Create abstract `McpIntegrationRecord` base class with `@TableInheritance`
2. Create `PredefinedMcpIntegrationRecord` and `CustomMcpIntegrationRecord` subclasses with `@ChildEntity`
3. Implement bidirectional mapper with private methods for each subclass
4. Create TypeORM migration for `mcp_integrations` table
5. Implement repository with methods for CRUD operations

## Acceptance Criteria

- [ ] `McpIntegrationRecord` abstract base class created extending `BaseRecord`
- [ ] Base record has `@TableInheritance` decorator with discriminator column `type`
- [ ] Base record has `@Unique` constraint on `['organizationId', 'name']`
- [ ] Base record columns: `name`, `authMethod` (enum, nullable), `authHeaderName` (nullable), `encryptedCredentials` (text, nullable), `enabled` (boolean, default true), `organizationId` (uuid)
- [ ] Base record has `@ManyToOne` relationship to `OrganizationRecord` with cascade delete
- [ ] Base record has index on `organizationId`
- [ ] Base record has index on `enabled` (where enabled = true)
- [ ] `PredefinedMcpIntegrationRecord` created with `@ChildEntity('predefined')`
- [ ] Predefined record has `slug` column (varchar 50)
- [ ] `CustomMcpIntegrationRecord` created with `@ChildEntity('custom')`
- [ ] Custom record has `serverUrl` column (text)
- [ ] `McpIntegrationMapper` created with static methods: `toDomain(record)`, `toRecord(entity)`
- [ ] Mapper has private static methods: `toPredefinedDomain()`, `toCustomDomain()`, `toPredefinedRecord()`, `toCustomRecord()`
- [ ] Mapper throws error for unknown entity/record types
- [ ] Repository port `McpIntegrationsRepositoryPort` created with methods: `save()`, `findById()`, `findByIds()`, `findByOrganizationId()`, `findByOrganizationIdAndEnabled()`, `delete()`
- [ ] Repository implementation `McpIntegrationsRepository` created in infrastructure layer
- [ ] Repository uses mapper for all conversions
- [ ] Database migration created: `CreateMcpIntegrationsTable`
- [ ] Migration creates table with all columns, constraints, and indexes
- [ ] Migration includes discriminator column setup
- [ ] Migration tested: runs successfully up and down
- [ ] Unit tests added for:
  - Mapper converts predefined entity to record correctly
  - Mapper converts custom entity to record correctly
  - Mapper converts predefined record to entity correctly
  - Mapper converts custom record to entity correctly
  - Mapper throws error for unknown entity type
  - Mapper throws error for unknown record type
  - Repository save() persists new integration
  - Repository findById() returns integration or null
  - Repository findByOrganizationId() returns all org integrations
  - Repository findByOrganizationIdAndEnabled() returns only enabled

## Dependencies

- TICKET-003 (domain entities must exist)

## Status

- [ ] To Do
- [ ] In Progress
- [x] Done

## Complexity

Large

## Technical Notes

**Files to create**:
- `src/domain/mcp/infrastructure/persistence/postgres/schema/mcp-integration.record.ts`
- `src/domain/mcp/infrastructure/persistence/postgres/mappers/mcp-integration.mapper.ts`
- `src/domain/mcp/application/ports/mcp-integrations.repository.port.ts`
- `src/domain/mcp/infrastructure/persistence/postgres/mcp-integrations.repository.ts`
- `src/db/migrations/YYYYMMDDHHMMSS-CreateMcpIntegrationsTable.ts`

**Database Schema**:
```sql
CREATE TABLE mcp_integrations (
  id UUID PRIMARY KEY,
  type VARCHAR(50) NOT NULL, -- discriminator: 'predefined' | 'custom'
  name VARCHAR(255) NOT NULL,
  auth_method VARCHAR(50), -- 'api_key' | 'bearer_token' | NULL
  auth_header_name VARCHAR(100),
  encrypted_credentials TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  slug VARCHAR(50), -- populated only for predefined
  server_url TEXT, -- populated only for custom
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

CREATE INDEX idx_mcp_integrations_org ON mcp_integrations(organization_id);
CREATE INDEX idx_mcp_integrations_enabled ON mcp_integrations(enabled) WHERE enabled = true;
```

**Mapper Implementation Pattern**:
```typescript
static toDomain(record: McpIntegrationRecord): McpIntegration {
  if (record instanceof PredefinedMcpIntegrationRecord) {
    return this.toPredefinedDomain(record);
  }
  if (record instanceof CustomMcpIntegrationRecord) {
    return this.toCustomDomain(record);
  }
  throw new Error(`Unknown MCP integration record type`);
}
```

**Repository Registration**:
```typescript
// In mcp.module.ts
providers: [
  {
    provide: McpIntegrationsRepositoryPort,
    useClass: McpIntegrationsRepository,
  },
]
```

**Testing Approach**:
- Unit test mapper without database (mock records/entities)
- Integration test repository with in-memory database or test database
- Test migration up/down with TypeORM migration test utilities
- Test unique constraint enforcement
- Test cascade delete (delete org → integrations deleted)
