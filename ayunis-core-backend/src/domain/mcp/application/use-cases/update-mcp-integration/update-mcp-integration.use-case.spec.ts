import { UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UpdateMcpIntegrationUseCase } from './update-mcp-integration.use-case';
import { UpdateMcpIntegrationCommand } from './update-mcp-integration.command';
import type { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import type { ContextService } from 'src/common/context/services/context.service';
import type { McpCredentialEncryptionPort } from '../../ports/mcp-credential-encryption.port';
import { CustomMcpIntegration } from '../../../domain/integrations/custom-mcp-integration.entity';
import { BearerMcpIntegrationAuth } from '../../../domain/auth/bearer-mcp-integration-auth.entity';
import { CustomHeaderMcpIntegrationAuth } from '../../../domain/auth/custom-header-mcp-integration-auth.entity';

describe('UpdateMcpIntegrationUseCase', () => {
  const orgId = randomUUID();
  const integrationId = randomUUID();

  let repository: jest.Mocked<McpIntegrationsRepositoryPort>;
  let context: jest.Mocked<ContextService>;
  let encryption: jest.Mocked<McpCredentialEncryptionPort>;
  let useCase: UpdateMcpIntegrationUseCase;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      save: jest.fn(),
      findAll: jest.fn(),
      findByOrgIdAndSlug: jest.fn(),
      findByOrgIdAndMarketplaceIdentifier: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<McpIntegrationsRepositoryPort>;

    context = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ContextService>;

    encryption = {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
    } as unknown as jest.Mocked<McpCredentialEncryptionPort>;

    useCase = new UpdateMcpIntegrationUseCase(repository, context, encryption);
    context.get.mockReturnValue(orgId);
    repository.save.mockImplementation(async (integration) => integration);
  });

  it('updates name and rotates bearer token credentials', async () => {
    const auth = new BearerMcpIntegrationAuth({ authToken: 'encrypted-old' });
    const integration = new CustomMcpIntegration({
      id: integrationId,
      orgId,
      name: 'Old Name',
      serverUrl: 'https://example.com/mcp',
      auth,
    });

    repository.findById.mockResolvedValue(integration);
    encryption.encrypt.mockResolvedValue('encrypted-new');

    const command = new UpdateMcpIntegrationCommand(
      integrationId,
      'New Name',
      'new-token',
    );

    const result = await useCase.execute(command);

    expect(encryption.encrypt).toHaveBeenCalledWith('new-token');
    expect(result.name).toBe('New Name');
    expect((result.auth as BearerMcpIntegrationAuth).authToken).toBe(
      'encrypted-new',
    );
    expect(repository.save).toHaveBeenCalledWith(integration);
  });

  it('updates custom header name without encrypting when only header changes', async () => {
    const auth = new CustomHeaderMcpIntegrationAuth({
      secret: 'encrypted-existing',
      headerName: 'X-OLD',
    });
    const integration = new CustomMcpIntegration({
      id: integrationId,
      orgId,
      name: 'With Header',
      serverUrl: 'https://example.com/mcp',
      auth,
    });

    repository.findById.mockResolvedValue(integration);

    const command = new UpdateMcpIntegrationCommand(
      integrationId,
      undefined,
      undefined,
      'X-NEW-KEY',
    );

    const result = await useCase.execute(command);

    expect(encryption.encrypt).not.toHaveBeenCalled();
    expect(
      (result.auth as CustomHeaderMcpIntegrationAuth).getAuthHeaderName(),
    ).toBe('X-NEW-KEY');
    expect(repository.save).toHaveBeenCalledWith(integration);
  });

  it('throws when user is not authenticated', async () => {
    context.get.mockReturnValueOnce(undefined);

    await expect(
      useCase.execute(new UpdateMcpIntegrationCommand(integrationId)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
