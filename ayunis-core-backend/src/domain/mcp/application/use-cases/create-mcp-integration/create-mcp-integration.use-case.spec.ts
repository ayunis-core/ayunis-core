import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { CreateMcpIntegrationUseCase } from './create-mcp-integration.use-case';
import { CreatePredefinedMcpIntegrationCommand } from './create-predefined-mcp-integration.command';
import { CreateCustomMcpIntegrationCommand } from './create-custom-mcp-integration.command';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { PredefinedMcpIntegrationRegistry } from '../../registries/predefined-mcp-integration-registry.service';
import { ContextService } from 'src/common/context/services/context.service';
import { McpIntegrationFactory } from '../../factories/mcp-integration.factory';
import { McpCredentialEncryptionPort } from '../../ports/mcp-credential-encryption.port';
import { ValidateMcpIntegrationUseCase } from '../validate-mcp-integration/validate-mcp-integration.use-case';
import { McpAuthMethod } from '../../../domain/value-objects/mcp-auth-method.enum';
import { PredefinedMcpIntegrationSlug } from '../../../domain/value-objects/predefined-mcp-integration-slug.enum';
import { PredefinedMcpIntegration } from '../../../domain/integrations/predefined-mcp-integration.entity';
import { CustomMcpIntegration } from '../../../domain/integrations/custom-mcp-integration.entity';
import { BearerMcpIntegrationAuth } from '../../../domain/auth/bearer-mcp-integration-auth.entity';
import { CustomHeaderMcpIntegrationAuth } from '../../../domain/auth/custom-header-mcp-integration-auth.entity';
import { McpIntegrationKind } from '../../../domain/value-objects/mcp-integration-kind.enum';
import {
  DuplicateLocabooIntegrationError,
  InvalidPredefinedSlugError,
  InvalidServerUrlError,
  McpAuthNotImplementedError,
  McpValidationFailedError,
} from '../../mcp.errors';

describe('CreateMcpIntegrationUseCase', () => {
  let useCase: CreateMcpIntegrationUseCase;
  let repository: jest.Mocked<McpIntegrationsRepositoryPort>;
  let registry: jest.Mocked<PredefinedMcpIntegrationRegistry>;
  let context: jest.Mocked<ContextService>;
  let factory: jest.Mocked<McpIntegrationFactory>;
  let encryption: jest.Mocked<McpCredentialEncryptionPort>;
  let validateUseCase: jest.Mocked<ValidateMcpIntegrationUseCase>;

  const orgId = 'org-123';
  const integrationId = 'integration-123';

  beforeEach(async () => {
    repository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findByOrgIdAndSlug: jest.fn(),
      delete: jest.fn(),
    } as any;

    registry = {
      isValidSlug: jest.fn(),
      getConfig: jest.fn(),
      getServerUrl: jest.fn(),
    } as any;

    context = {
      get: jest.fn(),
    } as any;

    factory = {
      createIntegration: jest.fn(),
    } as any;

    encryption = {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
    } as any;

    validateUseCase = {
      execute: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateMcpIntegrationUseCase,
        { provide: McpIntegrationsRepositoryPort, useValue: repository },
        { provide: PredefinedMcpIntegrationRegistry, useValue: registry },
        { provide: ContextService, useValue: context },
        { provide: McpIntegrationFactory, useValue: factory },
        { provide: McpCredentialEncryptionPort, useValue: encryption },
        { provide: ValidateMcpIntegrationUseCase, useValue: validateUseCase },
      ],
    }).compile();

    useCase = module.get(CreateMcpIntegrationUseCase);
  });

  describe('predefined integrations', () => {
    it('creates bearer token integration with encrypted credentials', async () => {
      const command = new CreatePredefinedMcpIntegrationCommand(
        'Locaboo',
        PredefinedMcpIntegrationSlug.LOCABOO,
        McpAuthMethod.BEARER_TOKEN,
        'Authorization',
        'plaintext-token',
      );

      context.get.mockReturnValue(orgId);
      registry.isValidSlug.mockReturnValue(true);
      registry.getConfig.mockReturnValue({
        slug: PredefinedMcpIntegrationSlug.LOCABOO,
        displayName: 'Locaboo',
        authType: McpAuthMethod.BEARER_TOKEN,
        authHeaderName: 'Authorization',
      });
      registry.getServerUrl.mockReturnValue('https://locaboo.com/mcp');
      repository.findByOrgIdAndSlug.mockResolvedValue(null);
      encryption.encrypt.mockResolvedValue('encrypted-token');

      const auth = new BearerMcpIntegrationAuth({
        authToken: 'encrypted-token',
      });
      const integration = new PredefinedMcpIntegration({
        id: integrationId,
        name: command.name,
        orgId,
        slug: command.slug,
        serverUrl: 'https://locaboo.com/mcp',
        auth,
      });

      factory.createIntegration.mockReturnValue(integration);
      repository.save.mockResolvedValue(integration);
      validateUseCase.execute.mockResolvedValue({ isValid: true });

      const result = await useCase.execute(command);

      expect(encryption.encrypt).toHaveBeenCalledWith('plaintext-token');
      expect(factory.createIntegration).toHaveBeenCalledWith({
        kind: McpIntegrationKind.PREDEFINED,
        orgId,
        name: command.name,
        serverUrl: 'https://locaboo.com/mcp',
        slug: command.slug,
        auth: expect.any(BearerMcpIntegrationAuth),
      });
      expect(repository.save).toHaveBeenCalledWith(integration);
      expect(result).toBe(integration);
    });

    it('throws when slug is invalid', async () => {
      const command = new CreatePredefinedMcpIntegrationCommand(
        'Invalid',
        PredefinedMcpIntegrationSlug.TEST,
      );
      context.get.mockReturnValue(orgId);
      registry.isValidSlug.mockReturnValue(false);

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        InvalidPredefinedSlugError,
      );
    });

    it('prevents duplicate locaboo integrations', async () => {
      const command = new CreatePredefinedMcpIntegrationCommand(
        'Locaboo',
        PredefinedMcpIntegrationSlug.LOCABOO,
        McpAuthMethod.NO_AUTH,
      );

      context.get.mockReturnValue(orgId);
      registry.isValidSlug.mockReturnValue(true);
      registry.getConfig.mockReturnValue({
        slug: PredefinedMcpIntegrationSlug.LOCABOO,
        displayName: 'Locaboo',
        authType: McpAuthMethod.NO_AUTH,
      });
      registry.getServerUrl.mockReturnValue('https://locaboo.com/mcp');
      repository.findByOrgIdAndSlug.mockResolvedValue({} as any);

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        DuplicateLocabooIntegrationError,
      );
    });
  });

  describe('custom integrations', () => {
    it('creates custom integration with custom header auth', async () => {
      const command = new CreateCustomMcpIntegrationCommand(
        'Custom',
        'https://example.com/mcp',
        McpAuthMethod.CUSTOM_HEADER,
        'X-API-Key',
        'plaintext-secret',
      );

      context.get.mockReturnValue(orgId);
      encryption.encrypt.mockResolvedValue('encrypted-secret');

      const auth = new CustomHeaderMcpIntegrationAuth({
        secret: 'encrypted-secret',
        headerName: 'X-API-Key',
      });
      const integration = new CustomMcpIntegration({
        id: integrationId,
        name: command.name,
        orgId,
        serverUrl: command.serverUrl,
        auth,
      });

      factory.createIntegration.mockReturnValue(integration);
      repository.save.mockResolvedValue(integration);
      validateUseCase.execute.mockResolvedValue({ isValid: true });

      const result = await useCase.execute(command);

      expect(encryption.encrypt).toHaveBeenCalledWith('plaintext-secret');
      expect(factory.createIntegration).toHaveBeenCalledWith({
        kind: McpIntegrationKind.CUSTOM,
        orgId,
        name: command.name,
        serverUrl: command.serverUrl,
        auth: expect.any(CustomHeaderMcpIntegrationAuth),
      });
      expect(result).toBe(integration);
    });

    it('rejects missing credentials for custom header auth', async () => {
      const command = new CreateCustomMcpIntegrationCommand(
        'Custom',
        'https://example.com/mcp',
        McpAuthMethod.CUSTOM_HEADER,
      );

      context.get.mockReturnValue(orgId);

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        McpValidationFailedError,
      );
    });

    it('rejects invalid URLs', async () => {
      const command = new CreateCustomMcpIntegrationCommand(
        'Invalid',
        'not-a-url',
      );
      context.get.mockReturnValue(orgId);

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        InvalidServerUrlError,
      );
    });
  });

  it('throws when user is unauthenticated', async () => {
    context.get.mockReturnValue(undefined);
    const command = new CreateCustomMcpIntegrationCommand(
      'Custom',
      'https://example.com/mcp',
    );

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('throws for unsupported oauth auth type', async () => {
    context.get.mockReturnValue(orgId);
    const command = new CreateCustomMcpIntegrationCommand(
      'Custom',
      'https://example.com/mcp',
      McpAuthMethod.OAUTH,
    );

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      McpAuthNotImplementedError,
    );
  });
});
