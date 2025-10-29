# TICKET-021: Extend Agent Entity with MCP Integrations

## Description

Extend the Agent entity and database schema to support many-to-many relationships with MCP integrations. This allows agents to be assigned multiple MCP integrations, enabling them to access MCP tools, resources, and prompts at runtime.

**Why**: Agents need to be assigned MCP integrations to access their capabilities (tools, resources, prompts) during conversation runs. The many-to-many relationship allows multiple agents to share the same integrations and each agent to have multiple integrations.

**Technical Approach**:
1. Add `mcpIntegrationIds: string[]` property to `Agent` domain entity
2. Add `@ManyToMany` relationship between `AgentRecord` and `McpIntegrationRecord` (using `@JoinTable`)
3. Create join table `agent_mcp_integrations` (automatic via TypeORM)
4. Update `AgentMapper` to map integration IDs between domain entity and database record
5. Create database migration for schema changes
6. Update agents module to import McpModule for type awareness

## Acceptance Criteria

- [x] `Agent` domain entity (`domain/agent.entity.ts`) updated:
  - Added `mcpIntegrationIds: string[]` property to class
  - Added to constructor parameters as optional (default empty array)
  - Property is readonly and public
- [x] `AgentRecord` (`infrastructure/persistence/local/schema/agent.record.ts`) updated:
  - Added `@ManyToMany(() => McpIntegrationRecord)` relationship
  - Added `@JoinTable({ name: 'agent_mcp_integrations' })` decorator
  - Property name: `mcpIntegrations?: McpIntegrationRecord[]`
- [x] `AgentMapper` (`infrastructure/persistence/local/mappers/agent.mapper.ts`) updated:
  - `toDomain()`: Maps `record.mcpIntegrations` to array of integration IDs
  - `toRecord()`: Maps `entity.mcpIntegrationIds` to array of McpIntegrationRecord references
  - Handles null/undefined mcpIntegrations gracefully (empty array)
- [x] Database migration created (`src/db/migrations/YYYYMMDDHHMMSS-AddAgentMcpIntegrations.ts`):
  - Creates join table `agent_mcp_integrations` with columns: `agentId`, `mcpIntegrationId`
  - Both columns are UUIDs and form composite primary key
  - Foreign key to `agents.id` with CASCADE on delete
  - Foreign key to `mcp_integrations.id` with CASCADE on delete
  - Includes proper indexes for performance
- [x] `AgentsModule` (`agents.module.ts`) updated:
  - Imports `McpModule` to enable relationship type awareness
  - `TypeOrmModule.forFeature([AgentRecord])` includes McpIntegrationRecord if needed
- [x] Unit tests added for:
  - Agent entity constructor accepts mcpIntegrationIds parameter
  - Agent entity defaults to empty array if mcpIntegrationIds not provided
  - AgentMapper.toDomain() correctly maps integration IDs from record
  - AgentMapper.toRecord() correctly maps integration IDs to record
  - AgentMapper handles empty/null mcpIntegrations arrays
- [x] Migration runs successfully on clean database
- [x] Migration runs successfully on database with existing agents
- [x] Existing agents have empty mcpIntegrationIds after migration
- [x] Can manually assign integrations via direct database queries (validation for mapper)

## Dependencies

- TICKET-004 (Create McpIntegrationRecord must exist before relationship can be created)

## Status

- [ ] To Do
- [ ] In Progress
- [x] Done

## Complexity

Large

## Technical Notes

**Files to modify**:
- `src/domain/agents/domain/agent.entity.ts` - Add mcpIntegrationIds property
- `src/domain/agents/infrastructure/persistence/local/schema/agent.record.ts` - Add @ManyToMany relationship
- `src/domain/agents/infrastructure/persistence/local/mappers/agent.mapper.ts` - Map integration IDs
- `src/domain/agents/agents.module.ts` - Import McpModule

**Files to create**:
- `src/db/migrations/YYYYMMDDHHMMSS-AddAgentMcpIntegrations.ts` - Database migration

**Migration Example**:
```typescript
import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AddAgentMcpIntegrations1234567890123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'agent_mcp_integrations',
        columns: [
          {
            name: 'agentId',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'mcpIntegrationId',
            type: 'uuid',
            isPrimary: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'agent_mcp_integrations',
      new TableForeignKey({
        columnNames: ['agentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'agents',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'agent_mcp_integrations',
      new TableForeignKey({
        columnNames: ['mcpIntegrationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'mcp_integrations',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('agent_mcp_integrations');
  }
}
```

**Domain Entity Pattern**:
```typescript
export class Agent {
  public readonly mcpIntegrationIds: string[];

  constructor(params: {
    // ... existing params
    mcpIntegrationIds?: string[];
  }) {
    // ... existing assignments
    this.mcpIntegrationIds = params.mcpIntegrationIds ?? [];
  }
}
```

**Mapper Pattern**:
```typescript
export class AgentMapper {
  static toDomain(record: AgentRecord): Agent {
    return new Agent({
      // ... existing mappings
      mcpIntegrationIds: record.mcpIntegrations?.map(i => i.id) ?? [],
    });
  }

  static toRecord(entity: Agent, existingRecord?: AgentRecord): AgentRecord {
    const record = existingRecord ?? new AgentRecord();
    // ... existing assignments
    // Note: mcpIntegrations are loaded via repository when needed
    return record;
  }
}
```

**Important Notes**:
- The join table is automatically created by TypeORM via `@JoinTable` decorator
- No need to manually create a join table record class
- Agent entity stores IDs only (not full integration entities) to maintain clean domain layer
- The mapper extracts IDs from loaded relationships for the domain entity
- Repository will need to handle saving/updating integration relationships (handled in later tickets)
