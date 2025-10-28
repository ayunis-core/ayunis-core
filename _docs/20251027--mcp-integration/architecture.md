# Architecture Specification: MCP Integration

**Feature**: Model Context Protocol Integration
**Status**: Draft - Ready for Implementation Planning
**Last Updated**: 2025-10-27
**Author**: Claude & Daniel
**Related Documents**: [PRD](./prd.md)

---

## 1. Executive Summary

This specification describes the technical architecture for integrating the Model Context Protocol (MCP) into Ayunis Core. The feature enables organizations to extend agent capabilities by connecting to external MCP servers, which provide tools (executable functions), resources (data/files), and prompts (templates) through a standardized protocol.

### Key Architectural Decisions

1. **On-Demand Connection Strategy**: MCP client connections are created per request and immediately closed, eliminating state management complexity and aligning with v1's no-caching philosophy
2. **Discovery at Conversation Start**: Tools, resources, and prompts are discovered fresh when a conversation begins, ensuring agents always have current capabilities
3. **Integration-Level Presentation**: Only MCP integrations are presented to users (not individual tools). Tools are discovered and available to agents at runtime but not individually displayed in the UI
4. **Optional Authentication**: Auth method is optional enum - some MCP integrations may not require authentication at all
5. **Stateless Tool Execution**: MCP tools receive only their declared parameters without conversation context, maintaining security and simplicity
6. **Error Transparency to Agents**: MCP errors are returned to the LLM agent, allowing intelligent error handling and user communication
7. **Official SDK Usage**: Leveraging `@modelcontextprotocol/sdk` (TypeScript) for protocol compliance and future compatibility
8. **Hexagonal Architecture Alignment**: New `mcp/` domain module follows established patterns with clear separation of domain, application, infrastructure, and presentation layers
9. **TypeORM-Generated Schema**: Database tables created through TypeORM migrations (not manual SQL), ensuring type safety and consistency

### Architecture Philosophy

This design prioritizes **simplicity and reliability** over optimization. The v1 architecture establishes a solid foundation that can be evolved with caching, connection pooling, and advanced features in future releases based on real-world usage patterns.

---

## 2. System Context

### 2.1 Feature Overview

The MCP integration feature adds a new capability layer to Ayunis agents:

```
┌─────────────────────────────────────────────────────────┐
│                    Ayunis Frontend                      │
│  ┌─────────────────┐         ┌────────────────────┐   │
│  │  Org Admin UI   │         │   Agent Config UI  │   │
│  │  (MCP Setup)    │         │  (MCP Assignment)  │   │
│  └─────────────────┘         └────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  Ayunis Backend API                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   MCP        │  │   Agents     │  │   Runs       │ │
│  │   Module     │◄─┤   Module     │◄─┤   Module     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│         │                                               │
│         ▼                                               │
│  ┌──────────────────────────────────┐                  │
│  │  @modelcontextprotocol/sdk       │                  │
│  │  (Client + Transports)           │                  │
│  └──────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼ HTTP/SSE
┌─────────────────────────────────────────────────────────┐
│              External MCP Servers                       │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────┐ │
│  │  Custom MCP   │  │  Pre-defined  │  │   Future   │ │
│  │  Servers      │  │  Integrations │  │   Servers  │ │
│  └───────────────┘  └───────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Affected Existing Components

| Component     | Impact                                                                                 | Modification Type                         |
| ------------- | -------------------------------------------------------------------------------------- | ----------------------------------------- |
| **agents/**   | Agent entities must track assigned MCP integrations                                    | Database schema + domain entity extension |
| **runs/**     | Agent execution flow must discover and execute MCP capabilities                        | Use case orchestration changes            |
| **sources/**  | Replace `createdByLLM` boolean with `createdBy` enum (user/llm/system) in data sources | Database schema + domain entity refactor  |
| **iam/orgs/** | Organizations own MCP integrations                                                     | Relationship extension                    |

### 2.3 External Dependencies

| Dependency                  | Version   | Purpose                                             |
| --------------------------- | --------- | --------------------------------------------------- |
| `@modelcontextprotocol/sdk` | `^1.20.2` | Official MCP client implementation                  |
| **PostgreSQL**              | Existing  | Store integration configs and encrypted credentials |
| **TypeORM**                 | Existing  | Database record mapping                             |
| **External MCP Servers**    | N/A       | Third-party or org-hosted MCP servers               |

---

## 3. Module Architecture

### 3.1 New Module: `src/domain/mcp/`

A new domain module following Ayunis' hexagonal architecture pattern.

#### Directory Structure

```
src/domain/mcp/
├── domain/
│   ├── mcp-integration.entity.ts       # Core domain entity (abstract + subclasses)
│   ├── mcp-tool.entity.ts              # Tool representation
│   ├── mcp-resource.entity.ts          # Resource representation
│   ├── mcp-prompt.entity.ts            # Prompt representation
│   ├── predefined-mcp-integration-slug.enum.ts
│   └── mcp-capability.ts               # Union type for tools/resources/prompts
│
├── application/
│   ├── use-cases/
│   │   ├── create-mcp-integration/
│   │   │   ├── create-mcp-integration.use-case.ts
│   │   │   ├── create-predefined-mcp-integration.command.ts
│   │   │   └── create-custom-mcp-integration.command.ts
│   │   ├── update-mcp-integration/
│   │   │   ├── update-mcp-integration.use-case.ts
│   │   │   └── update-mcp-integration.command.ts
│   │   ├── delete-mcp-integration/
│   │   │   ├── delete-mcp-integration.use-case.ts
│   │   │   └── delete-mcp-integration.command.ts
│   │   ├── enable-mcp-integration/
│   │   │   ├── enable-mcp-integration.use-case.ts
│   │   │   └── enable-mcp-integration.command.ts
│   │   ├── disable-mcp-integration/
│   │   │   ├── disable-mcp-integration.use-case.ts
│   │   │   └── disable-mcp-integration.command.ts
│   │   ├── get-mcp-integration/
│   │   │   ├── get-mcp-integration.use-case.ts
│   │   │   └── get-mcp-integration.query.ts
│   │   ├── list-org-mcp-integrations/
│   │   │   ├── list-org-mcp-integrations.use-case.ts
│   │   │   └── list-org-mcp-integrations.query.ts
│   │   ├── list-predefined-mcp-integration-configs/
│   │   │   ├── list-predefined-mcp-integration-configs.use-case.ts
│   │   │   └── list-predefined-mcp-integration-configs.query.ts
│   │   ├── validate-mcp-integration/
│   │   │   ├── validate-mcp-integration.use-case.ts        # Returns: ValidationResult (defined in use case)
│   │   │   └── validate-mcp-integration.command.ts
│   │   ├── discover-mcp-capabilities/
│   │   │   ├── discover-mcp-capabilities.use-case.ts       # Returns: CapabilitiesResult (defined in use case)
│   │   │   └── discover-mcp-capabilities.query.ts
│   │   ├── execute-mcp-tool/
│   │   │   ├── execute-mcp-tool.use-case.ts                # Returns: ToolExecutionResult (defined in use case)
│   │   │   └── execute-mcp-tool.command.ts
│   │   ├── retrieve-mcp-resource/
│   │   │   ├── retrieve-mcp-resource.use-case.ts           # Returns: void (calls CreateDataSourceUseCase)
│   │   │   └── retrieve-mcp-resource.command.ts
│   │   └── get-mcp-prompt/
│   │       ├── get-mcp-prompt.use-case.ts                  # Returns: PromptResult (defined in use case)
│   │       └── get-mcp-prompt.query.ts
│   │
│   ├── services/
│   │   └── predefined-mcp-integration-registry.service.ts  # Injectable registry for predefined configs
│   │
│   └── ports/
│       ├── mcp-integrations.repository.port.ts
│       └── mcp-client.port.ts                              # Abstract MCP client
│
├── infrastructure/
│   ├── persistence/
│   │   └── postgres/
│   │       ├── schema/
│   │       │   └── mcp-integration.record.ts
│   │       ├── mappers/
│   │       │   └── mcp-integration.mapper.ts
│   │       └── mcp-integrations.repository.ts
│   │
│   └── clients/
│       ├── mcp-sdk-client.adapter.ts               # Wraps @modelcontextprotocol/sdk
│       └── mcp-connection.factory.ts               # Creates configured clients
│
├── presenters/
│   └── http/
│       ├── dtos/                                    # HTTP request/response DTOs
│       │   ├── create-predefined-mcp-integration.dto.ts
│       │   ├── create-custom-mcp-integration.dto.ts
│       │   ├── update-mcp-integration.dto.ts
│       │   ├── mcp-integration-response.dto.ts
│       │   └── validation-response.dto.ts
│       └── mcp-integrations.controller.ts          # MCP integration CRUD endpoints
│
└── mcp.module.ts                                   # NestJS module config
```

**Module Registration:**

The `PredefinedMcpIntegrationRegistryService` must be registered as a provider in `mcp.module.ts`:

```typescript
// mcp.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { McpIntegrationRecord } from './infrastructure/persistence/postgres/schema/mcp-integration.record';
import { PredefinedMcpIntegrationRegistryService } from './application/services/predefined-mcp-integration-registry.service';
import { McpIntegrationsRepositoryPort } from './application/ports/mcp-integrations.repository.port';
import { McpIntegrationsRepository } from './infrastructure/persistence/postgres/mcp-integrations.repository';
import { CreateMcpIntegrationUseCase } from './application/use-cases/create-mcp-integration/create-mcp-integration.use-case';
import { ListPredefinedMcpIntegrationConfigsUseCase } from './application/use-cases/list-predefined-mcp-integration-configs/list-predefined-mcp-integration-configs.use-case';
// ... other imports

@Module({
  imports: [
    TypeOrmModule.forFeature([McpIntegrationRecord]),
  ],
  providers: [
    // Registry service
    PredefinedMcpIntegrationRegistryService,

    // Repository
    {
      provide: McpIntegrationsRepositoryPort,
      useClass: McpIntegrationsRepository,
    },

    // Use cases
    CreateMcpIntegrationUseCase,
    ListPredefinedMcpIntegrationConfigsUseCase,
    // ... other use cases
  ],
  controllers: [McpIntegrationsController],
  exports: [
    PredefinedMcpIntegrationRegistryService, // Export for use in other modules if needed
  ],
})
export class McpModule {}
```

### 3.2 Modified Modules

#### 3.2.1 `src/domain/agents/`

**Changes**:

- Add `mcpIntegrationIds: string[]` to `Agent` domain entity
- Add database relationship: `AgentRecord` ↔ `McpIntegrationRecord` (many-to-many)
- Add new use cases for assigning/unassigning individual MCP integrations to agents
- Add new controller endpoints for granular integration management

**Files to Modify**:

- `domain/agent.entity.ts` - Add `mcpIntegrationIds` property
- `infrastructure/persistence/postgres/schema/agent.record.ts` - Add `@ManyToMany` relationship
- `infrastructure/persistence/postgres/mappers/agent.mapper.ts` - Map integration IDs
- `application/agents.errors.ts` - Add MCP integration-related errors
- `presenters/http/agents.controller.ts` - Add new endpoints for integration assignment

#### 3.2.2 `src/domain/runs/`

**Changes**:

- Integrate MCP capability discovery at conversation start
- Add MCP tool execution to tool execution flow
- Add MCP resource retrieval handling (especially CSV → sources)
- Add MCP prompt retrieval

**Files to Modify**:

- `application/use-cases/create-run.use-case.ts` or equivalent - Discover MCP capabilities for agent's integrations
- Tool execution orchestration logic - Delegate MCP tool calls to `ExecuteMcpToolUseCase`
- Resource handling logic - Delegate MCP resource retrieval to `RetrieveMcpResourceUseCase`

**New Dependencies**:

- Inject `DiscoverMcpCapabilitiesUseCase` from MCP module
- Inject `ExecuteMcpToolUseCase` from MCP module
- Inject `RetrieveMcpResourceUseCase` from MCP module
- Inject `GetMcpPromptUseCase` from MCP module

#### 3.2.3 `src/domain/tools/`

**Changes**:

- **None** - MCP tools are NOT presented in the tools module
- MCP integrations are presented separately (see agents module)
- Tools from MCP integrations are available to agents at runtime after discovery, but are not individually displayed in the UI

**Note**: No database schema changes required - MCP tools are ephemeral (discovered at runtime)

#### 3.2.4 `src/domain/sources/`

**Changes**:

- Replace `createdByLLM: boolean` with `createdBy: SourceCreator` enum in data source entities and records
- Update `CreateCSVDataSourceCommand` to accept `createdBy` parameter instead of `createdByLLM`
- The MCP module will call `CreateDataSourceUseCase` with `CreateCSVDataSourceCommand` when retrieving CSV resources

**New Enum**:

```typescript
// src/domain/sources/domain/source-creator.enum.ts
export enum SourceCreator {
  USER = "user", // User-uploaded resources
  LLM = "llm", // Resources created through code generation
  SYSTEM = "system", // Resources created by system integrations (e.g., MCP)
}
```

**Files to Modify**:

- `domain/sources/data-source.entity.ts` - Replace `createdByLLM: boolean` with `createdBy: SourceCreator`
- `infrastructure/persistence/postgres/schema/data-source.record.ts` - Replace column with enum type
- `application/use-cases/create-data-source/create-data-source.command.ts` - Update `CreateCSVDataSourceCommand` to use `createdBy`
- Any other places where `createdByLLM` is checked - update to use `createdBy === SourceCreator.LLM`

**Integration Pattern**:

**RetrieveMcpResourceCommand:**

```typescript
// application/use-cases/retrieve-mcp-resource/retrieve-mcp-resource.command.ts
export class RetrieveMcpResourceCommand {
  constructor(
    public readonly integrationId: string,
    public readonly resourceUri: string,
    public readonly parameters?: Record<string, unknown>, // For parameterized resources
  ) {}
}
```

**Use Case Implementation:**

```typescript
// In retrieve-mcp-resource.use-case.ts
import { CreateDataSourceUseCase } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.use-case';
import { CreateCSVDataSourceCommand } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.command';
import { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';
import { McpClientPort } from '../../ports/mcp-client.port';

constructor(
  private readonly createDataSourceUseCase: CreateDataSourceUseCase,
  private readonly mcpClient: McpClientPort,
  private readonly mcpIntegrationsRepository: McpIntegrationsRepositoryPort,
  private readonly registryService: PredefinedMcpIntegrationRegistryService,
) {}

async execute(command: RetrieveMcpResourceCommand): Promise<void> {
  // Get integration and build connection config
  const integration = await this.mcpIntegrationsRepository.findById(command.integrationId);
  const connectionConfig = this.buildConnectionConfig(integration);

  // Fetch resource with parameters (if any)
  const { content, mimeType } = await this.mcpClient.readResource(
    connectionConfig,
    command.resourceUri,
    command.parameters, // Pass parameters for URI template substitution
  );

  // When MCP resource is CSV
  if (mimeType === "text/csv") {
    // Parse CSV content into headers and rows
    const parsedCSV = this.parseCSVContent(content);

    const createSourceCommand = new CreateCSVDataSourceCommand({
      name: `MCP Resource: ${command.resourceUri}`,
      data: {
        headers: parsedCSV.headers,
        rows: parsedCSV.rows,
      },
      createdBy: SourceCreator.SYSTEM, // Created by MCP system integration
    });

    await this.createDataSourceUseCase.execute(createSourceCommand);
  }
}
```

#### 3.2.5 `src/domain/agents/` - Agent-MCP Integration Assignment

**New Use Cases for Agent-MCP Integration Management**:

The agents module will be extended with new use cases for managing MCP integration assignments:

```
src/domain/agents/application/use-cases/
├── assign-mcp-integration-to-agent/
│   ├── assign-mcp-integration-to-agent.use-case.ts
│   └── assign-mcp-integration-to-agent.command.ts
├── unassign-mcp-integration-from-agent/
│   ├── unassign-mcp-integration-from-agent.use-case.ts
│   └── unassign-mcp-integration-from-agent.command.ts
├── list-agent-mcp-integrations/
│   ├── list-agent-mcp-integrations.use-case.ts
│   └── list-agent-mcp-integrations.query.ts
└── list-available-mcp-integrations/
    ├── list-available-mcp-integrations.use-case.ts
    └── list-available-mcp-integrations.query.ts
```

**Commands and Queries**:

```typescript
// assign-mcp-integration-to-agent.command.ts
export class AssignMcpIntegrationToAgentCommand {
  constructor(
    public readonly agentId: string,
    public readonly integrationId: string,
  ) {}
}

// unassign-mcp-integration-from-agent.command.ts
export class UnassignMcpIntegrationFromAgentCommand {
  constructor(
    public readonly agentId: string,
    public readonly integrationId: string,
  ) {}
}

// list-agent-mcp-integrations.query.ts
export class ListAgentMcpIntegrationsQuery {
  constructor(public readonly agentId: string) {}
}

// list-available-mcp-integrations.query.ts
export class ListAvailableMcpIntegrationsQuery {
  constructor(public readonly agentId: string) {}
}
```

**Domain Errors**:

Add to `src/domain/agents/application/agents.errors.ts`:

```typescript
export enum AgentErrorCode {
  // ... existing codes
  MCP_INTEGRATION_NOT_FOUND = 'MCP_INTEGRATION_NOT_FOUND',
  MCP_INTEGRATION_ALREADY_ASSIGNED = 'MCP_INTEGRATION_ALREADY_ASSIGNED',
  MCP_INTEGRATION_NOT_ASSIGNED = 'MCP_INTEGRATION_NOT_ASSIGNED',
  MCP_INTEGRATION_DISABLED = 'MCP_INTEGRATION_DISABLED',
  MCP_INTEGRATION_WRONG_ORGANIZATION = 'MCP_INTEGRATION_WRONG_ORGANIZATION',
}

export class McpIntegrationNotFoundError extends AgentError {
  constructor(integrationId: string, metadata?: ErrorMetadata) {
    super(
      `MCP integration with ID ${integrationId} not found`,
      AgentErrorCode.MCP_INTEGRATION_NOT_FOUND,
      404,
      metadata,
    );
  }
}

export class McpIntegrationAlreadyAssignedError extends AgentError {
  constructor(integrationId: string, metadata?: ErrorMetadata) {
    super(
      `MCP integration ${integrationId} is already assigned to this agent`,
      AgentErrorCode.MCP_INTEGRATION_ALREADY_ASSIGNED,
      409,
      metadata,
    );
  }
}

export class McpIntegrationNotAssignedError extends AgentError {
  constructor(integrationId: string, metadata?: ErrorMetadata) {
    super(
      `MCP integration ${integrationId} is not assigned to this agent`,
      AgentErrorCode.MCP_INTEGRATION_NOT_ASSIGNED,
      404,
      metadata,
    );
  }
}

export class McpIntegrationDisabledError extends AgentError {
  constructor(integrationId: string, metadata?: ErrorMetadata) {
    super(
      `MCP integration ${integrationId} is disabled`,
      AgentErrorCode.MCP_INTEGRATION_DISABLED,
      400,
      metadata,
    );
  }
}

export class McpIntegrationWrongOrganizationError extends AgentError {
  constructor(integrationId: string, metadata?: ErrorMetadata) {
    super(
      `MCP integration ${integrationId} does not belong to the same organization`,
      AgentErrorCode.MCP_INTEGRATION_WRONG_ORGANIZATION,
      403,
      metadata,
    );
  }
}
```

**Use Case Implementation Pattern**:

```typescript
// assign-mcp-integration-to-agent.use-case.ts
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AgentRepository } from '../../ports/agent.repository';
import { McpIntegrationsRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integrations.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import { ApplicationError } from 'src/common/errors/base.error';
import {
  AgentNotFoundError,
  McpIntegrationNotFoundError,
  McpIntegrationAlreadyAssignedError,
  McpIntegrationDisabledError,
  McpIntegrationWrongOrganizationError,
  UnexpectedAgentError,
} from '../../agents.errors';
import { AssignMcpIntegrationToAgentCommand } from './assign-mcp-integration-to-agent.command';
import { Agent } from 'src/domain/agents/domain/agent.entity';

@Injectable()
export class AssignMcpIntegrationToAgentUseCase {
  private readonly logger = new Logger(AssignMcpIntegrationToAgentUseCase.name);

  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly mcpIntegrationsRepository: McpIntegrationsRepositoryPort,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: AssignMcpIntegrationToAgentCommand): Promise<Agent> {
    this.logger.log('assignMcpIntegration', {
      agentId: command.agentId,
      integrationId: command.integrationId,
    });

    try {
      // Get current user from context
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      // Load agent (with user authorization)
      const agent = await this.agentRepository.findOne(command.agentId, userId);
      if (!agent) {
        throw new AgentNotFoundError(command.agentId);
      }

      // Load and verify MCP integration
      const integration = await this.mcpIntegrationsRepository.findById(
        command.integrationId,
      );
      if (!integration) {
        throw new McpIntegrationNotFoundError(command.integrationId);
      }

      // Verify integration is enabled
      if (!integration.enabled) {
        throw new McpIntegrationDisabledError(command.integrationId);
      }

      // Verify integration belongs to same organization as agent
      const orgId = this.contextService.get('orgId');
      if (integration.organizationId !== orgId) {
        throw new McpIntegrationWrongOrganizationError(command.integrationId);
      }

      // Check if already assigned
      const currentIntegrationIds = agent.mcpIntegrationIds ?? [];
      if (currentIntegrationIds.includes(command.integrationId)) {
        throw new McpIntegrationAlreadyAssignedError(command.integrationId);
      }

      // Create updated agent with new integration
      const updatedAgent = new Agent({
        ...agent,
        mcpIntegrationIds: [...currentIntegrationIds, command.integrationId],
      });

      // Persist
      return await this.agentRepository.update(updatedAgent);
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error('Error assigning MCP integration to agent', {
        error: error as Error,
      });
      throw new UnexpectedAgentError('Error assigning MCP integration to agent', {
        error: error as Error,
      });
    }
  }
}
```

**Controller Implementation**:

```typescript
// presenters/http/agents.controller.ts (additions)

@Post(':id/mcp-integrations/:integrationId')
@ApiOperation({ summary: 'Assign MCP integration to agent' })
@ApiParam({ name: 'id', description: 'Agent UUID', type: 'string', format: 'uuid' })
@ApiParam({ name: 'integrationId', description: 'MCP Integration UUID', type: 'string', format: 'uuid' })
@ApiResponse({ status: 200, description: 'Integration assigned successfully', type: AgentResponseDto })
@ApiResponse({ status: 404, description: 'Agent or integration not found' })
@ApiResponse({ status: 409, description: 'Integration already assigned' })
@ApiResponse({ status: 400, description: 'Integration is disabled' })
@ApiResponse({ status: 403, description: 'Integration belongs to different organization' })
async assignMcpIntegration(
  @Param('id', ParseUUIDPipe) agentId: UUID,
  @Param('integrationId', ParseUUIDPipe) integrationId: UUID,
): Promise<AgentResponseDto> {
  // Note: No need to extract user - use case gets it from ContextService
  const agent = await this.assignMcpIntegrationUseCase.execute(
    new AssignMcpIntegrationToAgentCommand(agentId, integrationId),
  );
  return this.agentDtoMapper.toDto(agent);
}

@Delete(':id/mcp-integrations/:integrationId')
@ApiOperation({ summary: 'Unassign MCP integration from agent' })
@ApiParam({ name: 'id', description: 'Agent UUID', type: 'string', format: 'uuid' })
@ApiParam({ name: 'integrationId', description: 'MCP Integration UUID', type: 'string', format: 'uuid' })
@ApiResponse({ status: 204, description: 'Integration unassigned successfully' })
@ApiResponse({ status: 404, description: 'Agent not found or integration not assigned' })
@HttpCode(HttpStatus.NO_CONTENT)
async unassignMcpIntegration(
  @Param('id', ParseUUIDPipe) agentId: UUID,
  @Param('integrationId', ParseUUIDPipe) integrationId: UUID,
): Promise<void> {
  await this.unassignMcpIntegrationUseCase.execute(
    new UnassignMcpIntegrationFromAgentCommand(agentId, integrationId),
  );
}

@Get(':id/mcp-integrations')
@ApiOperation({ summary: 'List MCP integrations assigned to agent' })
@ApiParam({ name: 'id', description: 'Agent UUID', type: 'string', format: 'uuid' })
@ApiResponse({ status: 200, description: 'List of assigned integrations', type: [McpIntegrationResponseDto] })
async listAgentMcpIntegrations(
  @Param('id', ParseUUIDPipe) agentId: UUID,
): Promise<McpIntegrationResponseDto[]> {
  const integrations = await this.listAgentMcpIntegrationsUseCase.execute(
    new ListAgentMcpIntegrationsQuery(agentId),
  );
  return integrations.map(this.toMcpIntegrationDto);
}

@Get(':id/mcp-integrations/available')
@ApiOperation({ summary: 'List available MCP integrations for agent' })
@ApiParam({ name: 'id', description: 'Agent UUID', type: 'string', format: 'uuid' })
@ApiResponse({ status: 200, description: 'List of available integrations', type: [McpIntegrationResponseDto] })
async listAvailableMcpIntegrations(
  @Param('id', ParseUUIDPipe) agentId: UUID,
): Promise<McpIntegrationResponseDto[]> {
  const integrations = await this.listAvailableMcpIntegrationsUseCase.execute(
    new ListAvailableMcpIntegrationsQuery(agentId),
  );
  return integrations.map(this.toMcpIntegrationDto);
}
```

**Key Architectural Patterns**:

1. **ContextService Usage**: Use cases inject `ContextService` and get `userId`/`orgId` at runtime - no need to pass through commands
2. **Domain Errors**: Use cases throw domain-specific errors (extending `AgentError`), not NestJS HTTP exceptions
3. **Controller Simplicity**: Controllers only create commands and call use cases - no user extraction or authorization logic
4. **Command Design**: Commands contain only operation-specific data - no `userId` or `orgId` fields
5. **Error Propagation**: Errors bubble up from use cases to controllers, where global exception filter converts domain errors to HTTP responses

---

## 4. Domain Model

### 4.1 Core Entities

#### 4.1.1 `McpIntegration` (Domain Entity - Inheritance Hierarchy)

**Enums:**

```typescript
export enum McpAuthMethod {
  API_KEY = "api_key",
  BEARER_TOKEN = "bearer_token",
}

export enum PredefinedMcpIntegrationSlug {
  TEST = "test", // Test integration for development/testing
  // Future: GITHUB = "github", SALESFORCE = "salesforce", etc.
}
```

**Base Class (Abstract):**

```typescript
export abstract class McpIntegration {
  public readonly id: string;
  public name: string;
  public abstract readonly type: "predefined" | "custom";
  public authMethod?: McpAuthMethod;
  public authHeaderName?: string;
  public encryptedCredentials?: string;
  public enabled: boolean;
  public readonly organizationId: string;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(
    id: string | null,
    name: string,
    organizationId: string,
    enabled: boolean = true,
    authMethod?: McpAuthMethod,
    authHeaderName?: string,
    encryptedCredentials?: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    this.id = id ?? randomUUID();
    this.name = name;
    this.organizationId = organizationId;
    this.enabled = enabled;
    this.authMethod = authMethod;
    this.authHeaderName = authHeaderName;
    this.encryptedCredentials = encryptedCredentials;
    this.createdAt = createdAt ?? new Date();
    this.updatedAt = updatedAt ?? new Date();
  }

  disable(): void {
    this.enabled = false;
    this.updatedAt = new Date();
  }

  enable(): void {
    this.enabled = true;
    this.updatedAt = new Date();
  }

  updateCredentials(newEncryptedCredentials: string): void {
    this.encryptedCredentials = newEncryptedCredentials;
    this.updatedAt = new Date();
  }

  hasAuthentication(): boolean {
    return !!this.authMethod;
  }
}
```

**Predefined Integration:**

```typescript
export class PredefinedMcpIntegration extends McpIntegration {
  public readonly type = "predefined" as const;
  public readonly slug: PredefinedMcpIntegrationSlug;

  constructor(
    id: string | null,
    name: string,
    slug: PredefinedMcpIntegrationSlug,
    organizationId: string,
    enabled?: boolean,
    authMethod?: McpAuthMethod,
    authHeaderName?: string,
    encryptedCredentials?: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(
      id,
      name,
      organizationId,
      enabled,
      authMethod,
      authHeaderName,
      encryptedCredentials,
      createdAt,
      updatedAt,
    );
    this.slug = slug;
  }

  // Note: No getServerUrl() method - URL comes from PredefinedMcpIntegrationRegistryService
  // Use cases should inject the registry service: registryService.getConfig(integration.slug).url
}
```

**Custom Integration:**

```typescript
export class CustomMcpIntegration extends McpIntegration {
  public readonly type = "custom" as const;
  public serverUrl: string;

  constructor(
    id: string | null,
    name: string,
    serverUrl: string,
    organizationId: string,
    enabled?: boolean,
    authMethod?: McpAuthMethod,
    authHeaderName?: string,
    encryptedCredentials?: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(
      id,
      name,
      organizationId,
      enabled,
      authMethod,
      authHeaderName,
      encryptedCredentials,
      createdAt,
      updatedAt,
    );
    this.serverUrl = serverUrl;
  }

  // Note: URL is accessed directly via integration.serverUrl property
}
```

**Predefined Integration Registry Service:**

```typescript
// application/services/predefined-mcp-integration-registry.service.ts
import { Injectable } from '@nestjs/common';

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
  private readonly configs: Record<
    PredefinedMcpIntegrationSlug,
    PredefinedMcpIntegrationConfig
  > = {
    [PredefinedMcpIntegrationSlug.TEST]: {
      slug: PredefinedMcpIntegrationSlug.TEST,
      displayName: "Test MCP Server",
      description: "Test integration for development and testing",
      url: "http://localhost:3100/mcp",
      defaultAuthMethod: undefined, // No auth required for test
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

**Usage in Use Cases:**

Example 1: Getting available predefined configs for UI:

```typescript
// application/use-cases/list-predefined-mcp-integration-configs/list-predefined-mcp-integration-configs.use-case.ts
@Injectable()
export class ListPredefinedMcpIntegrationConfigsUseCase {
  constructor(
    private readonly registryService: PredefinedMcpIntegrationRegistryService,
  ) {}

  execute(): PredefinedMcpIntegrationConfig[] {
    return this.registryService.getAllConfigs();
  }
}
```

Example 2: Getting server URL in capability discovery:

```typescript
@Injectable()
export class DiscoverMcpCapabilitiesUseCase {
  constructor(
    private readonly mcpIntegrationsRepository: McpIntegrationsRepositoryPort,
    private readonly mcpClient: McpClientPort,
    private readonly registryService: PredefinedMcpIntegrationRegistryService,
  ) {}

  async execute(query: DiscoverMcpCapabilitiesQuery): Promise<CapabilitiesResult> {
    const integration = await this.mcpIntegrationsRepository.findById(query.integrationId);

    // Get server URL based on integration type
    const serverUrl = integration instanceof PredefinedMcpIntegration
      ? this.registryService.getConfig(integration.slug).url
      : integration.serverUrl; // Custom integration - access property directly

    // ... rest of use case
  }
}
```

Example 3: Creating predefined integration:

```typescript
@Injectable()
export class CreateMcpIntegrationUseCase {
  constructor(
    private readonly mcpIntegrationsRepository: McpIntegrationsRepositoryPort,
    private readonly registryService: PredefinedMcpIntegrationRegistryService,
  ) {}

  async execute(command: CreatePredefinedMcpIntegrationCommand): Promise<PredefinedMcpIntegration> {
    // Validate that slug exists in registry
    if (!this.registryService.isValidSlug(command.slug)) {
      throw new Error(`Invalid predefined integration slug: ${command.slug}`);
    }

    const integration = new PredefinedMcpIntegration(
      null, // new ID
      command.name,
      command.slug,
      command.organizationId,
      true, // enabled by default
      command.authMethod,
      command.authHeaderName,
      command.encryptedCredentials,
    );

    return await this.mcpIntegrationsRepository.save(integration);
  }
}
```

#### 4.1.2 `McpTool` (Domain Entity - Ephemeral)

```typescript
export class McpTool {
  public readonly name: string;
  public readonly description: string;
  public readonly inputSchema: JSONSchema; // JSON Schema for parameters
  public readonly integrationId: string;

  constructor(
    name: string,
    description: string,
    inputSchema: JSONSchema,
    integrationId: string,
  ) {
    this.name = name;
    this.description = description;
    this.inputSchema = inputSchema;
    this.integrationId = integrationId;
  }
}
```

#### 4.1.3 `McpResource` (Domain Entity - Ephemeral)

```typescript
export interface ResourceArgument {
  name: string;
  description: string;
  required: boolean;
}

export class McpResource {
  public readonly uri: string; // Can be a template like "file:///{id}.csv"
  public readonly name: string;
  public readonly description: string;
  public readonly mimeType: string;
  public readonly arguments?: ResourceArgument[]; // For parameterized resources
  public readonly integrationId: string;

  constructor(
    uri: string,
    name: string,
    description: string,
    mimeType: string,
    integrationId: string,
    arguments?: ResourceArgument[],
  ) {
    this.uri = uri;
    this.name = name;
    this.description = description;
    this.mimeType = mimeType;
    this.integrationId = integrationId;
    this.arguments = arguments;
  }
}
```

#### 4.1.4 `McpPrompt` (Domain Entity - Ephemeral)

```typescript
export class McpPrompt {
  public readonly name: string;
  public readonly description: string;
  public readonly arguments: PromptArgument[]; // e.g., { name: "query", required: true }
  public readonly integrationId: string;

  constructor(
    name: string,
    description: string,
    arguments: PromptArgument[],
    integrationId: string,
  ) {
    this.name = name;
    this.description = description;
    this.arguments = arguments;
    this.integrationId = integrationId;
  }
}
```

### 4.2 Database Records (TypeORM) - Single-Table Inheritance

#### 4.2.1 `McpIntegrationRecord` (Base Record - Abstract)

**Path**: `src/domain/mcp/infrastructure/persistence/postgres/schema/mcp-integration.record.ts`

```typescript
import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
  TableInheritance,
  ChildEntity,
} from "typeorm";
import { BaseRecord } from "src/common/infrastructure/persistence/postgres/base.record";
import { OrganizationRecord } from "src/iam/orgs/infrastructure/persistence/postgres/schema/organization.record";

@Entity("mcp_integrations")
@TableInheritance({ column: { type: "varchar", name: "type", length: 50 } })
@Unique(["organizationId", "name"])
export abstract class McpIntegrationRecord extends BaseRecord {
  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({
    name: "auth_method",
    type: "enum",
    enum: ["api_key", "bearer_token"],
    nullable: true,
  })
  authMethod?: "api_key" | "bearer_token";

  @Column({
    name: "auth_header_name",
    type: "varchar",
    length: 100,
    nullable: true,
  })
  authHeaderName?: string;

  @Column({ name: "encrypted_credentials", type: "text", nullable: true })
  encryptedCredentials?: string;

  @Column({ type: "boolean", default: true })
  @Index({ where: "enabled = true" })
  enabled: boolean;

  @Column({ name: "organization_id", type: "uuid" })
  @Index()
  organizationId: string;

  @ManyToOne(() => OrganizationRecord, { onDelete: "CASCADE" })
  @JoinColumn({ name: "organization_id" })
  organization: OrganizationRecord;
}
```

**Predefined Integration Record:**

```typescript
@ChildEntity("predefined")
export class PredefinedMcpIntegrationRecord extends McpIntegrationRecord {
  @Column({ type: "varchar", length: 50 })
  slug: string; // Stores PredefinedMcpIntegrationSlug enum value

  // Note: serverUrl comes from PredefinedMcpIntegrationRegistryService, not stored in DB
}
```

**Custom Integration Record:**

```typescript
@ChildEntity("custom")
export class CustomMcpIntegrationRecord extends McpIntegrationRecord {
  @Column({ name: "server_url", type: "text" })
  serverUrl: string; // User-provided URL
}
```

**Database Table Structure:**

The single table `mcp_integrations` will have these columns:
- Common columns: `id`, `name`, `auth_method`, `auth_header_name`, `encrypted_credentials`, `enabled`, `organization_id`, `created_at`, `updated_at`
- Discriminator: `type` (varchar) - values: "predefined" or "custom"
- `slug` (varchar, nullable) - populated only for predefined integrations
- `server_url` (text, nullable) - populated only for custom integrations

#### 4.2.2 Modified `AgentRecord` (Agent-MCP Many-to-Many Relationship)

**Path**: `src/domain/agents/infrastructure/persistence/postgres/schema/agent.record.ts`

Add the following to the existing `AgentRecord`:

```typescript
import { ManyToMany, JoinTable } from "typeorm";
import { McpIntegrationRecord } from "src/domain/mcp/infrastructure/persistence/postgres/schema/mcp-integration.record";

// ... existing AgentRecord class

@ManyToMany(() => McpIntegrationRecord, { cascade: false })
@JoinTable({
  name: "agent_mcp_integrations",
  joinColumn: { name: "agent_id", referencedColumnName: "id" },
  inverseJoinColumn: { name: "mcp_integration_id", referencedColumnName: "id" },
})
mcpIntegrations: McpIntegrationRecord[];
```

**Note**: The junction table `agent_mcp_integrations` will be automatically created by TypeORM based on the `@JoinTable` decorator. No separate record class is needed.

#### 4.2.3 `McpIntegrationMapper` (Record ↔ Entity Mapping)

**Path**: `src/domain/mcp/infrastructure/persistence/postgres/mappers/mcp-integration.mapper.ts`

The mapper handles bidirectional conversion between domain entities and database records, with private methods for each subclass.

```typescript
import { PredefinedMcpIntegration, CustomMcpIntegration, McpIntegration } from 'src/domain/mcp/domain/mcp-integration.entity';
import { PredefinedMcpIntegrationRecord, CustomMcpIntegrationRecord, McpIntegrationRecord } from '../schema/mcp-integration.record';
import { PredefinedMcpIntegrationSlug } from 'src/domain/mcp/domain/predefined-mcp-integration-slug.enum';

export class McpIntegrationMapper {
  /**
   * Convert database record to domain entity
   * Dispatches to private methods based on record type
   */
  static toDomain(record: McpIntegrationRecord): McpIntegration {
    if (record instanceof PredefinedMcpIntegrationRecord) {
      return this.toPredefinedDomain(record);
    }

    if (record instanceof CustomMcpIntegrationRecord) {
      return this.toCustomDomain(record);
    }

    throw new Error(`Unknown MCP integration record type: ${record.constructor.name}`);
  }

  /**
   * Convert domain entity to database record
   * Dispatches to private methods based on entity type
   */
  static toRecord(entity: McpIntegration): McpIntegrationRecord {
    if (entity instanceof PredefinedMcpIntegration) {
      return this.toPredefinedRecord(entity);
    }

    if (entity instanceof CustomMcpIntegration) {
      return this.toCustomRecord(entity);
    }

    throw new Error(`Unknown MCP integration entity type: ${entity.constructor.name}`);
  }

  /**
   * Map predefined integration record to domain entity
   */
  private static toPredefinedDomain(record: PredefinedMcpIntegrationRecord): PredefinedMcpIntegration {
    return new PredefinedMcpIntegration(
      record.id,
      record.name,
      record.slug as PredefinedMcpIntegrationSlug, // Cast string to enum
      record.organizationId,
      record.enabled,
      record.authMethod ? (record.authMethod as McpAuthMethod) : undefined,
      record.authHeaderName,
      record.encryptedCredentials,
      record.createdAt,
      record.updatedAt,
    );
  }

  /**
   * Map custom integration record to domain entity
   */
  private static toCustomDomain(record: CustomMcpIntegrationRecord): CustomMcpIntegration {
    return new CustomMcpIntegration(
      record.id,
      record.name,
      record.serverUrl,
      record.organizationId,
      record.enabled,
      record.authMethod ? (record.authMethod as McpAuthMethod) : undefined,
      record.authHeaderName,
      record.encryptedCredentials,
      record.createdAt,
      record.updatedAt,
    );
  }

  /**
   * Map predefined integration entity to database record
   */
  private static toPredefinedRecord(entity: PredefinedMcpIntegration): PredefinedMcpIntegrationRecord {
    const record = new PredefinedMcpIntegrationRecord();
    record.id = entity.id;
    record.name = entity.name;
    record.slug = entity.slug; // Enum stored as string
    record.authMethod = entity.authMethod;
    record.authHeaderName = entity.authHeaderName;
    record.encryptedCredentials = entity.encryptedCredentials;
    record.enabled = entity.enabled;
    record.organizationId = entity.organizationId;
    record.createdAt = entity.createdAt;
    record.updatedAt = entity.updatedAt;
    return record;
  }

  /**
   * Map custom integration entity to database record
   */
  private static toCustomRecord(entity: CustomMcpIntegration): CustomMcpIntegrationRecord {
    const record = new CustomMcpIntegrationRecord();
    record.id = entity.id;
    record.name = entity.name;
    record.serverUrl = entity.serverUrl;
    record.authMethod = entity.authMethod;
    record.authHeaderName = entity.authHeaderName;
    record.encryptedCredentials = entity.encryptedCredentials;
    record.enabled = entity.enabled;
    record.organizationId = entity.organizationId;
    record.createdAt = entity.createdAt;
    record.updatedAt = entity.updatedAt;
    return record;
  }
}
```

### 4.3 Credential Encryption

**Strategy**: Use existing Ayunis encryption service or create a dedicated `McpCredentialEncryptionService`

**Implementation**:

- Encryption key stored in environment variable `MCP_ENCRYPTION_KEY`
- Algorithm: AES-256-GCM
- Encrypt credentials before storing in `encrypted_credentials` column
- Decrypt credentials only when creating MCP client connections

**Service Interface**:

```typescript
export abstract class McpCredentialEncryptionPort {
  abstract encrypt(plaintext: string): Promise<string>;
  abstract decrypt(ciphertext: string): Promise<string>;
}
```

---

## 5. Integration Specifications

### 5.1 MCP Client Integration

#### 5.1.1 MCP Client Port (Abstract Interface)

```typescript
// application/ports/mcp-client.port.ts
export interface McpConnectionConfig {
  serverUrl: string;
  authHeaderName?: string; // Optional - not needed if no auth
  authToken?: string; // Optional - decrypted credentials if auth is required
}

export interface McpToolCall {
  toolName: string;
  parameters: Record<string, unknown>;
}

export interface McpToolResult {
  content: unknown;
  isError: boolean;
}

export abstract class McpClientPort {
  abstract listTools(config: McpConnectionConfig): Promise<McpTool[]>;
  abstract listResources(config: McpConnectionConfig): Promise<McpResource[]>;
  abstract listPrompts(config: McpConnectionConfig): Promise<McpPrompt[]>;

  abstract callTool(
    config: McpConnectionConfig,
    call: McpToolCall,
  ): Promise<McpToolResult>;
  abstract readResource(
    config: McpConnectionConfig,
    uri: string,
    parameters?: Record<string, unknown>,
  ): Promise<{ content: string; mimeType: string }>;
  abstract getPrompt(
    config: McpConnectionConfig,
    name: string,
    args: Record<string, unknown>,
  ): Promise<{ messages: unknown[] }>;

  abstract validateConnection(
    config: McpConnectionConfig,
  ): Promise<{ valid: boolean; error?: string }>;
}
```

#### 5.1.2 MCP Client Adapter (Concrete Implementation)

```typescript
// infrastructure/clients/mcp-sdk-client.adapter.ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"; // Or StreamableHTTP

@Injectable()
export class McpSdkClientAdapter implements McpClientPort {
  private readonly timeout = 30000; // 30 seconds

  async listTools(config: McpConnectionConfig): Promise<McpTool[]> {
    const client = await this.createClient(config);
    try {
      const tools = await client.listTools();
      return tools.tools.map(
        (tool) =>
          new McpTool(
            tool.name,
            tool.description,
            tool.inputSchema,
            config.integrationId,
          ),
      );
    } finally {
      await client.close(); // On-demand: close immediately
    }
  }

  async callTool(
    config: McpConnectionConfig,
    call: McpToolCall,
  ): Promise<McpToolResult> {
    const client = await this.createClient(config);
    try {
      const result = await Promise.race([
        client.callTool(call.toolName, call.parameters),
        this.timeoutPromise(this.timeout),
      ]);
      return { content: result.content, isError: false };
    } catch (error) {
      return { content: error.message, isError: true };
    } finally {
      await client.close();
    }
  }

  async readResource(
    config: McpConnectionConfig,
    uri: string,
    parameters?: Record<string, unknown>,
  ): Promise<{ content: string; mimeType: string }> {
    const client = await this.createClient(config);
    try {
      const result = await Promise.race([
        client.readResource({ uri, arguments: parameters }),
        this.timeoutPromise(this.timeout),
      ]);
      // MCP SDK returns contents array - take first item
      const firstContent = result.contents[0];
      return {
        content: firstContent.text || firstContent.blob || '',
        mimeType: firstContent.mimeType || 'text/plain'
      };
    } catch (error) {
      throw new Error(`Failed to read resource: ${error.message}`);
    } finally {
      await client.close();
    }
  }

  private async createClient(config: McpConnectionConfig): Promise<Client> {
    // Build headers only if auth is provided
    const headers: Record<string, string> = {};
    if (config.authHeaderName && config.authToken) {
      headers[config.authHeaderName] = config.authToken;
    }

    const transport = new SSEClientTransport(new URL(config.serverUrl), {
      requestInit: { headers },
    });

    const client = new Client(
      { name: "ayunis-core", version: "1.0.0" },
      { capabilities: { tools: {}, resources: {}, prompts: {} } },
    );

    await client.connect(transport);
    return client;
  }

  private timeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error("MCP request timeout")), ms),
    );
  }
}
```

**Note**: Use `SSEClientTransport` initially, migrate to `StreamableHTTPClientTransport` as MCP ecosystem adopts new standard.

### 5.2 API Contracts

#### 5.2.1 MCP Integration Management Endpoints (Organization-Level)

**Base Path**: `/api/mcp-integrations`

**Authorization**: All endpoints require organization admin role (`@Roles(UserRole.ADMIN)`)

| Endpoint                 | Method | Description                       | Request Body                         | Response                        |
| ------------------------ | ------ | --------------------------------- | ------------------------------------ | ------------------------------- |
| `/`                      | GET    | List all MCP integrations for org | -                                    | `McpIntegrationResponseDto[]`   |
| `/predefined`            | POST   | Create predefined integration     | `CreatePredefinedIntegrationDto`     | `McpIntegrationResponseDto`     |
| `/custom`                | POST   | Create custom integration         | `CreateCustomIntegrationDto`         | `McpIntegrationResponseDto`     |
| `/:id`                   | GET    | Get integration by ID             | -                                    | `McpIntegrationResponseDto`     |
| `/:id`                   | PATCH  | Update integration                | `UpdateMcpIntegrationDto`            | `McpIntegrationResponseDto`     |
| `/:id`                   | DELETE | Delete integration                | -                                    | `204 No Content`                |
| `/:id/enable`            | POST   | Enable integration                | -                                    | `McpIntegrationResponseDto`     |
| `/:id/disable`           | POST   | Disable integration               | -                                    | `McpIntegrationResponseDto`     |
| `/:id/validate`          | POST   | Validate integration config       | -                                    | `ValidationResponseDto`         |
| `/predefined/available`  | GET    | List available predefined configs | -                                    | `PredefinedConfigResponseDto[]` |

**HTTP DTOs (Presenter Layer)**:

```typescript
// presenters/http/dtos/create-predefined-mcp-integration.dto.ts
export enum McpAuthMethodDto {
  API_KEY = "api_key",
  BEARER_TOKEN = "bearer_token",
}

export class CreatePredefinedIntegrationDto {
  @ApiProperty({ description: "User-defined name for this integration instance" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ["test"], description: "Predefined integration slug" })
  @IsEnum(["test"]) // Will expand as more slugs are added
  slug: string;

  @ApiProperty({ enum: McpAuthMethodDto, required: false })
  @IsEnum(McpAuthMethodDto)
  @IsOptional()
  authMethod?: McpAuthMethodDto;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  authHeaderName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  credentials?: string; // Plain credentials, will be encrypted
}

// presenters/http/dtos/create-custom-mcp-integration.dto.ts
export class CreateCustomIntegrationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsUrl()
  serverUrl: string;

  @ApiProperty({ enum: McpAuthMethodDto, required: false })
  @IsEnum(McpAuthMethodDto)
  @IsOptional()
  authMethod?: McpAuthMethodDto;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  authHeaderName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  credentials?: string;
}

// presenters/http/dtos/mcp-integration-response.dto.ts
export class McpIntegrationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: ["predefined", "custom"] })
  type: "predefined" | "custom";

  @ApiProperty({ required: false })
  slug?: string; // Only for predefined

  @ApiProperty({ required: false })
  serverUrl?: string; // Only for custom

  @ApiProperty()
  enabled: boolean;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // Note: auth credentials never exposed in responses
}

// presenters/http/dtos/validation-response.dto.ts
export class ValidationResponseDto {
  @ApiProperty()
  valid: boolean;

  @ApiProperty({ required: false })
  error?: string;

  @ApiProperty()
  capabilities: {
    tools: number;
    resources: number;
    prompts: number;
  };
}
```

**Application Layer Commands**:

```typescript
// application/commands/create-predefined-mcp-integration.command.ts
export class CreatePredefinedMcpIntegrationCommand {
  constructor(
    public readonly name: string,
    public readonly slug: PredefinedMcpIntegrationSlug,
    public readonly organizationId: string,
    public readonly authMethod?: McpAuthMethod,
    public readonly authHeaderName?: string,
    public readonly encryptedCredentials?: string, // Already encrypted by controller
  ) {}
}

// application/commands/create-custom-mcp-integration.command.ts
export class CreateCustomMcpIntegrationCommand {
  constructor(
    public readonly name: string,
    public readonly serverUrl: string,
    public readonly organizationId: string,
    public readonly authMethod?: McpAuthMethod,
    public readonly authHeaderName?: string,
    public readonly encryptedCredentials?: string,
  ) {}
}
```

**Application Layer Results**:

```typescript
// application/results/validation-result.ts
export class ValidationResult {
  constructor(
    public readonly valid: boolean,
    public readonly capabilities: {
      tools: number;
      resources: number;
      prompts: number;
    },
    public readonly error?: string,
  ) {}
}
```

**Controller Flow Example**:

```typescript
// presenters/http/mcp-integrations.controller.ts
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

@Controller('mcp-integrations')
export class McpIntegrationsController {
  constructor(
    private readonly createMcpIntegrationUseCase: CreateMcpIntegrationUseCase,
    private readonly listPredefinedConfigsUseCase: ListPredefinedMcpIntegrationConfigsUseCase,
    private readonly credentialEncryption: McpCredentialEncryptionPort,
  ) {}

  @Post('predefined')
  @Roles(UserRole.ADMIN) // Organization admin only
  async createPredefined(
    @Body() dto: CreatePredefinedIntegrationDto,
    @CurrentUser() user: User,
  ): Promise<McpIntegrationResponseDto> {
    // 1. Encrypt credentials (HTTP layer responsibility)
    const encryptedCreds = dto.credentials
      ? await this.credentialEncryption.encrypt(dto.credentials)
      : undefined;

    // 2. Create command from DTO
    const command = new CreatePredefinedMcpIntegrationCommand(
      dto.name,
      dto.slug as PredefinedMcpIntegrationSlug,
      user.organizationId,
      dto.authMethod as McpAuthMethod | undefined,
      dto.authHeaderName,
      encryptedCreds,
    );

    // 3. Execute use case - returns domain entity
    const integration: PredefinedMcpIntegration = await this.createMcpIntegrationUseCase.execute(command);

    // 4. Map domain entity to response DTO
    return this.toResponseDto(integration);
  }

  @Get('predefined/available')
  @Roles(UserRole.ADMIN) // Organization admin only
  async getAvailablePredefinedConfigs(): Promise<PredefinedConfigResponseDto[]> {
    const configs = await this.listPredefinedConfigsUseCase.execute();
    return configs.map(config => ({
      slug: config.slug,
      displayName: config.displayName,
      description: config.description,
      defaultAuthMethod: config.defaultAuthMethod,
      defaultAuthHeaderName: config.defaultAuthHeaderName,
      // Note: URL not exposed to frontend for security
    }));
  }

  private toResponseDto(integration: McpIntegration): McpIntegrationResponseDto {
    return {
      id: integration.id,
      name: integration.name,
      type: integration.type,
      slug: integration instanceof PredefinedMcpIntegration ? integration.slug : undefined,
      serverUrl: integration instanceof CustomMcpIntegration ? integration.serverUrl : undefined,
      enabled: integration.enabled,
      organizationId: integration.organizationId,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
    };
  }
}
```

#### 5.2.2 Agent-MCP Integration Assignment Endpoints

**Base Path**: `/api/agents/:agentId/mcp-integrations`

**Authorization**: No admin guard required - regular users can assign integrations to agents they own

| Endpoint              | Method | Description                                      | Response                       |
| --------------------- | ------ | ------------------------------------------------ | ------------------------------ |
| `/`                   | GET    | List assigned integrations for the agent         | `McpIntegrationResponseDto[]`  |
| `/available`          | GET    | List available (enabled) integrations for org    | `McpIntegrationResponseDto[]`  |
| `/:integrationId`     | POST   | Assign an MCP integration to agent (toggle ON)   | `AgentResponseDto`             |
| `/:integrationId`     | DELETE | Unassign an MCP integration from agent (toggle OFF) | `204 No Content`            |

**Note**: While these endpoints don't require admin role, agents are user-scoped (users can only manage their own agents via `agentRepository.findOne(agentId, userId)`).

**Frontend Usage**:

```typescript
import {
  useGetAgentMcpIntegrations,
  useGetAvailableMcpIntegrations,
  useAssignMcpIntegrationToAgent,
  useUnassignMcpIntegrationFromAgent
} from '@/shared/api/generated';

// Get assigned and available integrations
const { data: assigned } = useGetAgentMcpIntegrations(agentId);
const { data: available } = useGetAvailableMcpIntegrations(agentId);

// Mutations for assign/unassign
const assignMutation = useAssignMcpIntegrationToAgent({
  mutation: {
    onSuccess: () => {
      queryClient.invalidateQueries(['agents', agentId]);
      queryClient.invalidateQueries(['agents', agentId, 'mcp-integrations']);
    },
  },
});

const unassignMutation = useUnassignMcpIntegrationFromAgent({
  mutation: {
    onSuccess: () => {
      queryClient.invalidateQueries(['agents', agentId]);
      queryClient.invalidateQueries(['agents', agentId, 'mcp-integrations']);
    },
  },
});

// Toggle handler
const handleToggle = (integrationId: string, isAssigned: boolean) => {
  if (isAssigned) {
    unassignMutation.mutate({ agentId, integrationId });
  } else {
    assignMutation.mutate({ agentId, integrationId });
  }
};
```

**Frontend UI Design**:

The MCP integration toggles should be displayed in the agent configuration UI as follows:

- **Location**: Separate card in the agent configuration page
- **Card Title**: "Integrations"
- **Style**: Same style as other configuration cards (e.g., "Tools", "Model Settings", etc.)
- **Content**: List of all enabled MCP integrations for the organization
- **Each Integration**: Shows integration name with a toggle switch to enable/disable it for the specific agent
- **Behavior**: Toggling an integration on/off adds/removes it from the agent's assigned integrations

**Example Layout**:

```
┌─────────────────────────────────────┐
│ Integrations                        │
├─────────────────────────────────────┤
│ ○ GitHub MCP              [Toggle]  │
│ ○ Salesforce MCP          [Toggle]  │
│ ● Custom Data API         [Toggle]  │  <- Enabled for this agent
└─────────────────────────────────────┘
```

---

## 6. Data Flow

### 6.1 Integration Setup Flow (Admin)

```
┌──────┐                                          ┌────────────┐
│ Admin│                                          │  Ayunis    │
│  UI  │                                          │  Backend   │
└──┬───┘                                          └─────┬──────┘
   │                                                    │
   │ 1. POST /api/mcp-integrations                    │
   │    { name, serverUrl, authMethod, credentials }  │
   │─────────────────────────────────────────────────►│
   │                                                    │ 2. Encrypt credentials
   │                                                    │
   │                                                    │ 3. Validate connection
   │                                                    │    (connect to MCP server)
   │                                                    │
   │                                                    │◄────────────┐
   │                                                    │ Check: MCP  │
   │                                                    │ protocol OK?│
   │                                                    │ Has tools?  │
   │                                                    │ Auth works? │
   │                                                    │─────────────┘
   │                                                    │
   │                                                    │ 4. Save to DB
   │                                                    │
   │ 5. Return created integration                     │
   │◄─────────────────────────────────────────────────┤
   │                                                    │
```

### 6.2 Tool Execution Flow (Runtime)

```
┌──────┐      ┌────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│ User │      │ Agent  │      │   Runs   │      │   MCP    │      │ External │
│      │      │        │      │  Module  │      │  Module  │      │   MCP    │
└──┬───┘      └───┬────┘      └────┬─────┘      └────┬─────┘      └────┬─────┘
   │              │                 │                 │                 │
   │ Message      │                 │                 │                 │
   │─────────────►│                 │                 │                 │
   │              │                 │                 │                 │
   │              │ LLM decides to  │                 │                 │
   │              │ call MCP tool   │                 │                 │
   │              │────────────────►│                 │                 │
   │              │                 │                 │                 │
   │              │                 │ ExecuteMcpTool  │                 │
   │              │                 │────────────────►│                 │
   │              │                 │                 │                 │
   │              │                 │                 │ Connect + Call  │
   │              │                 │                 │────────────────►│
   │              │                 │                 │                 │
   │              │                 │                 │ Result / Error  │
   │              │                 │                 │◄────────────────│
   │              │                 │                 │                 │
   │              │                 │ Tool result     │                 │
   │              │                 │◄────────────────┤                 │
   │              │                 │                 │                 │
   │              │ Continue with   │                 │                 │
   │              │ result          │                 │                 │
   │              │◄────────────────┤                 │                 │
   │              │                 │                 │                 │
   │ Response     │                 │                 │                 │
   │◄─────────────┤                 │                 │                 │
   │              │                 │                 │                 │
```

### 6.3 CSV Resource Retrieval Flow

```
┌──────┐      ┌────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│ User │      │ Agent  │      │   MCP    │      │ Sources  │      │ External │
│      │      │        │      │  Module  │      │  Module  │      │   MCP    │
└──┬───┘      └───┬────┘      └────┬─────┘      └────┬─────┘      └────┬─────┘
   │              │                 │                 │                 │
   │ "Get Q4 CSV" │                 │                 │                 │
   │─────────────►│                 │                 │                 │
   │              │                 │                 │                 │
   │              │ RetrieveMcpResource               │                 │
   │              │────────────────►│                 │                 │
   │              │                 │                 │                 │
   │              │                 │ Fetch CSV       │                 │
   │              │                 │────────────────────────────────►│
   │              │                 │                 │                 │
   │              │                 │ CSV content     │                 │
   │              │                 │◄────────────────────────────────┤
   │              │                 │                 │                 │
   │              │                 │ CreateCSVSource │                 │
   │              │                 │────────────────►│                 │
   │              │                 │                 │                 │
   │              │                 │                 │ [CSV processed  │
   │              │                 │                 │  as data source]│
   │              │                 │                 │                 │
   │              │                 │ Source created  │                 │
   │              │                 │◄────────────────┤                 │
   │              │                 │                 │                 │
   │              │ "CSV loaded"    │                 │                 │
   │              │◄────────────────┤                 │                 │
   │              │                 │                 │                 │
   │ Confirmation │                 │                 │                 │
   │◄─────────────┤                 │                 │                 │
   │              │                 │                 │                 │
```

---

## 7. Cross-Cutting Concerns

### 7.1 Security

#### 7.1.1 Authorization

**MCP Integration Management (Admin-Only)**:
- All MCP integration CRUD endpoints require organization admin role: `@Roles(UserRole.ADMIN)`
- Includes: create, read, update, delete, enable/disable, validate integrations
- Organization admins can manage integrations for their entire organization

**Agent-MCP Integration Assignment (User-Level)**:
- No admin role required for assigning integrations to agents
- Authorization enforced at repository level: `agentRepository.findOne(agentId, userId)`
- Users can only assign/unassign integrations to agents they own
- Users can only view integrations enabled for their organization

**Context-Based Authorization**:
- Use cases retrieve `userId` and `orgId` from `ContextService` at runtime
- Organization boundaries enforced: integrations belong to organizations, users can only access their org's integrations

#### 7.1.2 Credential Management

- **Optional Authentication**: Some MCP integrations may not require authentication
- **Encryption at Rest**: All credentials (when provided) encrypted using `McpCredentialEncryptionService`
- **Encryption Algorithm**: AES-256-GCM
- **Key Management**: Encryption key in environment variable, rotatable
- **Credential Visibility**: Only organization admins can view/edit credentials (never exposed in API responses to regular users)

#### 7.1.3 MCP Server Validation

- **Protocol Validation**: Ensure server responds with valid MCP handshake
- **Capability Check**: Verify server has at least one tool/resource/prompt
- **Authentication Test**: If credentials provided, test that they work before saving integration
- **Timeout Enforcement**: 30-second timeout on validation requests

#### 7.1.4 Connection Security

- **HTTPS Recommended**: Warn organization admins if custom URL uses HTTP (but don't block in v1)
- **No localhost Blocking in v1**: Allow internal IPs for development (defer restrictions)
- **Header Injection Prevention**: Sanitize custom header names to prevent header injection attacks

### 7.2 Error Handling

#### 7.2.1 Error Types

| Error Type                 | Example                | Handling Strategy                                                |
| -------------------------- | ---------------------- | ---------------------------------------------------------------- |
| **Connection Failure**     | MCP server unreachable | Return error to agent: "Unable to connect to {integration}"      |
| **Authentication Failure** | Invalid credentials    | Return error to agent: "Authentication failed for {integration}" |
| **Timeout**                | Request exceeds 30s    | Return error to agent: "{Integration} timed out"                 |
| **Tool Execution Error**   | Tool crashes           | Return error to agent with tool's error message                  |
| **Invalid Parameters**     | Wrong tool parameters  | Return error to agent with validation details                    |

#### 7.2.2 Error Response Format

```typescript
interface McpErrorResponse {
  success: false;
  error: {
    type:
      | "connection"
      | "authentication"
      | "timeout"
      | "execution"
      | "validation";
    message: string;
    integrationId: string;
    integrationName: string;
    details?: unknown;
  };
}
```

#### 7.2.3 Error Logging

- **All MCP errors logged**: Include integration ID, error type, timestamp
- **Sensitive data excluded**: Never log credentials or raw auth headers
- **User context**: Log org ID and agent ID for troubleshooting

### 7.3 Performance

#### 7.3.1 Connection Strategy (v1)

- **On-Demand Connections**: Create new connection for each request
- **No Connection Pooling**: Eliminates state management complexity
- **No Response Caching**: Fresh requests every time (PRD requirement)
- **Timeout**: 30 seconds per request (configurable via environment variable)

**Performance Implications**:

- ✅ Simple and reliable
- ❌ Higher latency per request (acceptable for v1)
- ✅ No resource leaks or stale connections
- ❌ May hit rate limits on MCP servers (to be monitored)

#### 7.3.2 Discovery Strategy

- **Discovery Timing**: At conversation start
- **Discovery Caching**: None in v1 (fresh discovery each time)
- **Parallel Discovery**: If agent has multiple integrations, discover capabilities in parallel

**Example**:

```typescript
const agent = await agentRepository.findById(agentId);
const integrations = await mcpIntegrationsRepository.findByIds(
  agent.mcpIntegrationIds,
);

// Parallel discovery
const capabilitiesPromises = integrations.map((integration) =>
  discoverMcpCapabilitiesUseCase.execute({ integrationId: integration.id }),
);

const allCapabilities = await Promise.all(capabilitiesPromises);
```

### 7.4 Monitoring & Observability

#### 7.4.1 Metrics to Track

- **MCP request latency** (per integration)
- **MCP error rates** (by error type)
- **Integration usage** (calls per integration per day)
- **Timeout frequency** (per integration)
- **Discovery latency** (time to fetch capabilities)

#### 7.4.2 Logging Strategy

- **Log all MCP requests**: Integration ID, operation type (tool/resource/prompt), timestamp
- **Log all errors**: Error type, message, integration ID
- **Log validation attempts**: Success/failure, integration ID
- **No credential logging**: Never log decrypted credentials or auth tokens

#### 7.4.3 Health Checks

- Add health check endpoint: `GET /api/health/mcp` that tests a sample integration (if configured)

---

## 8. Risks & Trade-offs

### 8.1 On-Demand Connection Strategy

**Risk**: Higher latency due to connection overhead
**Probability**: High
**Impact**: Medium
**Mitigation**: Accept for v1, optimize to connection pooling in v2 if needed
**Trade-off**: Simplicity and reliability over performance

### 8.2 Fresh Discovery at Conversation Start

**Risk**: Discovery latency delays conversation start
**Probability**: Medium
**Impact**: Medium (especially if agent has many integrations)
**Mitigation**: Parallel discovery, timeout enforcement
**Trade-off**: Always-current capabilities vs faster conversation start
**Future Option**: Cache discoveries with TTL

### 8.3 No Response Caching

**Risk**: Repeated requests to MCP servers increase load and latency
**Probability**: High
**Impact**: Low to Medium
**Mitigation**: Monitor usage patterns, implement caching in v2 if needed
**Trade-off**: Always-fresh data vs performance optimization

### 8.4 External MCP Server Reliability

**Risk**: External servers are unpredictable (downtime, slow responses)
**Probability**: High
**Impact**: Medium (poor UX if integrations frequently fail)
**Mitigation**: Clear error messages to agents, 30-second timeout, logging
**Future Option**: Circuit breaker pattern to auto-disable unreliable integrations

### 8.5 CSV Processing Performance

**Risk**: Large CSV files from MCP servers may impact performance
**Probability**: Medium
**Impact**: Medium
**Mitigation**: Leverage existing CSV data source processing
**Future Option**: File size limits, streaming processing

### 8.6 MCP Protocol Evolution

**Risk**: Breaking changes in MCP protocol require rework
**Probability**: Medium
**Impact**: High
**Mitigation**: Use official SDK (abstracts protocol details), monitor protocol updates
**Trade-off**: Betting on protocol stability vs custom implementation

### 8.7 Security: Custom URLs

**Risk**: Organization admins configure malicious MCP servers
**Probability**: Low
**Impact**: High
**Mitigation**: Validate protocol on creation, test auth, timeout enforcement
**Future Option**: HTTPS-only enforcement, internal IP blocking, response sanitization

---

## 9. Implementation Guidance

### 9.1 Implementation Phases

#### Phase 1: Foundation (Critical Path)

1. **Create MCP module structure** (domain entities, ports, DTOs)
2. **Implement credential encryption service**
3. **Database schema and migrations** (`mcp_integrations`, `agent_mcp_integrations`)
4. **MCP client adapter** (wrap `@modelcontextprotocol/sdk`)
5. **Repository implementation** (`McpIntegrationsRepository`)

#### Phase 2: Integration Management Interface

6. **MCP integration API endpoints** (CRUD for integrations)
7. **Validation use case** (test connection, protocol, capabilities, auth)
8. **Frontend organization admin UI** (integration setup and management)

#### Phase 3: User Assignment

9. **Extend agent entity** (add `mcpIntegrationIds`)
10. **Agent-MCP assignment API** (PUT `/api/agents/:id/mcp-integrations`)
11. **Frontend agent config UI** (MCP tab with integration selection)

#### Phase 4: Runtime Integration

12. **Discovery use case** (list tools/resources/prompts at conversation start)
13. **Tool execution use case** (call MCP tools)
14. **Resource retrieval use case** (fetch MCP resources, handle CSV)
15. **Prompt retrieval use case** (get MCP prompts)
16. **Integrate with runs module** (orchestrate MCP calls during agent execution)

#### Phase 5: Polish

17. **Error handling refinement** (clear error messages)
18. **Logging and monitoring** (metrics, observability)
19. **Documentation** (API docs, admin guides)
20. **Testing** (unit tests, integration tests, E2E tests)

### 9.2 Critical Path Items

- **MCP SDK Integration** (Phase 1): Understand SDK API, handle transports correctly
- **Credential Encryption** (Phase 1): Secure implementation is non-negotiable
- **Connection Validation** (Phase 2): Must work reliably to prevent bad integrations
- **Agent-MCP Relationship** (Phase 3): Database migration must preserve existing agents
- **CSV → Sources Integration** (Phase 4): Reuse existing CSV data source creation use case

### 9.3 Testing Strategy

#### Unit Tests

- Domain entities: Business logic (enable/disable, update credentials)
- Use cases: Mock repositories and clients, test orchestration
- Mappers: Bidirectional entity ↔ record conversion

### 9.4 Rollout Strategy

#### Step 1: Internal Testing

- Deploy to staging environment
- Create test MCP integrations (custom test servers)
- Validate all flows with test data

#### Step 2: Beta Organizations

- Enable feature for select organizations
- Provide setup documentation
- Monitor error rates and latency

#### Step 3: General Availability

- Enable for all organizations
- Announce feature in release notes
- Provide migration guide if needed

### 9.5 Documentation Requirements

#### For Developers

- Architecture overview (this document)
- Implementation tickets (separate ticket breakdown)
- API reference (OpenAPI spec)

#### For Organization Admins

- Setup guide: How to configure MCP integrations
- Troubleshooting: Common errors and solutions
- Security best practices: Credential management

#### For Users

- User guide: How to assign MCP integrations to agents
- Feature overview: What MCP integrations enable

---

## 10. Open Questions & Future Considerations

### 10.1 Deferred to Future Releases

- **Connection Pooling**: Optimize connection reuse for better performance
- **Response Caching**: Cache tool results, resource content, capability lists
- **Retry Logic**: Automatic retry on transient failures
- **Circuit Breakers**: Auto-disable unreliable integrations
- **Pre-defined Integrations**: Curated list of popular MCP servers
- **Additional Resource Types**: PDFs, images, binaries (beyond CSV/text)
- **MCP Prompt Library Integration**: Show MCP prompts in user-facing prompt library
- **Per-User Credentials**: User-level auth instead of org-level
- **OAuth Support**: Complex auth flows requiring user interaction
- **HTTPS-Only Enforcement**: Block non-HTTPS URLs
- **Internal IP Blocking**: Prevent connections to localhost/private IPs

### 10.2 Questions for Post-v1 Review

1. **What is the actual latency impact of on-demand connections?** Should we prioritize connection pooling?
2. **What are the most common MCP integrations?** Should we pre-define any?
3. **How often do MCP servers fail?** Should we implement circuit breakers?
4. **How large are typical CSV resources?** Do we need file size limits?
5. **Do users want fine-grained tool selection?** Or is all-or-nothing sufficient?

---

## 11. Appendix

### 11.1 MCP Protocol Resources

- **Official Specification**: https://modelcontextprotocol.io/
- **TypeScript SDK**: https://github.com/modelcontextprotocol/typescript-sdk
- **npm Package**: https://www.npmjs.com/package/@modelcontextprotocol/sdk
- **Building MCP Clients Tutorial**: https://modelcontextprotocol.info/docs/tutorials/building-a-client-node/

### 11.2 Related Ayunis Modules

| Module            | Path                  | Relevance                                    |
| ----------------- | --------------------- | -------------------------------------------- |
| **Agents**        | `src/domain/agents/`  | Agent-MCP integration assignment             |
| **Runs**          | `src/domain/runs/`    | Runtime orchestration of MCP calls           |
| **Sources**       | `src/domain/sources/` | CSV resources reuse CSV data source creation |
| **Organizations** | `src/iam/orgs/`       | Org-level MCP integration ownership          |

### 11.3 Technology Stack

| Technology                  | Version   | Purpose                           |
| --------------------------- | --------- | --------------------------------- |
| `@modelcontextprotocol/sdk` | `^1.20.2` | MCP client implementation         |
| `@nestjs/common`            | Existing  | Dependency injection, controllers |
| `@nestjs/typeorm`           | Existing  | Database ORM                      |
| `class-validator`           | Existing  | DTO validation                    |
| `class-transformer`         | Existing  | DTO transformation                |

### 11.4 Example MCP Client Usage

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

// Create transport with auth
const transport = new SSEClientTransport(new URL("https://example.com/mcp"), {
  requestInit: {
    headers: { "X-API-Key": "secret-key" },
  },
});

// Create client
const client = new Client(
  { name: "ayunis-core", version: "1.0.0" },
  { capabilities: { tools: {}, resources: {}, prompts: {} } },
);

// Connect
await client.connect(transport);

// List capabilities
const tools = await client.listTools();
const resources = await client.listResources();
const prompts = await client.listPrompts();

// Call tool
const result = await client.callTool("example-tool", { arg1: "value" });

// Read resource (static)
const resourceContent = await client.readResource({ uri: "file:///data.csv" });

// Read resource (parameterized)
const parameterizedResource = await client.readResource({
  uri: "file:///{id}.csv",
  arguments: { id: "123" }
});

// Get prompt
const promptResult = await client.getPrompt("example-prompt", {
  query: "test",
});

// Close connection
await client.close();
```

---

**Document Status**: Draft - Ready for Ticket Breakdown
**Next Steps**:

1. Review architecture with team
2. Break down into implementation tickets
3. Prioritize ticket order based on dependencies
4. Begin Phase 1 implementation

**Approvals**:

- [ ] Technical Lead
- [ ] Product Owner
- [ ] Security Review
- [ ] DevOps Review

---

**Revision History**:

- 2025-10-27: Initial draft (Claude & Daniel)
- 2025-10-27: Updated based on feedback:
  - Changed tool presentation: Only MCP integrations presented (not individual tools)
  - Made authentication optional (enum with optional fields)
  - Replaced manual SQL schema with TypeORM records
  - Removed tools module from affected components
  - Removed incorrect RAG/chunking/embeddings references for CSV processing (CSV simply uses existing data source creation)
  - Removed E2E and integration test requirements (will be handled separately due to test infrastructure setup needs)
  - Updated section 3.2.4 with specific use case: `CreateDataSourceUseCase` with `CreateCSVDataSourceCommand`
  - Added `SourceCreator` enum to sources module: Replace `createdByLLM` boolean with `createdBy` enum (user/llm/system)
  - Added frontend UI design guidance: "Integrations" card in agent configuration with toggle switches
  - Implemented inheritance hierarchy for MCP integrations:
    - Abstract base class `McpIntegration` with `PredefinedMcpIntegration` and `CustomMcpIntegration` subclasses
    - Predefined integrations use `slug` enum (starting with TEST) instead of storing URL in database
    - Custom integrations store user-provided `serverUrl`
    - Single-table inheritance in TypeORM with discriminator column `type`
    - `PredefinedMcpIntegrationRegistryService` (injectable service) for mapping slugs to configuration
    - `McpIntegrationMapper` with private methods for each subclass
  - Restructured application and presenter layers for clean architecture:
    - Removed `application/dtos/` directory
    - Added `application/commands/` for write operations (e.g., `CreatePredefinedMcpIntegrationCommand`)
    - Added `application/queries/` for read operations (e.g., `ListOrgMcpIntegrationsQuery`)
    - Added `application/results/` for custom return types (e.g., `ValidationResult`)
    - Use cases return domain entities or custom result objects
    - Added `presenters/http/dtos/` for HTTP request/response DTOs
    - Controllers map between HTTP DTOs ↔ Commands/Queries ↔ Domain Entities ↔ Response DTOs
    - Credential encryption handled in presenter layer before passing to application layer
- 2025-10-27: Updated agent-MCP integration assignment approach:
  - **Changed from bulk PUT to granular POST/DELETE operations**:
    - Removed `mcpIntegrationIds` from `CreateAgentDto` and `UpdateAgentDto`
    - Added individual endpoints: `POST /agents/:agentId/mcp-integrations/:integrationId` and `DELETE /agents/:agentId/mcp-integrations/:integrationId`
    - Better UX mapping to toggle buttons in UI
    - Eliminates race conditions from concurrent toggles
  - **Added proper ContextService usage pattern** (Section 3.2.5):
    - Use cases inject `ContextService` to get `userId`/`orgId` at runtime
    - Commands/queries contain ONLY operation-specific data (no userId/orgId)
    - Controllers do NOT extract user data with `@CurrentUser()` decorator for passing to use cases
    - Controllers create commands and call use cases directly
  - **Added proper domain error handling pattern** (Section 3.2.5):
    - Use cases throw domain errors (e.g., `AgentNotFoundError`), not NestJS HTTP exceptions
    - Added 5 new error types to agents module: `McpIntegrationNotFoundError`, `McpIntegrationAlreadyAssignedError`, `McpIntegrationNotAssignedError`, `McpIntegrationDisabledError`, `McpIntegrationWrongOrganizationError`
    - Use cases wrap unexpected errors in `UnexpectedAgentError`
    - Try/catch blocks re-throw `ApplicationError` and `UnauthorizedException`
  - **Added new use cases for agent-MCP integration management**:
    - `AssignMcpIntegrationToAgentUseCase` with `AssignMcpIntegrationToAgentCommand`
    - `UnassignMcpIntegrationFromAgentUseCase` with `UnassignMcpIntegrationFromAgentCommand`
    - `ListAgentMcpIntegrationsUseCase` with `ListAgentMcpIntegrationsQuery`
    - `ListAvailableMcpIntegrationsUseCase` with `ListAvailableMcpIntegrationsQuery`
  - **Updated CLAUDE.md** with comprehensive patterns for:
    - ContextService usage for current user access
    - Command/query design (no user context data)
    - Domain error definitions and handling
    - Use case error handling with try/catch pattern
    - Controller simplicity (no user extraction or authorization)
- 2025-10-28: Fixed routing for organization-level features:
  - Changed base path from `/api/admin/mcp-integrations` to `/api/mcp-integrations` (organization admins, not super admins)
  - Renamed `AdminMcpIntegrationsController` to `McpIntegrationsController`
  - Removed separate `admin-mcp-integrations.controller.ts` file (consolidated into single controller)
  - Updated all endpoint references in API contracts, data flow diagrams, and implementation phases
  - **Added authorization guards**: All MCP integration management endpoints require `@Roles(UserRole.ADMIN)` decorator
  - **Agent assignment endpoints**: No admin guard required - users can assign integrations to their own agents (user-scoped authorization via repository)
- 2025-10-28: Refactored predefined MCP integration registry for dependency injection:
  - **Moved registry from domain to application layer**: `domain/predefined-mcp-integration-registry.ts` → `application/services/predefined-mcp-integration-registry.service.ts`
  - **Changed from static to injectable service**: Registry is now `@Injectable()` with instance methods instead of static methods
  - **Removed getServerUrl() methods**:
    - Removed abstract `getServerUrl()` from base `McpIntegration` class
    - Removed `getServerUrl()` implementation from `PredefinedMcpIntegration` - use registry service instead
    - Removed `getServerUrl()` implementation from `CustomMcpIntegration` - access `serverUrl` property directly
  - **Added new use case**: `ListPredefinedMcpIntegrationConfigsUseCase` for getting available predefined configs
  - **Use cases inject registry**: All use cases that need predefined config (URL, defaults) now inject `PredefinedMcpIntegrationRegistryService`
  - **Module registration**: Registry service must be registered as provider in `McpModule`
  - **Benefits**: Better testability (mockable service), follows NestJS DI patterns, cleaner separation of concerns
- 2025-10-28: Added support for parameterized MCP resources:
  - **Updated `McpResource` entity** (Section 4.1.3):
    - Added `ResourceArgument` interface (name, description, required)
    - Added optional `arguments` field to `McpResource` for parameterized resources
    - URI can now be a template (e.g., `file:///{id}.csv`)
  - **Updated `McpClientPort`** (Section 5.1.1):
    - Added optional `parameters` parameter to `readResource()` method
    - Allows passing parameter values for URI template substitution
  - **Updated `McpSdkClientAdapter`** (Section 5.1.2):
    - Implemented `readResource()` method with parameters support
    - Passes parameters to MCP SDK's `client.readResource({ uri, arguments })`
    - Handles content extraction from SDK response
  - **Updated `RetrieveMcpResourceCommand`** (Section 3.2.4):
    - Added explicit command definition with optional `parameters` field
    - Updated use case implementation to pass parameters through to MCP client
  - **Pattern consistency**: Resource parameters follow same pattern as prompt arguments (already in architecture)
