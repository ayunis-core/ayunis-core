import { ConnectionValidationService } from './connection-validation.service';
import type { ValidateMcpIntegrationUseCase } from '../use-cases/validate-mcp-integration/validate-mcp-integration.use-case';
import type { McpIntegrationsRepositoryPort } from '../ports/mcp-integrations.repository.port';
import { CustomMcpIntegration } from '../../domain/integrations/custom-mcp-integration.entity';
import { NoAuthMcpIntegrationAuth } from '../../domain/auth/no-auth-mcp-integration-auth.entity';
import { randomUUID } from 'crypto';

describe('ConnectionValidationService', () => {
  const orgId = randomUUID();
  const integrationId = randomUUID();

  let validateUseCase: jest.Mocked<ValidateMcpIntegrationUseCase>;
  let repository: jest.Mocked<McpIntegrationsRepositoryPort>;
  let service: ConnectionValidationService;

  function createIntegration(): CustomMcpIntegration {
    return new CustomMcpIntegration({
      id: integrationId,
      orgId,
      name: 'Test Integration',
      serverUrl: 'https://example.com/mcp',
      auth: new NoAuthMcpIntegrationAuth(),
    });
  }

  beforeEach(() => {
    validateUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ValidateMcpIntegrationUseCase>;

    repository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findByOrgIdAndSlug: jest.fn(),
      findByOrgIdAndMarketplaceIdentifier: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<McpIntegrationsRepositoryPort>;

    repository.save.mockImplementation(async (integration) => integration);

    service = new ConnectionValidationService(validateUseCase, repository);
  });

  it('sets status to connected when validation succeeds', async () => {
    const integration = createIntegration();
    validateUseCase.execute.mockResolvedValue({
      isValid: true,
      toolCount: 3,
      resourceCount: 1,
      promptCount: 0,
    });

    await service.validateAndUpdateStatus(integration);

    expect(integration.connectionStatus).toBe('connected');
    expect(repository.save).toHaveBeenCalledWith(integration);
  });

  it('sets status to error when validation returns invalid', async () => {
    const integration = createIntegration();
    validateUseCase.execute.mockResolvedValue({
      isValid: false,
      toolCount: 0,
      resourceCount: 0,
      promptCount: 0,
      errorMessage: 'Auth failed',
    });

    await service.validateAndUpdateStatus(integration);

    expect(integration.connectionStatus).toBe('error');
    expect(integration.lastConnectionError).toBe('Auth failed');
    expect(repository.save).toHaveBeenCalledWith(integration);
  });

  it('sets status to error with default message when no errorMessage', async () => {
    const integration = createIntegration();
    validateUseCase.execute.mockResolvedValue({
      isValid: false,
      toolCount: 0,
      resourceCount: 0,
      promptCount: 0,
    });

    await service.validateAndUpdateStatus(integration);

    expect(integration.connectionStatus).toBe('error');
    expect(integration.lastConnectionError).toBe('Validation failed');
  });

  it('sets status to error when validation throws an error', async () => {
    const integration = createIntegration();
    validateUseCase.execute.mockRejectedValue(new Error('Connection refused'));

    await service.validateAndUpdateStatus(integration);

    expect(integration.connectionStatus).toBe('error');
    expect(integration.lastConnectionError).toBe(
      'Validation failed: Connection refused',
    );
    expect(repository.save).toHaveBeenCalledWith(integration);
  });

  it('handles non-Error exceptions gracefully', async () => {
    const integration = createIntegration();
    validateUseCase.execute.mockRejectedValue('string error');

    await service.validateAndUpdateStatus(integration);

    expect(integration.connectionStatus).toBe('error');
    expect(integration.lastConnectionError).toBe(
      'Validation failed: Unknown error',
    );
  });

  it('does not throw even when validation fails', async () => {
    const integration = createIntegration();
    validateUseCase.execute.mockRejectedValue(new Error('Connection refused'));

    await expect(
      service.validateAndUpdateStatus(integration),
    ).resolves.not.toThrow();
  });
});
