import { randomUUID } from 'crypto';
import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { UpdateMcpIntegrationUseCase } from './update-mcp-integration.use-case';
import { UpdateMcpIntegrationCommand } from './update-mcp-integration.command';
import type { McpIntegrationsRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integrations.repository.port';
import type { McpIntegrationUserConfigRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integration-user-config.repository.port';
import type { ContextService } from 'src/common/context/services/context.service';
import type { McpCredentialEncryptionPort } from 'src/domain/mcp/application/ports/mcp-credential-encryption.port';
import { McpConfigService } from 'src/domain/mcp/application/services/mcp-config.service';
import { ConnectionValidationService } from 'src/domain/mcp/application/services/connection-validation.service';
import { McpCapabilityCacheService } from 'src/domain/mcp/application/services/mcp-capability-cache.service';
import type { McpClientService } from 'src/domain/mcp/application/services/mcp-client.service';
import type { McpOAuthClientConfigurationService } from 'src/domain/mcp/application/services/mcp-oauth-client-configuration.service';
import type { ValidateMcpIntegrationUseCase } from 'src/domain/mcp/application/use-cases/validate-mcp-integration/validate-mcp-integration.use-case';
import { aCustomMcpIntegration } from 'src/domain/mcp/application/testing/mcp-integration.fixtures';
import { MarketplaceMcpIntegration } from 'src/domain/mcp/domain/integrations/marketplace-mcp-integration.entity';
import { NoAuthMcpIntegrationAuth } from 'src/domain/mcp/domain/auth/no-auth-mcp-integration-auth.entity';
import {
  InvalidServerUrlError,
  McpValidationFailedError,
} from 'src/domain/mcp/application/mcp.errors';
import type { IntegrationConfigSchema } from 'src/domain/mcp/domain/value-objects/integration-config-schema';

describe('UpdateMcpIntegrationUseCase — server URL', () => {
  const orgId = randomUUID();
  const integrationId = randomUUID();
  const oldUrl = 'https://projekte.stadt.de/mcp';
  const newUrl = 'https://neu.stadt.de/mcp';

  const noAuthSchema: IntegrationConfigSchema = {
    authType: 'NO_AUTH',
    orgFields: [],
    userFields: [],
  };
  const staticOAuthSchema: IntegrationConfigSchema = {
    authType: 'OAUTH',
    orgFields: [],
    userFields: [],
    oauth: { clientRegistration: 'static', scopes: ['mcp'] },
  };
  const automaticOAuthSchema: IntegrationConfigSchema = {
    authType: 'OAUTH',
    orgFields: [],
    userFields: [],
    oauth: { clientRegistration: 'automatic' },
  };

  let repository: jest.Mocked<McpIntegrationsRepositoryPort>;
  let validateUseCase: jest.Mocked<ValidateMcpIntegrationUseCase>;
  let oauthClientConfiguration: jest.Mocked<
    Pick<
      McpOAuthClientConfigurationService,
      'validate' | 'initialize' | 'resetAuthorization'
    >
  >;
  let useCase: UpdateMcpIntegrationUseCase;

  function marketplaceIntegration(
    overrides: Partial<
      ConstructorParameters<typeof MarketplaceMcpIntegration>[0]
    > = {},
  ): MarketplaceMcpIntegration {
    return new MarketplaceMcpIntegration({
      id: integrationId,
      orgId,
      name: 'OpenProject',
      serverUrl: oldUrl,
      marketplaceIdentifier: 'openproject',
      configSchema: noAuthSchema,
      orgConfigValues: {},
      auth: new NoAuthMcpIntegrationAuth(),
      customerProvidesServerUrl: true,
      ...overrides,
    });
  }

  function update(
    params: Omit<
      ConstructorParameters<typeof UpdateMcpIntegrationCommand>[0],
      'integrationId'
    >,
  ) {
    return useCase.execute(
      new UpdateMcpIntegrationCommand({ integrationId, ...params }),
    );
  }

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      save: jest.fn().mockImplementation(async (integration) => integration),
    } as unknown as jest.Mocked<McpIntegrationsRepositoryPort>;
    validateUseCase = {
      execute: jest.fn().mockResolvedValue({
        isValid: true,
        toolCount: 1,
        resourceCount: 0,
        promptCount: 0,
      }),
    } as unknown as jest.Mocked<ValidateMcpIntegrationUseCase>;
    oauthClientConfiguration = {
      validate: jest.fn(),
      initialize: jest.fn(),
      resetAuthorization: jest.fn(),
    };
    const encryption: jest.Mocked<McpCredentialEncryptionPort> = {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
    };

    useCase = new UpdateMcpIntegrationUseCase(
      repository,
      {
        removeKeysByIntegrationId: jest.fn(),
      } as unknown as McpIntegrationUserConfigRepositoryPort,
      { get: jest.fn().mockReturnValue(orgId) } as unknown as ContextService,
      encryption,
      new McpConfigService(encryption),
      new ConnectionValidationService(validateUseCase, repository),
      new McpCapabilityCacheService(),
      oauthClientConfiguration as unknown as McpOAuthClientConfigurationService,
      { invalidateConnections: jest.fn() } as unknown as McpClientService,
      {
        withTransaction: (run: () => Promise<unknown>) => run(),
      } as unknown as TransactionHost<TransactionalAdapterTypeOrm>,
    );
  });

  it('changes the URL of a customer-provided marketplace integration and revalidates', async () => {
    repository.findById.mockResolvedValue(marketplaceIntegration());

    const result = await update({ serverUrl: newUrl });

    expect(result.serverUrl).toBe(newUrl);
    expect(validateUseCase.execute).toHaveBeenCalledWith({ integrationId });
    expect(oauthClientConfiguration.resetAuthorization).not.toHaveBeenCalled();
  });

  it('rejects changing a URL fixed by the marketplace', async () => {
    const integration = marketplaceIntegration({
      customerProvidesServerUrl: false,
    });
    repository.findById.mockResolvedValue(integration);

    await expect(update({ serverUrl: newUrl })).rejects.toThrow();
    expect(integration.serverUrl).toBe(oldUrl);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects URLs that are not http or https', async () => {
    repository.findById.mockResolvedValue(marketplaceIntegration());

    await expect(update({ serverUrl: 'file:///etc/mcp' })).rejects.toThrow(
      InvalidServerUrlError,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  describe('with static OAuth', () => {
    it('requires a new client when the URL changes, leaving everything unchanged', async () => {
      const integration = marketplaceIntegration({
        configSchema: staticOAuthSchema,
      });
      repository.findById.mockResolvedValue(integration);

      await expect(update({ serverUrl: newUrl })).rejects.toThrow(
        McpValidationFailedError,
      );
      expect(integration.serverUrl).toBe(oldUrl);
      expect(repository.save).not.toHaveBeenCalled();
      expect(oauthClientConfiguration.initialize).not.toHaveBeenCalled();
      expect(
        oauthClientConfiguration.resetAuthorization,
      ).not.toHaveBeenCalled();
    });

    it('replaces the client, which signs out every user, when the URL changes', async () => {
      const integration = marketplaceIntegration({
        configSchema: staticOAuthSchema,
      });
      repository.findById.mockResolvedValue(integration);
      const oauthClient = { clientId: 'new-client', clientSecret: 'secret' };

      const result = await update({ serverUrl: newUrl, oauthClient });

      expect(result.serverUrl).toBe(newUrl);
      expect(oauthClientConfiguration.initialize).toHaveBeenCalledWith(
        integration,
        oauthClient,
      );
      expect(validateUseCase.execute).not.toHaveBeenCalled();
    });

    it('keeps the old URL when replacing the client fails', async () => {
      const integration = marketplaceIntegration({
        configSchema: staticOAuthSchema,
      });
      repository.findById.mockResolvedValue(integration);
      oauthClientConfiguration.initialize.mockRejectedValue(
        new Error('encryption unavailable'),
      );

      await expect(
        update({ serverUrl: newUrl, oauthClient: { clientId: 'new-client' } }),
      ).rejects.toThrow();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('does not require a new client when the submitted URL is unchanged', async () => {
      repository.findById.mockResolvedValue(
        marketplaceIntegration({ configSchema: staticOAuthSchema }),
      );

      await update({ serverUrl: oldUrl, name: 'OpenProject Stadt' });

      expect(oauthClientConfiguration.initialize).not.toHaveBeenCalled();
      expect(
        oauthClientConfiguration.resetAuthorization,
      ).not.toHaveBeenCalled();
    });

    it('applies the same rule to custom integrations', async () => {
      repository.findById.mockResolvedValue(
        aCustomMcpIntegration({
          id: integrationId,
          orgId,
          serverUrl: oldUrl,
          configSchema: staticOAuthSchema,
        }),
      );

      await expect(update({ serverUrl: newUrl })).rejects.toThrow(
        McpValidationFailedError,
      );
    });
  });

  describe('with automatic OAuth', () => {
    it('signs out every user when the URL changes', async () => {
      const integration = marketplaceIntegration({
        configSchema: automaticOAuthSchema,
      });
      repository.findById.mockResolvedValue(integration);

      await update({ serverUrl: newUrl });

      expect(oauthClientConfiguration.resetAuthorization).toHaveBeenCalledWith(
        integration,
      );
      expect(validateUseCase.execute).not.toHaveBeenCalled();
    });

    it('keeps the old URL when signing users out fails, so a retry resets again', async () => {
      const integration = marketplaceIntegration({
        configSchema: automaticOAuthSchema,
      });
      repository.findById.mockResolvedValue(integration);
      oauthClientConfiguration.resetAuthorization.mockRejectedValueOnce(
        new Error('database unavailable'),
      );

      await expect(update({ serverUrl: newUrl })).rejects.toThrow();
      expect(repository.save).not.toHaveBeenCalled();
      expect(integration.serverUrl).toBe(oldUrl);

      await update({ serverUrl: newUrl });

      expect(oauthClientConfiguration.resetAuthorization).toHaveBeenCalledTimes(
        2,
      );
      expect(integration.serverUrl).toBe(newUrl);
    });

    it('keeps user authorizations when the URL is unchanged', async () => {
      repository.findById.mockResolvedValue(
        marketplaceIntegration({ configSchema: automaticOAuthSchema }),
      );

      await update({ serverUrl: oldUrl });

      expect(
        oauthClientConfiguration.resetAuthorization,
      ).not.toHaveBeenCalled();
    });
  });
});
