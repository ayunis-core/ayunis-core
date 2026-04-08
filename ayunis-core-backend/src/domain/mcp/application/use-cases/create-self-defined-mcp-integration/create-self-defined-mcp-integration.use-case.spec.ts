import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateSelfDefinedMcpIntegrationUseCase } from './create-self-defined-mcp-integration.use-case';
import { CreateSelfDefinedMcpIntegrationCommand } from './create-self-defined-mcp-integration.command';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { McpCredentialEncryptionPort } from '../../ports/mcp-credential-encryption.port';
import { McpIntegrationFactory } from '../../factories/mcp-integration.factory';
import { MarketplaceConfigService } from '../../services/marketplace-config.service';
import { ConnectionValidationService } from '../../services/connection-validation.service';
import { ContextService } from 'src/common/context/services/context.service';
import {
  McpOAuthClientNotConfiguredError,
  McpAuthorizationHeaderCollisionError,
  McpInvalidConfigSchemaError,
  UnexpectedMcpError,
} from '../../mcp.errors';
import { SelfDefinedMcpIntegration } from '../../../domain/integrations/self-defined-mcp-integration.entity';
import type { IntegrationConfigSchema } from '../../../domain/value-objects/integration-config-schema';

describe('CreateSelfDefinedMcpIntegrationUseCase', () => {
  let useCase: CreateSelfDefinedMcpIntegrationUseCase;
  let repository: jest.Mocked<McpIntegrationsRepositoryPort>;
  let credentialEncryption: jest.Mocked<McpCredentialEncryptionPort>;
  let marketplaceConfigService: jest.Mocked<MarketplaceConfigService>;
  let connectionValidationService: jest.Mocked<ConnectionValidationService>;
  let contextService: jest.Mocked<ContextService>;

  const mockOrgId = randomUUID();

  const noAuthSchema: IntegrationConfigSchema = {
    authType: 'HEADER',
    orgFields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'secret',
        headerName: 'X-Api-Key',
        required: true,
      },
    ],
    userFields: [],
  };

  const oauthSchema: IntegrationConfigSchema = {
    authType: 'OAUTH',
    orgFields: [],
    userFields: [],
    oauth: {
      authorizationUrl: 'https://auth.example.com/authorize',
      tokenUrl: 'https://auth.example.com/token',
      scopes: ['read'],
      level: 'org',
    },
  };

  const collisionSchema: IntegrationConfigSchema = {
    authType: 'OAUTH',
    orgFields: [
      {
        key: 'auth_header',
        label: 'Auth Header',
        type: 'secret',
        headerName: 'Authorization',
        required: true,
      },
    ],
    userFields: [],
    oauth: {
      authorizationUrl: 'https://auth.example.com/authorize',
      tokenUrl: 'https://auth.example.com/token',
      scopes: ['read'],
      level: 'org',
    },
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateSelfDefinedMcpIntegrationUseCase,
        McpIntegrationFactory,
        {
          provide: McpIntegrationsRepositoryPort,
          useValue: {
            save: jest.fn(),
          },
        },
        {
          provide: McpCredentialEncryptionPort,
          useValue: {
            encrypt: jest.fn(),
            decrypt: jest.fn(),
          },
        },
        {
          provide: MarketplaceConfigService,
          useValue: {
            mergeFixedValues: jest.fn(),
            validateRequiredFields: jest.fn(),
            encryptSecretFields: jest.fn(),
          },
        },
        {
          provide: ConnectionValidationService,
          useValue: {
            validateAndUpdateStatus: jest.fn(),
          },
        },
        {
          provide: ContextService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(CreateSelfDefinedMcpIntegrationUseCase);
    repository = module.get(McpIntegrationsRepositoryPort);
    credentialEncryption = module.get(McpCredentialEncryptionPort);
    marketplaceConfigService = module.get(MarketplaceConfigService);
    connectionValidationService = module.get(ConnectionValidationService);
    contextService = module.get(ContextService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function setupHappyPath(): void {
    contextService.get.mockReturnValue(mockOrgId);
    marketplaceConfigService.mergeFixedValues.mockReturnValue({
      api_key: 'test-key',
    });
    marketplaceConfigService.validateRequiredFields.mockReturnValue(undefined);
    marketplaceConfigService.encryptSecretFields.mockResolvedValue({
      api_key: 'encrypted-key',
    });
    repository.save.mockImplementation(async (entity) => entity);
    connectionValidationService.validateAndUpdateStatus.mockImplementation(
      async (entity) => entity,
    );
  }

  describe('happy path — NO_AUTH with header secret', () => {
    it('should create a self-defined integration', async () => {
      setupHappyPath();

      const command = new CreateSelfDefinedMcpIntegrationCommand(
        'Test Integration',
        'https://mcp.example.com',
        noAuthSchema,
        { api_key: 'test-key' },
        'A test integration',
        undefined,
        undefined,
        false,
      );

      const result = await useCase.execute(command);

      expect(result).toBeInstanceOf(SelfDefinedMcpIntegration);
      expect(result.name).toBe('Test Integration');
      expect(result.serverUrl).toBe('https://mcp.example.com');
      expect(result.orgId).toBe(mockOrgId);
      expect(result.description).toBe('A test integration');

      expect(marketplaceConfigService.mergeFixedValues).toHaveBeenCalledWith(
        { api_key: 'test-key' },
        noAuthSchema.orgFields,
      );
      expect(
        marketplaceConfigService.validateRequiredFields,
      ).toHaveBeenCalled();
      expect(marketplaceConfigService.encryptSecretFields).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
      expect(
        connectionValidationService.validateAndUpdateStatus,
      ).toHaveBeenCalled();
    });
  });

  describe('happy path — with OAuth', () => {
    it('should create an integration with encrypted OAuth client credentials', async () => {
      setupHappyPath();
      marketplaceConfigService.mergeFixedValues.mockReturnValue({});
      marketplaceConfigService.encryptSecretFields.mockResolvedValue({});
      credentialEncryption.encrypt.mockResolvedValue('encrypted-client-secret');

      const command = new CreateSelfDefinedMcpIntegrationCommand(
        'OAuth Integration',
        'https://mcp.example.com',
        oauthSchema,
        {},
        undefined,
        'my-client-id',
        'my-client-secret',
        false,
      );

      const result = await useCase.execute(command);

      expect(result).toBeInstanceOf(SelfDefinedMcpIntegration);
      expect(result.oauthClientId).toBe('my-client-id');
      expect(result.oauthClientSecretEncrypted).toBe('encrypted-client-secret');
      expect(credentialEncryption.encrypt).toHaveBeenCalledWith(
        'my-client-secret',
      );
    });
  });

  describe('error — invalid config schema', () => {
    it('should throw McpInvalidConfigSchemaError for bad schema', async () => {
      contextService.get.mockReturnValue(mockOrgId);

      const command = new CreateSelfDefinedMcpIntegrationCommand(
        'Bad Schema',
        'https://mcp.example.com',
        {
          authType: '',
          orgFields: [],
          userFields: [],
        } as unknown as IntegrationConfigSchema,
        {},
      );

      await expect(useCase.execute(command)).rejects.toThrow(
        McpInvalidConfigSchemaError,
      );
    });
  });

  describe('error — OAuth without client credentials', () => {
    it('should throw McpOAuthClientNotConfiguredError when clientId missing', async () => {
      contextService.get.mockReturnValue(mockOrgId);

      const command = new CreateSelfDefinedMcpIntegrationCommand(
        'OAuth No Creds',
        'https://mcp.example.com',
        oauthSchema,
        {},
        undefined,
        undefined,
        undefined,
      );

      await expect(useCase.execute(command)).rejects.toThrow(
        McpOAuthClientNotConfiguredError,
      );
    });

    it('should throw McpOAuthClientNotConfiguredError when clientSecret missing', async () => {
      contextService.get.mockReturnValue(mockOrgId);

      const command = new CreateSelfDefinedMcpIntegrationCommand(
        'OAuth No Secret',
        'https://mcp.example.com',
        oauthSchema,
        {},
        undefined,
        'my-client-id',
        undefined,
      );

      await expect(useCase.execute(command)).rejects.toThrow(
        McpOAuthClientNotConfiguredError,
      );
    });
  });

  describe('error — Authorization header collision', () => {
    it('should throw McpAuthorizationHeaderCollisionError when orgField has Authorization header and OAuth', async () => {
      contextService.get.mockReturnValue(mockOrgId);

      const command = new CreateSelfDefinedMcpIntegrationCommand(
        'Collision',
        'https://mcp.example.com',
        collisionSchema,
        {},
        undefined,
        'my-client-id',
        'my-client-secret',
      );

      await expect(useCase.execute(command)).rejects.toThrow(
        McpAuthorizationHeaderCollisionError,
      );
    });

    it('should throw when userField has Authorization header and OAuth', async () => {
      contextService.get.mockReturnValue(mockOrgId);

      const schemaWithUserCollision: IntegrationConfigSchema = {
        authType: 'OAUTH',
        orgFields: [],
        userFields: [
          {
            key: 'token',
            label: 'Token',
            type: 'secret',
            headerName: 'authorization',
            required: true,
          },
        ],
        oauth: {
          authorizationUrl: 'https://auth.example.com/authorize',
          tokenUrl: 'https://auth.example.com/token',
          scopes: [],
          level: 'user',
        },
      };

      const command = new CreateSelfDefinedMcpIntegrationCommand(
        'Collision',
        'https://mcp.example.com',
        schemaWithUserCollision,
        {},
        undefined,
        'my-client-id',
        'my-client-secret',
      );

      await expect(useCase.execute(command)).rejects.toThrow(
        McpAuthorizationHeaderCollisionError,
      );
    });
  });

  describe('error — unauthenticated', () => {
    it('should throw UnauthorizedException when orgId is missing', async () => {
      contextService.get.mockReturnValue(undefined);

      const command = new CreateSelfDefinedMcpIntegrationCommand(
        'Test',
        'https://mcp.example.com',
        noAuthSchema,
        {},
      );

      await expect(useCase.execute(command)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('error — unexpected', () => {
    it('should wrap unexpected errors in UnexpectedMcpError', async () => {
      contextService.get.mockReturnValue(mockOrgId);
      marketplaceConfigService.mergeFixedValues.mockImplementation(() => {
        throw new Error('DB down');
      });

      const command = new CreateSelfDefinedMcpIntegrationCommand(
        'Test',
        'https://mcp.example.com',
        noAuthSchema,
        { api_key: 'test-key' },
      );

      await expect(useCase.execute(command)).rejects.toThrow(
        UnexpectedMcpError,
      );
    });
  });
});
