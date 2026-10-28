import { randomUUID } from 'crypto';
import { McpOAuthClientConfigurationService } from './mcp-oauth-client-configuration.service';
import type { McpCredentialEncryptionPort } from '../ports/mcp-credential-encryption.port';
import type { McpOAuthClientRegistrationRepositoryPort } from '../ports/mcp-oauth-client-registration.repository.port';
import type { McpOAuthPendingSessionRepositoryPort } from '../ports/mcp-oauth-pending-session.repository.port';
import type { McpOAuthUserTokenRepositoryPort } from '../ports/mcp-oauth-user-token.repository.port';
import { aCustomMcpIntegration } from '../testing/mcp-integration.fixtures';
import { McpValidationFailedError } from '../mcp.errors';

describe('McpOAuthClientConfigurationService', () => {
  const encryption = {
    encrypt: jest.fn(),
    decrypt: jest.fn(),
  } as jest.Mocked<McpCredentialEncryptionPort>;
  const registrations = {
    findByIntegrationAndIssuer: jest.fn(),
    findUnboundByIntegration: jest.fn(),
    hasStaticRegistration: jest.fn(),
    save: jest.fn(),
    bindUnboundToIssuer: jest.fn(),
    deleteByIntegration: jest.fn(),
    deleteByIntegrationExcept: jest.fn(),
  } as jest.Mocked<McpOAuthClientRegistrationRepositoryPort>;
  const tokens = {
    findByIntegrationAndUser: jest.fn(),
    save: jest.fn(),
    withLockedToken: jest.fn(),
    delete: jest.fn(),
    deleteByIntegration: jest.fn(),
  } as jest.Mocked<McpOAuthUserTokenRepositoryPort>;
  const pendingSessions = {
    save: jest.fn(),
    consumeByStateHash: jest.fn(),
    deleteByIntegration: jest.fn(),
  } as jest.Mocked<McpOAuthPendingSessionRepositoryPort>;
  const capabilityCache = { invalidate: jest.fn() };
  const mcpClient = { invalidateConnections: jest.fn() };
  const service = new McpOAuthClientConfigurationService(
    encryption,
    registrations,
    tokens,
    pendingSessions,
    capabilityCache as never,
    mcpClient as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    encryption.encrypt.mockResolvedValue('encrypted-client-secret');
    registrations.save.mockImplementation(async (registration) => registration);
  });

  it('stores an unbound encrypted static client and clears old grants', async () => {
    const integration = aCustomMcpIntegration({
      id: randomUUID(),
      configSchema: {
        authType: 'OAUTH',
        orgFields: [],
        userFields: [],
        oauth: { clientRegistration: 'static' },
      },
    });

    await service.initialize(integration, {
      clientId: 'council-documents-client',
      clientSecret: 'plain-client-secret',
    });

    expect(encryption.encrypt).toHaveBeenCalledWith('plain-client-secret');
    expect(registrations.save).toHaveBeenCalledWith(
      expect.objectContaining({
        integrationId: integration.id,
        issuer: null,
        clientId: 'council-documents-client',
        encryptedClientSecret: 'encrypted-client-secret',
      }),
    );
    expect(tokens.deleteByIntegration).toHaveBeenCalledWith(integration.id);
    expect(pendingSessions.deleteByIntegration).toHaveBeenCalledWith(
      integration.id,
    );
    expect(registrations.deleteByIntegrationExcept).toHaveBeenCalledWith(
      integration.id,
      expect.any(String),
    );
    expect(registrations.save.mock.invocationCallOrder[0]).toBeLessThan(
      tokens.deleteByIntegration.mock.invocationCallOrder[0],
    );
    expect(mcpClient.invalidateConnections).toHaveBeenCalledWith(integration);
    expect(
      mcpClient.invalidateConnections.mock.invocationCallOrder[0],
    ).toBeLessThan(tokens.deleteByIntegration.mock.invocationCallOrder[0]);
  });

  it('requires client information for static registration', async () => {
    const integration = aCustomMcpIntegration({
      configSchema: {
        authType: 'OAUTH',
        orgFields: [],
        userFields: [],
        oauth: { clientRegistration: 'static' },
      },
    });

    await expect(service.initialize(integration)).rejects.toBeInstanceOf(
      McpValidationFailedError,
    );
  });

  it('preserves existing authorization when replacement persistence fails', async () => {
    const integration = aCustomMcpIntegration({
      id: randomUUID(),
      configSchema: {
        authType: 'OAUTH',
        orgFields: [],
        userFields: [],
        oauth: { clientRegistration: 'static' },
      },
    });
    registrations.save.mockRejectedValueOnce(new Error('database unavailable'));

    await expect(
      service.initialize(integration, { clientId: 'replacement-client' }),
    ).rejects.toThrow('database unavailable');

    expect(pendingSessions.deleteByIntegration).not.toHaveBeenCalled();
    expect(tokens.deleteByIntegration).not.toHaveBeenCalled();
    expect(registrations.deleteByIntegration).not.toHaveBeenCalled();
    expect(registrations.deleteByIntegrationExcept).not.toHaveBeenCalled();
  });

  it('rejects static credentials for automatic registration', async () => {
    const integration = aCustomMcpIntegration({
      configSchema: {
        authType: 'OAUTH',
        orgFields: [],
        userFields: [],
        oauth: { clientRegistration: 'automatic' },
      },
    });

    await expect(
      service.initialize(integration, { clientId: 'unexpected-client' }),
    ).rejects.toBeInstanceOf(McpValidationFailedError);
  });

  it('reports whether a static client registration is persisted', async () => {
    const integration = aCustomMcpIntegration({
      configSchema: {
        authType: 'OAUTH',
        orgFields: [],
        userFields: [],
        oauth: { clientRegistration: 'static' },
      },
    });
    registrations.hasStaticRegistration.mockResolvedValue(false);

    await expect(service.isStaticClientConfigured(integration)).resolves.toBe(
      false,
    );
    expect(registrations.hasStaticRegistration).toHaveBeenCalledWith(
      integration.id,
    );
  });
});
