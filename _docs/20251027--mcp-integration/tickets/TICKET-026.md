# TICKET-026: Implement MCP Integrations Controller

## Description

Implement the complete REST API controller for MCP integration management. This controller provides organization admins with CRUD operations for managing their organization's MCP integrations (both predefined and custom), including validation, enable/disable operations, and listing available predefined configurations.

**Why**: Organization admins need a comprehensive API to configure and manage MCP integrations for their organization. This controller exposes all management operations through a RESTful API with proper authorization, validation, and OpenAPI documentation.

**Technical Approach**:
1. Create all request/response DTOs with class-validator decorators and OpenAPI documentation
2. Create DTO mapper service for converting domain entities to response DTOs
3. Implement controller at `/api/mcp-integrations` path
4. Apply `@Roles(UserRole.ADMIN)` decorator to all endpoints (organization admin only)
5. Controller handles credential encryption BEFORE passing to use cases
6. Controller creates commands/queries from DTOs and calls use cases
7. Controller maps domain entity results to response DTOs (NEVER including credentials)
8. Add comprehensive OpenAPI documentation with examples

**Key Endpoints**:
- `POST /predefined` - Create predefined integration
- `POST /custom` - Create custom integration
- `GET /` - List all integrations for org
- `GET /predefined/available` - List available predefined configs
- `GET /:id` - Get integration by ID
- `PATCH /:id` - Update integration
- `DELETE /:id` - Delete integration
- `POST /:id/enable` - Enable integration
- `POST /:id/disable` - Disable integration
- `POST /:id/validate` - Validate integration config

## Acceptance Criteria

### DTOs

- [ ] `CreatePredefinedIntegrationDto` created in `presenters/http/dtos/create-predefined-integration.dto.ts`:
  - Fields: `name: string` (required), `slug: string` (required, enum validation), `authMethod?: string` (optional, enum), `authHeaderName?: string` (optional), `credentials?: string` (optional)
  - All fields have `@ApiProperty()` with descriptions and examples
  - Validation: `@IsString()`, `@IsNotEmpty()`, `@IsEnum()`, `@IsOptional()` as appropriate
  - Example slug values in API docs
- [ ] `CreateCustomIntegrationDto` created in `presenters/http/dtos/create-custom-integration.dto.ts`:
  - Fields: `name: string` (required), `serverUrl: string` (required, URL format), `authMethod?: string` (optional, enum), `authHeaderName?: string` (optional), `credentials?: string` (optional)
  - All fields have `@ApiProperty()` with descriptions and examples
  - Validation: `@IsString()`, `@IsNotEmpty()`, `@IsUrl()`, `@IsEnum()`, `@IsOptional()` as appropriate
- [ ] `UpdateMcpIntegrationDto` created in `presenters/http/dtos/update-mcp-integration.dto.ts`:
  - Fields: All optional: `name?: string`, `authMethod?: string`, `authHeaderName?: string`, `credentials?: string`
  - All fields have `@ApiProperty()` with `required: false`
  - Validation: `@IsOptional()`, `@IsString()`, `@IsEnum()` as appropriate
- [ ] `McpIntegrationResponseDto` created in `presenters/http/dtos/mcp-integration-response.dto.ts`:
  - Fields: `id: string`, `name: string`, `type: 'predefined' | 'custom'`, `slug?: string`, `serverUrl?: string`, `enabled: boolean`, `organizationId: string`, `authMethod?: string`, `authHeaderName?: string`, `hasCredentials: boolean`, `createdAt: Date`, `updatedAt: Date`
  - NEVER includes actual credentials (only `hasCredentials` boolean)
  - All fields have `@ApiProperty()` with descriptions
  - Discriminated union pattern for predefined vs custom (predefined has slug, custom has serverUrl)
- [ ] `ValidationResponseDto` created in `presenters/http/dtos/validation-response.dto.ts`:
  - Fields: `valid: boolean`, `capabilities: { tools: number, resources: number, prompts: number }`, `error?: string`
  - All fields have `@ApiProperty()` with descriptions and examples
- [ ] `PredefinedConfigResponseDto` created in `presenters/http/dtos/predefined-config-response.dto.ts`:
  - Fields: `slug: string`, `displayName: string`, `description: string`, `defaultAuthMethod?: string`, `defaultAuthHeaderName?: string`
  - NEVER includes server URL (kept private for security)
  - All fields have `@ApiProperty()` with descriptions

### Mapper

- [ ] `McpIntegrationDtoMapper` created in `presenters/http/mappers/mcp-integration.mapper.ts`:
  - Injectable service decorated with `@Injectable()`
  - Method: `toDto(entity: McpIntegration): McpIntegrationResponseDto`
  - Method: `toDtoArray(entities: McpIntegration[]): McpIntegrationResponseDto[]`
  - Handles both `PredefinedMcpIntegration` and `CustomMcpIntegration` via instanceof checks
  - Sets `hasCredentials` to `!!entity.encryptedCredentials`
  - NEVER includes actual credentials in response
  - Maps all common fields correctly
  - Predefined: includes `slug`, no `serverUrl` in response
  - Custom: includes `serverUrl`, no `slug`

### Controller

- [ ] `McpIntegrationsController` created in `presenters/http/mcp-integrations.controller.ts`:
  - Path: `@Controller('mcp-integrations')`
  - Tagged: `@ApiTags('mcp-integrations')`
  - Injects all necessary use cases (10 use cases total)
  - Injects `McpIntegrationDtoMapper` for response mapping
  - Injects `McpCredentialEncryptionPort` for encrypting credentials
  - Has private logger: `private readonly logger = new Logger(McpIntegrationsController.name)`

### Controller Endpoints

- [ ] `POST /predefined` endpoint:
  - Decorator: `@Post('predefined')`
  - Authorization: `@Roles(UserRole.ADMIN)` (organization admin only)
  - OpenAPI: `@ApiOperation()`, `@ApiBody()`, `@ApiResponse()` (201, 400, 404)
  - Parameter: `@Body() dto: CreatePredefinedIntegrationDto`
  - Encrypts credentials if provided: `await this.credentialEncryption.encrypt(dto.credentials)`
  - Creates `CreatePredefinedMcpIntegrationCommand` with encrypted credentials
  - Calls `CreateMcpIntegrationUseCase`
  - Maps result to `McpIntegrationResponseDto`
  - Returns created integration
- [ ] `POST /custom` endpoint:
  - Decorator: `@Post('custom')`
  - Authorization: `@Roles(UserRole.ADMIN)` (organization admin only)
  - OpenAPI: `@ApiOperation()`, `@ApiBody()`, `@ApiResponse()` (201, 400)
  - Parameter: `@Body() dto: CreateCustomIntegrationDto`
  - Encrypts credentials if provided
  - Creates `CreateCustomMcpIntegrationCommand` with encrypted credentials
  - Calls `CreateMcpIntegrationUseCase`
  - Maps result to `McpIntegrationResponseDto`
  - Returns created integration
- [ ] `GET /` endpoint:
  - Decorator: `@Get()`
  - Authorization: `@Roles(UserRole.ADMIN)` (organization admin only)
  - OpenAPI: `@ApiOperation()`, `@ApiResponse()` (200)
  - No parameters (orgId from ContextService)
  - Creates `ListOrgMcpIntegrationsQuery()`
  - Calls `ListOrgMcpIntegrationsUseCase`
  - Maps array to `McpIntegrationResponseDto[]`
  - Returns all integrations for org
- [ ] `GET /predefined/available` endpoint:
  - Decorator: `@Get('predefined/available')`
  - Authorization: `@Roles(UserRole.ADMIN)` (organization admin only)
  - OpenAPI: `@ApiOperation()`, `@ApiResponse()` (200)
  - No parameters
  - Creates `ListPredefinedMcpIntegrationConfigsQuery()`
  - Calls `ListPredefinedMcpIntegrationConfigsUseCase`
  - Returns array of predefined config metadata (NOT full DTOs - use case returns config objects)
  - Maps to `PredefinedConfigResponseDto[]`
- [ ] `GET /:id` endpoint:
  - Decorator: `@Get(':id')`
  - Authorization: `@Roles(UserRole.ADMIN)` (organization admin only)
  - OpenAPI: `@ApiOperation()`, `@ApiParam()`, `@ApiResponse()` (200, 404)
  - Parameter: `@Param('id', ParseUUIDPipe) id: UUID`
  - Creates `GetMcpIntegrationQuery(id)`
  - Calls `GetMcpIntegrationUseCase`
  - Maps result to `McpIntegrationResponseDto`
  - Returns single integration
- [ ] `PATCH /:id` endpoint:
  - Decorator: `@Patch(':id')`
  - Authorization: `@Roles(UserRole.ADMIN)` (organization admin only)
  - OpenAPI: `@ApiOperation()`, `@ApiParam()`, `@ApiBody()`, `@ApiResponse()` (200, 400, 404)
  - Parameters: `@Param('id', ParseUUIDPipe) id: UUID`, `@Body() dto: UpdateMcpIntegrationDto`
  - Encrypts credentials if provided in update
  - Creates `UpdateMcpIntegrationCommand(id, dto.name, dto.authMethod, dto.authHeaderName, encryptedCredentials)`
  - Calls `UpdateMcpIntegrationUseCase`
  - Maps result to `McpIntegrationResponseDto`
  - Returns updated integration
- [ ] `DELETE /:id` endpoint:
  - Decorator: `@Delete(':id')`
  - Status code: `@HttpCode(HttpStatus.NO_CONTENT)`
  - Authorization: `@Roles(UserRole.ADMIN)` (organization admin only)
  - OpenAPI: `@ApiOperation()`, `@ApiParam()`, `@ApiResponse()` (204, 404)
  - Parameter: `@Param('id', ParseUUIDPipe) id: UUID`
  - Creates `DeleteMcpIntegrationCommand(id)`
  - Calls `DeleteMcpIntegrationUseCase`
  - Returns void (204 No Content)
- [ ] `POST /:id/enable` endpoint:
  - Decorator: `@Post(':id/enable')`
  - Authorization: `@Roles(UserRole.ADMIN)` (organization admin only)
  - OpenAPI: `@ApiOperation()`, `@ApiParam()`, `@ApiResponse()` (200, 404)
  - Parameter: `@Param('id', ParseUUIDPipe) id: UUID`
  - Creates `EnableMcpIntegrationCommand(id)`
  - Calls `EnableMcpIntegrationUseCase`
  - Maps result to `McpIntegrationResponseDto`
  - Returns enabled integration
- [ ] `POST /:id/disable` endpoint:
  - Decorator: `@Post(':id/disable')`
  - Authorization: `@Roles(UserRole.ADMIN)` (organization admin only)
  - OpenAPI: `@ApiOperation()`, `@ApiParam()`, `@ApiResponse()` (200, 404)
  - Parameter: `@Param('id', ParseUUIDPipe) id: UUID`
  - Creates `DisableMcpIntegrationCommand(id)`
  - Calls `DisableMcpIntegrationUseCase`
  - Maps result to `McpIntegrationResponseDto`
  - Returns disabled integration
- [ ] `POST /:id/validate` endpoint:
  - Decorator: `@Post(':id/validate')`
  - Authorization: `@Roles(UserRole.ADMIN)` (organization admin only)
  - OpenAPI: `@ApiOperation()`, `@ApiParam()`, `@ApiResponse()` (200, 404)
  - Parameter: `@Param('id', ParseUUIDPipe) id: UUID`
  - Creates `ValidateMcpIntegrationCommand(id)`
  - Calls `ValidateMcpIntegrationUseCase`
  - Returns `ValidationResponseDto` directly (use case returns ValidationResult)
  - Maps ValidationResult to ValidationResponseDto

### Module Registration

- [ ] Controller added to `mcp.module.ts`:
  - Imported in `controllers` array
  - Mapper registered in `providers` array
  - Encryption service port imported from common module

### Testing

- [ ] Unit tests added for `McpIntegrationDtoMapper`:
  - Correctly maps predefined integration to DTO
  - Correctly maps custom integration to DTO
  - Sets `hasCredentials` to true when credentials exist
  - Sets `hasCredentials` to false when credentials null
  - NEVER includes actual credentials in DTO
  - Maps all fields correctly
  - Handles array mapping
- [ ] Unit tests added for controller:
  - Each endpoint creates correct command/query
  - Each endpoint calls correct use case
  - Each endpoint maps result to correct DTO type
  - POST /predefined encrypts credentials before passing to use case
  - POST /custom encrypts credentials before passing to use case
  - PATCH /:id encrypts credentials if provided
  - DELETE returns 204 No Content
  - Validation endpoint returns ValidationResponseDto
  - All endpoints have correct authorization decorator
  - All endpoints have correct OpenAPI decorators

## Dependencies

- TICKET-007 (CreateMcpIntegrationUseCase - predefined)
- TICKET-008 (CreateMcpIntegrationUseCase - custom)
- TICKET-009 (GetMcpIntegrationUseCase)
- TICKET-010 (ListOrgMcpIntegrationsUseCase)
- TICKET-011 (UpdateMcpIntegrationUseCase)
- TICKET-012 (DeleteMcpIntegrationUseCase)
- TICKET-013 (EnableMcpIntegrationUseCase)
- TICKET-014 (DisableMcpIntegrationUseCase)
- TICKET-015 (ValidateMcpIntegrationUseCase)
- TICKET-016 (ListPredefinedMcpIntegrationConfigsUseCase)
- TICKET-002 (McpCredentialEncryptionPort)

## Status

- [x] To Do
- [ ] In Progress
- [ ] Done

## Complexity

Large

## Technical Notes

**Files to create**:
- `src/domain/mcp/presenters/http/dtos/create-predefined-integration.dto.ts`
- `src/domain/mcp/presenters/http/dtos/create-custom-integration.dto.ts`
- `src/domain/mcp/presenters/http/dtos/update-mcp-integration.dto.ts`
- `src/domain/mcp/presenters/http/dtos/mcp-integration-response.dto.ts`
- `src/domain/mcp/presenters/http/dtos/validation-response.dto.ts`
- `src/domain/mcp/presenters/http/dtos/predefined-config-response.dto.ts`
- `src/domain/mcp/presenters/http/mappers/mcp-integration.mapper.ts`
- `src/domain/mcp/presenters/http/mcp-integrations.controller.ts`

**Files to modify**:
- `src/domain/mcp/mcp.module.ts` - Add controller and mapper to module

**Authorization Pattern**:
This controller implements **organization admin authorization** (level 2 from CLAUDE.md):
- All endpoints require `@Roles(UserRole.ADMIN)` decorator
- Requires JWT authentication + user must have `ADMIN` role in their organization
- Use cases retrieve `orgId` from `ContextService` to enforce org boundaries
- NO `@CurrentUser()` decorator usage (use cases get context from ContextService)

**Credential Encryption Flow**:
```typescript
// Controller encrypts BEFORE passing to use case
const encryptedCreds = dto.credentials
  ? await this.credentialEncryption.encrypt(dto.credentials)
  : undefined;

const command = new CreatePredefinedMcpIntegrationCommand(
  dto.name,
  dto.slug,
  dto.authMethod,
  dto.authHeaderName,
  encryptedCreds, // Already encrypted
);

const integration = await this.createMcpIntegrationUseCase.execute(command);
```

**Response DTO Pattern** (Never Include Credentials):
```typescript
// CORRECT ✓
export class McpIntegrationResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'GitHub Integration' })
  name: string;

  @ApiProperty({ example: true, description: 'Whether credentials are configured' })
  hasCredentials: boolean; // Boolean flag only

  // ... other fields
}

// INCORRECT ✗ - Never expose credentials
export class BadDto {
  credentials: string; // ✗ SECURITY ISSUE - never do this
  encryptedCredentials: string; // ✗ Still sensitive - never expose
}
```

**Mapper Implementation Pattern**:
```typescript
@Injectable()
export class McpIntegrationDtoMapper {
  toDto(entity: McpIntegration): McpIntegrationResponseDto {
    const baseDto = {
      id: entity.id,
      name: entity.name,
      enabled: entity.enabled,
      organizationId: entity.organizationId,
      authMethod: entity.authMethod,
      authHeaderName: entity.authHeaderName,
      hasCredentials: !!entity.encryptedCredentials, // Boolean only
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };

    if (entity instanceof PredefinedMcpIntegration) {
      return {
        ...baseDto,
        type: 'predefined' as const,
        slug: entity.slug,
        serverUrl: undefined, // Not exposed for predefined
      };
    }

    if (entity instanceof CustomMcpIntegration) {
      return {
        ...baseDto,
        type: 'custom' as const,
        slug: undefined,
        serverUrl: entity.serverUrl,
      };
    }

    throw new Error('Unknown MCP integration type');
  }

  toDtoArray(entities: McpIntegration[]): McpIntegrationResponseDto[] {
    return entities.map((entity) => this.toDto(entity));
  }
}
```

**Controller Pattern Example**:
```typescript
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

@ApiTags('mcp-integrations')
@Controller('mcp-integrations')
export class McpIntegrationsController {
  private readonly logger = new Logger(McpIntegrationsController.name);

  constructor(
    private readonly createMcpIntegrationUseCase: CreateMcpIntegrationUseCase,
    private readonly listOrgMcpIntegrationsUseCase: ListOrgMcpIntegrationsUseCase,
    private readonly getMcpIntegrationUseCase: GetMcpIntegrationUseCase,
    private readonly updateMcpIntegrationUseCase: UpdateMcpIntegrationUseCase,
    private readonly deleteMcpIntegrationUseCase: DeleteMcpIntegrationUseCase,
    private readonly enableMcpIntegrationUseCase: EnableMcpIntegrationUseCase,
    private readonly disableMcpIntegrationUseCase: DisableMcpIntegrationUseCase,
    private readonly validateMcpIntegrationUseCase: ValidateMcpIntegrationUseCase,
    private readonly listPredefinedConfigsUseCase: ListPredefinedMcpIntegrationConfigsUseCase,
    private readonly mcpIntegrationDtoMapper: McpIntegrationDtoMapper,
    private readonly credentialEncryption: McpCredentialEncryptionPort,
  ) {}

  @Post('predefined')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new predefined MCP integration' })
  @ApiBody({ type: CreatePredefinedIntegrationDto })
  @ApiResponse({ status: 201, type: McpIntegrationResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid slug or missing required fields' })
  @ApiResponse({ status: 404, description: 'Predefined integration slug not found' })
  async createPredefined(
    @Body() dto: CreatePredefinedIntegrationDto,
  ): Promise<McpIntegrationResponseDto> {
    this.logger.log('createPredefined', { name: dto.name, slug: dto.slug });

    // Encrypt credentials at HTTP layer
    const encryptedCreds = dto.credentials
      ? await this.credentialEncryption.encrypt(dto.credentials)
      : undefined;

    const command = new CreatePredefinedMcpIntegrationCommand(
      dto.name,
      dto.slug,
      dto.authMethod,
      dto.authHeaderName,
      encryptedCreds,
    );

    const integration = await this.createMcpIntegrationUseCase.execute(command);
    return this.mcpIntegrationDtoMapper.toDto(integration);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all MCP integrations for organization' })
  @ApiResponse({ status: 200, type: [McpIntegrationResponseDto] })
  async list(): Promise<McpIntegrationResponseDto[]> {
    this.logger.log('listOrgMcpIntegrations');

    const integrations = await this.listOrgMcpIntegrationsUseCase.execute(
      new ListOrgMcpIntegrationsQuery(),
    );

    return this.mcpIntegrationDtoMapper.toDtoArray(integrations);
  }

  @Post(':id/validate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Validate MCP integration connection' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: ValidationResponseDto })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  async validate(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<ValidationResponseDto> {
    this.logger.log('validateIntegration', { id });

    const result = await this.validateMcpIntegrationUseCase.execute(
      new ValidateMcpIntegrationCommand(id),
    );

    return {
      valid: result.valid,
      capabilities: result.capabilities,
      error: result.error,
    };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete MCP integration' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Integration deleted successfully' })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  async delete(@Param('id', ParseUUIDPipe) id: UUID): Promise<void> {
    this.logger.log('deleteIntegration', { id });

    await this.deleteMcpIntegrationUseCase.execute(
      new DeleteMcpIntegrationCommand(id),
    );
  }
}
```

**DTO Validation Example**:
```typescript
export class CreatePredefinedIntegrationDto {
  @ApiProperty({
    description: 'The name for this integration instance',
    example: 'Production GitHub Integration',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  name: string;

  @ApiProperty({
    description: 'The predefined integration slug',
    example: 'github',
    enum: ['github', 'gitlab', 'jira'], // Example slugs
  })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({
    description: 'Authentication method',
    example: 'bearer',
    enum: ['bearer', 'apiKey', 'basic'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['bearer', 'apiKey', 'basic'])
  authMethod?: string;

  @ApiProperty({
    description: 'Custom auth header name (e.g., X-API-Key)',
    example: 'Authorization',
    required: false,
  })
  @IsOptional()
  @IsString()
  authHeaderName?: string;

  @ApiProperty({
    description: 'Authentication credentials (will be encrypted)',
    example: 'sk_test_123abc',
    required: false,
  })
  @IsOptional()
  @IsString()
  credentials?: string;
}
```

**Import Requirements**:
```typescript
import { Controller, Post, Get, Patch, Delete, Param, Body, HttpCode, HttpStatus, ParseUUIDPipe, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
```

**Testing Approach**:
- Mock all use cases and dependencies
- Test that each endpoint creates correct command/query structure
- Verify credential encryption happens in controller (not use case)
- Verify mapper never includes credentials in response
- Test authorization decorators are present
- Test OpenAPI decorators for documentation
- Verify 204 No Content for DELETE
- Verify validation response maps correctly
