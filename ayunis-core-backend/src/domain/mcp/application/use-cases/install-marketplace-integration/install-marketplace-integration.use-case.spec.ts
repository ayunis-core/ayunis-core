import { InstallMarketplaceIntegrationUseCase } from './install-marketplace-integration.use-case';
import { InstallMarketplaceIntegrationCommand } from './install-marketplace-integration.command';
import { MarketplaceClient } from 'src/domain/marketplace/application/ports/marketplace-client.port';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { McpCredentialEncryptionPort } from '../../ports/mcp-credential-encryption.port';
import { McpIntegrationFactory } from '../../factories/mcp-integration.factory';
import { McpIntegrationAuthFactory } from '../../factories/mcp-integration-auth.factory';
import { ValidateMcpIntegrationUseCase } from '../validate-mcp-integration/validate-mcp-integration.use-case';
import { ContextService } from 'src/common/context/services/context.service';
import { MarketplaceMcpIntegration } from '../../../domain/integrations/marketplace-mcp-integration.entity';
import { NoAuthMcpIntegrationAuth } from '../../../domain/auth/no-auth-mcp-integration-auth.entity';
import { McpIntegrationKind } from '../../../domain/value-objects/mcp-integration-kind.enum';
import {
  McpOAuthNotSupportedError,
  McpMissingRequiredConfigError,
  McpMarketplaceIntegrationNotFoundError,
} from '../../mcp.errors';
import { IntegrationResponseDto } from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas';
import { UUID } from 'crypto';

describe('InstallMarketplaceIntegrationUseCase', () => {
  let useCase: InstallMarketplaceIntegrationUseCase;
  let marketplaceClient: jest.Mocked<MarketplaceClient>;
  let repository: jest.Mocked<McpIntegrationsRepositoryPort>;
  let credentialEncryption: jest.Mocked<McpCredentialEncryptionPort>;
  let factory: McpIntegrationFactory;
  let authFactory: McpIntegrationAuthFactory;
  let validateUseCase: jest.Mocked<ValidateMcpIntegrationUseCase>;
  let contextService: jest.Mocked<ContextService>;

  const orgId = '660e8400-e29b-41d4-a716-446655440001' as UUID;

  const oparlMarketplaceResponse: IntegrationResponseDto = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    identifier: 'oparl-council-data',
    name: 'OParl Council Data',
    description: 'Access municipal council data via OParl',
    iconUrl: 'https://marketplace.ayunis.de/icons/oparl.png',
    serverUrl: 'https://mcp.ayunis.de/oparl',
    configSchema: {
      authType: 'NO_AUTH',
      orgFields: [
        {
          key: 'oparlEndpointUrl',
          type: 'url' as const,
          label: 'OParl Endpoint URL',
          headerName: 'X-Oparl-Endpoint-Url',
          prefix: null,
          required: true,
          help: "Your municipality's OParl endpoint",
          value: null,
        },
      ],
      userFields: [],
    },
    published: true,
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-02-10T14:30:00.000Z',
  };

  const bearerWithFixedValueResponse: IntegrationResponseDto = {
    ...oparlMarketplaceResponse,
    identifier: 'fixed-auth-integration',
    name: 'Fixed Auth Integration',
    serverUrl: 'https://mcp.ayunis.de/fixed',
    configSchema: {
      authType: 'BEARER_TOKEN',
      orgFields: [
        {
          key: 'authToken',
          type: 'secret' as const,
          label: 'API Token',
          headerName: 'Authorization',
          prefix: 'Bearer ',
          required: true,
          help: null,
          value: 'sk-fixed-token-we-control',
        },
      ],
      userFields: [],
    },
  };

  const oauthIntegrationResponse: IntegrationResponseDto = {
    ...oparlMarketplaceResponse,
    identifier: 'oauth-integration',
    name: 'OAuth Integration',
    configSchema: {
      authType: 'OAUTH',
      orgFields: [
        {
          key: 'clientId',
          type: 'text' as const,
          label: 'Client ID',
          headerName: null,
          prefix: null,
          required: true,
          help: null,
          value: null,
        },
      ],
      userFields: [],
    },
  };

  beforeEach(() => {
    marketplaceClient = {
      getSkillByIdentifier: jest.fn(),
      getIntegrationByIdentifier: jest.fn(),
    } as jest.Mocked<MarketplaceClient>;

    repository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByIds: jest.fn(),
      findAll: jest.fn(),
      findByOrgIdAndSlug: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<McpIntegrationsRepositoryPort>;

    credentialEncryption = {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
    } as jest.Mocked<McpCredentialEncryptionPort>;

    factory = new McpIntegrationFactory();
    authFactory = new McpIntegrationAuthFactory();

    validateUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ValidateMcpIntegrationUseCase>;

    contextService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ContextService>;

    contextService.get.mockReturnValue(orgId);

    repository.save.mockImplementation(async (integration) => integration);
    credentialEncryption.encrypt.mockImplementation(
      async (plaintext) => `encrypted:${plaintext}`,
    );
    validateUseCase.execute.mockResolvedValue({
      isValid: true,
      toolCount: 3,
      resourceCount: 0,
      promptCount: 0,
    });

    useCase = new InstallMarketplaceIntegrationUseCase(
      marketplaceClient,
      repository,
      credentialEncryption,
      factory,
      authFactory,
      validateUseCase,
      contextService,
    );
  });

  it('should install an integration with org config values', async () => {
    marketplaceClient.getIntegrationByIdentifier.mockResolvedValue(
      oparlMarketplaceResponse,
    );

    const result = await useCase.execute(
      new InstallMarketplaceIntegrationCommand('oparl-council-data', {
        oparlEndpointUrl: 'https://rim.ekom21.de/oparl/v1',
      }),
    );

    expect(result).toBeInstanceOf(MarketplaceMcpIntegration);
    expect(result.marketplaceIdentifier).toBe('oparl-council-data');
    expect(result.name).toBe('OParl Council Data');
    expect(result.serverUrl).toBe('https://mcp.ayunis.de/oparl');
    expect(result.orgConfigValues).toEqual({
      oparlEndpointUrl: 'https://rim.ekom21.de/oparl/v1',
    });
    expect(result.kind).toBe(McpIntegrationKind.MARKETPLACE);
    expect(repository.save).toHaveBeenCalledTimes(2); // initial save + after validation
  });

  it('should merge fixed values from config schema', async () => {
    marketplaceClient.getIntegrationByIdentifier.mockResolvedValue(
      bearerWithFixedValueResponse,
    );

    const result = await useCase.execute(
      new InstallMarketplaceIntegrationCommand('fixed-auth-integration', {}),
    );

    expect(result.orgConfigValues).toEqual({
      authToken: 'encrypted:sk-fixed-token-we-control',
    });
    expect(credentialEncryption.encrypt).toHaveBeenCalledWith(
      'sk-fixed-token-we-control',
    );
  });

  it('should encrypt secret-type field values', async () => {
    const integrationWithSecret: IntegrationResponseDto = {
      ...oparlMarketplaceResponse,
      identifier: 'secret-integration',
      configSchema: {
        authType: 'BEARER_TOKEN',
        orgFields: [
          {
            key: 'apiToken',
            type: 'secret' as const,
            label: 'API Token',
            headerName: 'Authorization',
            prefix: 'Bearer ',
            required: true,
            help: null,
            value: null,
          },
        ],
        userFields: [],
      },
    };
    marketplaceClient.getIntegrationByIdentifier.mockResolvedValue(
      integrationWithSecret,
    );

    const result = await useCase.execute(
      new InstallMarketplaceIntegrationCommand('secret-integration', {
        apiToken: 'my-secret-token',
      }),
    );

    expect(result.orgConfigValues).toEqual({
      apiToken: 'encrypted:my-secret-token',
    });
  });

  it('should not encrypt non-secret field values', async () => {
    marketplaceClient.getIntegrationByIdentifier.mockResolvedValue(
      oparlMarketplaceResponse,
    );

    const result = await useCase.execute(
      new InstallMarketplaceIntegrationCommand('oparl-council-data', {
        oparlEndpointUrl: 'https://rim.ekom21.de/oparl/v1',
      }),
    );

    expect(result.orgConfigValues).toEqual({
      oparlEndpointUrl: 'https://rim.ekom21.de/oparl/v1',
    });
    expect(credentialEncryption.encrypt).not.toHaveBeenCalled();
  });

  it('should reject OAUTH auth type', async () => {
    marketplaceClient.getIntegrationByIdentifier.mockResolvedValue(
      oauthIntegrationResponse,
    );

    await expect(
      useCase.execute(
        new InstallMarketplaceIntegrationCommand('oauth-integration', {
          clientId: 'my-client',
        }),
      ),
    ).rejects.toThrow(McpOAuthNotSupportedError);
  });

  it('should throw when required org fields are missing', async () => {
    marketplaceClient.getIntegrationByIdentifier.mockResolvedValue(
      oparlMarketplaceResponse,
    );

    await expect(
      useCase.execute(
        new InstallMarketplaceIntegrationCommand('oparl-council-data', {}),
      ),
    ).rejects.toThrow(McpMissingRequiredConfigError);
  });

  it('should throw when marketplace integration is not found', async () => {
    marketplaceClient.getIntegrationByIdentifier.mockResolvedValue(null);

    await expect(
      useCase.execute(
        new InstallMarketplaceIntegrationCommand('nonexistent', {}),
      ),
    ).rejects.toThrow(McpMarketplaceIntegrationNotFoundError);
  });

  it('should validate connection after saving and update status', async () => {
    marketplaceClient.getIntegrationByIdentifier.mockResolvedValue(
      oparlMarketplaceResponse,
    );
    validateUseCase.execute.mockResolvedValue({
      isValid: false,
      errorMessage: 'Connection refused',
    });

    const result = await useCase.execute(
      new InstallMarketplaceIntegrationCommand('oparl-council-data', {
        oparlEndpointUrl: 'https://rim.ekom21.de/oparl/v1',
      }),
    );

    expect(validateUseCase.execute).toHaveBeenCalled();
    // Integration still returned even if validation fails
    expect(result).toBeInstanceOf(MarketplaceMcpIntegration);
  });

  it('should set returnsPii when provided', async () => {
    marketplaceClient.getIntegrationByIdentifier.mockResolvedValue(
      oparlMarketplaceResponse,
    );

    const result = await useCase.execute(
      new InstallMarketplaceIntegrationCommand(
        'oparl-council-data',
        { oparlEndpointUrl: 'https://rim.ekom21.de/oparl/v1' },
        true,
      ),
    );

    expect(result.returnsPii).toBe(true);
  });

  it('should use NoAuth for the auth entity since auth is handled via config headers', async () => {
    marketplaceClient.getIntegrationByIdentifier.mockResolvedValue(
      oparlMarketplaceResponse,
    );

    const result = await useCase.execute(
      new InstallMarketplaceIntegrationCommand('oparl-council-data', {
        oparlEndpointUrl: 'https://rim.ekom21.de/oparl/v1',
      }),
    );

    expect(result.auth).toBeInstanceOf(NoAuthMcpIntegrationAuth);
  });

  it('should fixed values take precedence over user-provided values', async () => {
    marketplaceClient.getIntegrationByIdentifier.mockResolvedValue(
      bearerWithFixedValueResponse,
    );

    const result = await useCase.execute(
      new InstallMarketplaceIntegrationCommand('fixed-auth-integration', {
        authToken: 'user-attempted-override',
      }),
    );

    // Fixed value from marketplace should win
    expect(result.orgConfigValues).toEqual({
      authToken: 'encrypted:sk-fixed-token-we-control',
    });
  });
});
