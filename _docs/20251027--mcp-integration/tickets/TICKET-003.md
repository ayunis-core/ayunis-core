# TICKET-003: Create MCP Domain Entities

## Description

Implement the domain entities for the MCP module following hexagonal architecture. This includes the inheritance hierarchy for MCP integrations (base abstract class with predefined and custom subclasses), plus ephemeral entities for tools, resources, and prompts.

**Why**: Domain entities represent the core business logic and rules for MCP integrations. They must be pure TypeScript classes without framework dependencies (no TypeORM decorators).

**Technical Approach**:
1. Create abstract base class `McpIntegration` with common fields
2. Create `PredefinedMcpIntegration` subclass with slug field
3. Create `CustomMcpIntegration` subclass with serverUrl field
4. Create ephemeral entities: `McpTool`, `McpResource`, `McpPrompt`
5. Create enums for auth methods and predefined slugs
6. Implement business logic methods (enable, disable, updateCredentials)

## Acceptance Criteria

- [ ] `McpAuthMethod` enum created with values: `API_KEY`, `BEARER_TOKEN`
- [ ] `PredefinedMcpIntegrationSlug` enum created with initial value: `TEST`
- [ ] Abstract `McpIntegration` base class created in `src/domain/mcp/domain/mcp-integration.entity.ts`
- [ ] Base class includes: `id`, `name`, `type` (abstract), `authMethod?`, `authHeaderName?`, `encryptedCredentials?`, `enabled`, `organizationId`, `createdAt`, `updatedAt`
- [ ] Base class constructor generates UUID if `id` is null
- [ ] Base class has methods: `disable()`, `enable()`, `updateCredentials(newEncryptedCredentials: string)`, `hasAuthentication(): boolean`
- [ ] `PredefinedMcpIntegration` subclass created extending base class
- [ ] `PredefinedMcpIntegration` has `type = 'predefined' as const` and `slug: PredefinedMcpIntegrationSlug`
- [ ] `CustomMcpIntegration` subclass created extending base class
- [ ] `CustomMcpIntegration` has `type = 'custom' as const` and `serverUrl: string`
- [ ] `McpTool` entity created with fields: `name`, `description`, `inputSchema`, `integrationId`
- [ ] `McpResource` entity created with fields: `uri`, `name`, `description`, `mimeType`, `integrationId`, `arguments?`
- [ ] `ResourceArgument` interface created with: `name`, `description`, `required`
- [ ] `McpPrompt` entity created with fields: `name`, `description`, `arguments`, `integrationId`
- [ ] `PromptArgument` interface created with: `name`, `required`
- [ ] Unit tests added for:
  - Base class generates UUID when id is null
  - Base class uses provided UUID when id is not null
  - `disable()` sets enabled to false and updates timestamp
  - `enable()` sets enabled to true and updates timestamp
  - `updateCredentials()` updates encryptedCredentials and timestamp
  - `hasAuthentication()` returns true when authMethod is set, false otherwise
  - Predefined integration has correct type discriminator
  - Custom integration has correct type discriminator
  - Ephemeral entities instantiate correctly with all fields

## Dependencies

None - this is a foundation ticket

## Status

- [x] To Do
- [ ] In Progress
- [ ] Done

## Complexity

Medium

## Technical Notes

**Files to create**:
- `src/domain/mcp/domain/mcp-integration.entity.ts` (all integration classes)
- `src/domain/mcp/domain/mcp-tool.entity.ts`
- `src/domain/mcp/domain/mcp-resource.entity.ts`
- `src/domain/mcp/domain/mcp-prompt.entity.ts`
- `src/domain/mcp/domain/mcp-auth-method.enum.ts`
- `src/domain/mcp/domain/predefined-mcp-integration-slug.enum.ts`

**Entity Design Patterns**:
- Pure TypeScript classes (NO TypeORM decorators)
- Domain entities generate their own UUIDs using `randomUUID()`
- Constructors accept `id: string | null` (null means generate new)
- Immutable IDs (readonly property)
- Business logic methods update `updatedAt` timestamp

**Base Class Constructor Signature**:
```typescript
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
)
```

**Testing Approach**:
- Unit test each entity class in isolation
- Test constructor with null id generates UUID
- Test constructor with provided id uses that id
- Test business logic methods (enable/disable/update)
- Test type discriminators are correct
- No database or framework dependencies in tests
