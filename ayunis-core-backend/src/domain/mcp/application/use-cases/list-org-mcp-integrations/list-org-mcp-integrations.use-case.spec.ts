import {
  createLoggerMock,
  type LoggerMock,
} from 'src/common/testing/logger.mock';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ListOrgMcpIntegrationsUseCase } from './list-org-mcp-integrations.use-case';
import { McpIntegrationsRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integrations.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import { UnexpectedMcpError } from 'src/domain/mcp/application/mcp.errors';
import type { McpIntegration } from 'src/domain/mcp/domain/mcp-integration.entity';
import { PredefinedMcpIntegration } from 'src/domain/mcp/domain/integrations/predefined-mcp-integration.entity';
import { aCustomMcpIntegration } from 'src/domain/mcp/application/testing/mcp-integration.fixtures';
import { PredefinedMcpIntegrationSlug } from 'src/domain/mcp/domain/value-objects/predefined-mcp-integration-slug.enum';
import { randomUUID } from 'crypto';
import { NoAuthMcpIntegrationAuth } from 'src/domain/mcp/domain/auth/no-auth-mcp-integration-auth.entity';

describe('ListOrgMcpIntegrationsUseCase', () => {
  let logger: LoggerMock;
  let useCase: ListOrgMcpIntegrationsUseCase;
  let repository: jest.Mocked<McpIntegrationsRepositoryPort>;
  let contextService: jest.Mocked<ContextService>;

  const mockOrgId = randomUUID();
  const mockIntegrationId1 = randomUUID();
  const mockIntegrationId2 = randomUUID();

  beforeAll(async () => {
    logger = createLoggerMock();
    const mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findByOrgIdAndSlug: jest.fn(),
      findByOrgIdAndMarketplaceIdentifier: jest.fn(),
      delete: jest.fn(),
    };

    const mockContextService = {
      get: jest.fn((key: string) => {
        if (key === 'orgId') return mockOrgId;
        return undefined;
      }),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListOrgMcpIntegrationsUseCase,
        {
          provide: McpIntegrationsRepositoryPort,
          useValue: mockRepository,
        },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<ListOrgMcpIntegrationsUseCase>(
      ListOrgMcpIntegrationsUseCase,
    );
    repository = module.get(McpIntegrationsRepositoryPort);
    contextService = module.get(ContextService);

    // Spy on logger methods
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    (contextService.get as jest.Mock).mockImplementation((key?: string) => {
      if (key === 'orgId') return mockOrgId;
      return undefined;
    });
  });

  describe('execute', () => {
    it('should return list of integrations for organization', async () => {
      // Arrange
      const now = new Date();
      const mockIntegrations: McpIntegration[] = [
        new PredefinedMcpIntegration({
          id: mockIntegrationId1,
          name: 'Test MCP 1',
          orgId: mockOrgId,
          slug: PredefinedMcpIntegrationSlug.TEST,
          serverUrl: 'http://localhost:3100/mcp',
          auth: new NoAuthMcpIntegrationAuth(),
          enabled: true,
          createdAt: now,
          updatedAt: now,
        }),
        aCustomMcpIntegration({
          id: mockIntegrationId2,
          name: 'Custom MCP',
          orgId: mockOrgId,
          serverUrl: 'http://localhost:3101/mcp',
          auth: new NoAuthMcpIntegrationAuth(),
          enabled: true,
          createdAt: now,
          updatedAt: now,
        }),
      ];

      jest.spyOn(repository, 'findAll').mockResolvedValue(mockIntegrations);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result).toEqual(mockIntegrations);
      expect(repository.findAll).toHaveBeenCalledTimes(1);
      expect(repository.findAll).toHaveBeenCalledWith(mockOrgId);
      expect(contextService.get).toHaveBeenCalledWith('orgId');
      expect(logger.log).toHaveBeenCalledWith('listOrgMcpIntegrations');
    });

    it('should return empty array when organization has no integrations', async () => {
      // Arrange
      jest.spyOn(repository, 'findAll').mockResolvedValue([]);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result).toEqual([]);
      expect(repository.findAll).toHaveBeenCalledTimes(1);
      expect(repository.findAll).toHaveBeenCalledWith(mockOrgId);
      expect(contextService.get).toHaveBeenCalledWith('orgId');
      expect(logger.log).toHaveBeenCalledWith('listOrgMcpIntegrations');
    });

    it('should throw UnauthorizedException when user not authenticated', async () => {
      // Arrange
      jest.spyOn(contextService, 'get').mockReturnValue(undefined);

      // Act & Assert
      await expect(useCase.execute()).rejects.toThrow(UnauthorizedException);
      await expect(useCase.execute()).rejects.toThrow('User not authenticated');
      expect(repository.findAll).not.toHaveBeenCalled();
    });

    it('should use organizationId from ContextService (not from query)', async () => {
      // Arrange
      jest.spyOn(repository, 'findAll').mockResolvedValue([]);

      // Act
      await useCase.execute();

      // Assert
      expect(contextService.get).toHaveBeenCalledWith('orgId');
      expect(repository.findAll).toHaveBeenCalledWith(mockOrgId);
    });

    it('should wrap unexpected errors in UnexpectedMcpError', async () => {
      // Arrange
      const unexpectedError = new Error('Database connection failed');
      jest.spyOn(repository, 'findAll').mockRejectedValue(unexpectedError);

      // Act & Assert
      await expect(useCase.execute()).rejects.toThrow(UnexpectedMcpError);
      expect(logger.error).toHaveBeenCalledWith(
        { err: unexpectedError },
        'Unexpected error listing integrations',
      );
    });

    it('should log operation start', async () => {
      // Arrange
      jest.spyOn(repository, 'findAll').mockResolvedValue([]);

      // Act
      await useCase.execute();

      // Assert
      expect(logger.log).toHaveBeenCalledWith('listOrgMcpIntegrations');
    });
  });
});
