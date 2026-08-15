import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { getLoggerToken } from 'nestjs-pino';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateMcpIntegrationUseCase } from './create-mcp-integration.use-case';
import { CreatePredefinedMcpIntegrationCommand } from './create-predefined-mcp-integration.command';
import { CreateCustomMcpIntegrationCommand } from './create-custom-mcp-integration.command';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { PredefinedMcpIntegrationRegistry } from '../../registries/predefined-mcp-integration-registry.service';
import { ContextService } from 'src/common/context/services/context.service';
import { McpIntegrationFactory } from '../../factories/mcp-integration.factory';
import { McpIntegrationAuthFactory } from '../../factories/mcp-integration-auth.factory';
import { McpCredentialEncryptionPort } from '../../ports/mcp-credential-encryption.port';
import type { ValidateMcpIntegrationUseCase } from '../validate-mcp-integration/validate-mcp-integration.use-case';
import { ConnectionValidationService } from '../../services/connection-validation.service';
import { McpConfigService } from '../../services/mcp-config.service';
import { McpOAuthClientConfigurationService } from '../../services/mcp-oauth-client-configuration.service';
import { McpAuthMethod } from 'src/domain/mcp/domain/value-objects/mcp-auth-method.enum';
import { McpIntegrationKind } from 'src/domain/mcp/domain/value-objects/mcp-integration-kind.enum';
import { PredefinedMcpIntegrationSlug } from 'src/domain/mcp/domain/value-objects/predefined-mcp-integration-slug.enum';
import type { McpIntegration } from 'src/domain/mcp/domain/mcp-integration.entity';
import { PredefinedMcpIntegration } from 'src/domain/mcp/domain/integrations/predefined-mcp-integration.entity';
import { CustomMcpIntegration } from 'src/domain/mcp/domain/integrations/custom-mcp-integration.entity';
import { NoAuthMcpIntegrationAuth } from 'src/domain/mcp/domain/auth/no-auth-mcp-integration-auth.entity';
import { BearerMcpIntegrationAuth } from 'src/domain/mcp/domain/auth/bearer-mcp-integration-auth.entity';
import { CustomHeaderMcpIntegrationAuth } from 'src/domain/mcp/domain/auth/custom-header-mcp-integration-auth.entity';
import type {
  CredentialFieldValue,
  PredefinedMcpIntegrationConfig,
} from 'src/domain/mcp/domain/predefined-mcp-integration-config';
import { CredentialFieldType } from 'src/domain/mcp/domain/predefined-mcp-integration-config';
import {
  DuplicateMcpIntegrationError,
  InvalidPredefinedSlugError,
  InvalidServerUrlError,
  McpMissingRequiredConfigError,
} from '../../mcp.errors';

describe('CreateMcpIntegrationUseCase', () => {
  let useCase: CreateMcpIntegrationUseCase;
  let repository: jest.Mocked<McpIntegrationsRepositoryPort>;
  let registry: jest.Mocked<PredefinedMcpIntegrationRegistry>;
  let context: jest.Mocked<ContextService>;
  let factory: McpIntegrationFactory;
  let authFactory: McpIntegrationAuthFactory;
  let encryption: jest.Mocked<McpCredentialEncryptionPort>;
  let validateUseCase: jest.Mocked<ValidateMcpIntegrationUseCase>;
  let connectionValidationService: ConnectionValidationService;
  let oauthClientConfiguration: {
    validate: jest.Mock;
    initialize: jest.Mock;
  };
  let factorySpy: jest.SpyInstance;
  let authSpy: jest.SpyInstance;
  let savedIntegrations: McpIntegration[];

  const orgId = randomUUID();

  const buildConfig = (
    overrides: Partial<PredefinedMcpIntegrationConfig> = {},
  ) => ({
    slug: overrides.slug ?? PredefinedMcpIntegrationSlug.LOCABOO,
    displayName: overrides.displayName ?? 'Locaboo 4',
    description:
      overrides.description ?? 'Connect to Locaboo 4 booking system data',
    serverUrl: overrides.serverUrl ?? 'https://api.locaboo.example.com/mcp',
    authType: overrides.authType ?? McpAuthMethod.BEARER_TOKEN,
    authHeaderName: overrides.authHeaderName ?? 'Authorization',
    credentialFields: overrides.credentialFields,
  });

  beforeEach(async () => {
    savedIntegrations = [];
    repository = {
      save: jest.fn(async (integration) => {
        savedIntegrations.push(integration as McpIntegration);
        return integration;
      }),
      findById: jest.fn(),
      findAll: jest.fn(),
      findByOrgIdAndSlug: jest.fn(),
      findByOrgIdAndMarketplaceIdentifier: jest.fn(),
      delete: jest.fn(),
    } as any;

    registry = {
      isValidSlug: jest.fn(),
      getConfig: jest.fn(),
      getAllConfigs: jest.fn(),
      getServerUrl: jest.fn(),
    } as any;

    context = {
      get: jest.fn(),
    } as any;

    factory = new McpIntegrationFactory();
    factorySpy = jest.spyOn(factory, 'createIntegration');

    authFactory = new McpIntegrationAuthFactory();
    authSpy = jest
      .spyOn(authFactory, 'createAuth')
      .mockImplementation((params: any): any => {
        // Mock implementation that returns appropriate auth objects
        switch (params.method) {
          case McpAuthMethod.NO_AUTH:
            return new NoAuthMcpIntegrationAuth();
          case McpAuthMethod.BEARER_TOKEN:
            return new BearerMcpIntegrationAuth({
              authToken: params.authToken || 'mock-token',
            });
          case McpAuthMethod.CUSTOM_HEADER:
            return new CustomHeaderMcpIntegrationAuth({
              secret: params.secret,
              headerName: params.headerName,
            });
          default:
            throw new Error(`Unhandled auth method in mock: ${params.method}`);
        }
      });

    encryption = {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
    };

    validateUseCase = {
      execute: jest.fn().mockResolvedValue({ isValid: true }),
    } as any;

    connectionValidationService = new ConnectionValidationService(
      validateUseCase,
      repository,
    );

    oauthClientConfiguration = {
      validate: jest.fn(),
      initialize: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateMcpIntegrationUseCase,
        { provide: McpIntegrationsRepositoryPort, useValue: repository },
        { provide: PredefinedMcpIntegrationRegistry, useValue: registry },
        { provide: ContextService, useValue: context },
        { provide: McpIntegrationFactory, useValue: factory },
        { provide: McpIntegrationAuthFactory, useValue: authFactory },
        { provide: McpCredentialEncryptionPort, useValue: encryption },
        {
          provide: McpConfigService,
          useValue: new McpConfigService(encryption),
        },
        {
          provide: ConnectionValidationService,
          useValue: connectionValidationService,
        },
        {
          provide: McpOAuthClientConfigurationService,
          useValue: oauthClientConfiguration,
        },

        {
          provide: getLoggerToken(CreateMcpIntegrationUseCase.name),
          useValue: createPinoLoggerMock(),
        },
      ],
    }).compile();

    useCase = module.get(CreateMcpIntegrationUseCase);
  });

  describe('predefined integrations', () => {
    it('creates bearer token integration with credential fields', async () => {
      const command = new CreatePredefinedMcpIntegrationCommand(
        PredefinedMcpIntegrationSlug.LOCABOO,
        [
          {
            name: CredentialFieldType.TOKEN,
            value: 'plaintext-token',
          } satisfies CredentialFieldValue,
        ],
      );

      const config = buildConfig({
        credentialFields: [
          {
            label: 'API Token',
            type: CredentialFieldType.TOKEN,
            required: true,
          },
        ],
      });

      context.get.mockReturnValue(orgId);
      registry.isValidSlug.mockReturnValue(true);
      registry.getConfig.mockReturnValue(config);
      repository.findByOrgIdAndSlug.mockResolvedValue(null);
      encryption.encrypt.mockResolvedValue('encrypted-token');

      const result = await useCase.execute(command);

      expect(encryption.encrypt).toHaveBeenCalledWith('plaintext-token');
      expect(authSpy).toHaveBeenCalledWith({
        method: McpAuthMethod.BEARER_TOKEN,
        authToken: 'encrypted-token',
      });
      expect(factorySpy).toHaveBeenCalledWith({
        kind: McpIntegrationKind.PREDEFINED,
        orgId,
        name: config.displayName,
        serverUrl: config.serverUrl,
        slug: config.slug,
        auth: expect.any(BearerMcpIntegrationAuth),
      });
      expect(repository.save).toHaveBeenCalledTimes(2);
      expect(result).toBeInstanceOf(PredefinedMcpIntegration);
      expect(result.slug).toBe(config.slug);
      expect(result.getAuthType()).toBe(McpAuthMethod.BEARER_TOKEN);
      expect(savedIntegrations[0]).toBeInstanceOf(PredefinedMcpIntegration);
    });

    it('throws when slug is invalid', async () => {
      const command = new CreatePredefinedMcpIntegrationCommand(
        PredefinedMcpIntegrationSlug.TEST,
        [],
      );
      context.get.mockReturnValue(orgId);
      registry.isValidSlug.mockReturnValue(false);

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        InvalidPredefinedSlugError,
      );
    });

    it('prevents duplicate integrations for same slug', async () => {
      const command = new CreatePredefinedMcpIntegrationCommand(
        PredefinedMcpIntegrationSlug.LOCABOO,
        [],
      );

      context.get.mockReturnValue(orgId);
      registry.isValidSlug.mockReturnValue(true);
      registry.getConfig.mockReturnValue(buildConfig());
      repository.findByOrgIdAndSlug.mockResolvedValue(
        new PredefinedMcpIntegration({
          orgId,
          name: 'Existing',
          slug: PredefinedMcpIntegrationSlug.LOCABOO,
          serverUrl: 'https://api.locaboo.example.com/mcp',
          auth: new NoAuthMcpIntegrationAuth(),
        }),
      );

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        DuplicateMcpIntegrationError,
      );
    });
  });

  describe('custom integrations', () => {
    it('creates a custom integration with schema-configured credentials', async () => {
      const configSchema = {
        authType: 'CUSTOM',
        orgFields: [
          {
            key: 'tenantId',
            label: 'Tenant ID',
            type: 'text' as const,
            headerName: 'X-Tenant-ID',
            required: true,
          },
          {
            key: 'apiToken',
            label: 'API token',
            type: 'secret' as const,
            headerName: 'Authorization',
            prefix: 'Bearer ',
            required: true,
          },
        ],
        userFields: [],
      };
      const command = new CreateCustomMcpIntegrationCommand(
        'Council Records',
        'https://example.com/mcp',
        configSchema,
        { tenantId: 'council-42', apiToken: 'plaintext-token' },
      );

      context.get.mockReturnValue(orgId);
      encryption.encrypt.mockResolvedValue('encrypted-token');

      const result = await useCase.execute(command);

      expect(encryption.encrypt).toHaveBeenCalledWith('plaintext-token');
      expect(authSpy).toHaveBeenCalledWith({
        method: McpAuthMethod.NO_AUTH,
      });
      expect(factorySpy).toHaveBeenCalledWith({
        kind: McpIntegrationKind.CUSTOM,
        orgId,
        name: command.name,
        serverUrl: command.serverUrl,
        auth: expect.any(NoAuthMcpIntegrationAuth),
        configSchema,
        orgConfigValues: {
          tenantId: 'council-42',
          apiToken: 'encrypted-token',
        },
      });
      expect(result).toBeInstanceOf(CustomMcpIntegration);
      expect(result.getAuthType()).toBe(McpAuthMethod.NO_AUTH);
    });

    it('rejects missing required organization config values', async () => {
      const command = new CreateCustomMcpIntegrationCommand(
        'Custom',
        'https://example.com/mcp',
        {
          authType: 'CUSTOM',
          orgFields: [
            {
              key: 'apiToken',
              label: 'API token',
              type: 'secret',
              headerName: 'Authorization',
              required: true,
            },
          ],
          userFields: [],
        },
        {},
      );

      context.get.mockReturnValue(orgId);

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        McpMissingRequiredConfigError,
      );
    });

    it('rejects invalid server URLs', async () => {
      const command = new CreateCustomMcpIntegrationCommand(
        'Custom',
        'not-a-valid-url',
        { authType: 'CUSTOM', orgFields: [], userFields: [] },
        {},
      );

      context.get.mockReturnValue(orgId);

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        InvalidServerUrlError,
      );
    });

    it('removes an OAuth integration when client initialization fails', async () => {
      const command = new CreateCustomMcpIntegrationCommand(
        'OAuth server',
        'https://example.com/mcp',
        {
          authType: 'OAUTH',
          orgFields: [],
          userFields: [],
          oauth: { clientRegistration: 'static' },
        },
        {},
        false,
        { clientId: 'static-client' },
      );
      context.get.mockReturnValue(orgId);
      oauthClientConfiguration.initialize.mockRejectedValue(
        new Error('encryption failed'),
      );

      await expect(useCase.execute(command)).rejects.toThrow();

      expect(repository.delete).toHaveBeenCalledWith(savedIntegrations[0].id);
    });
  });

  it('throws UnauthorizedException when context lacks orgId', async () => {
    const command = new CreateCustomMcpIntegrationCommand(
      'Custom',
      'https://example.com/mcp',
      { authType: 'CUSTOM', orgFields: [], userFields: [] },
      {},
    );

    context.get.mockReturnValue(undefined);

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
