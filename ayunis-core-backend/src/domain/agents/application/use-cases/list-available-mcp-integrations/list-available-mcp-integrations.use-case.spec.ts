import { Test, TestingModule } from '@nestjs/testing';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { UUID } from 'crypto';
import { ListAvailableMcpIntegrationsUseCase } from './list-available-mcp-integrations.use-case';
import { ListAvailableMcpIntegrationsQuery } from './list-available-mcp-integrations.query';
import { McpIntegrationsRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integrations.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import {
  PredefinedMcpIntegration,
  CustomMcpIntegration,
} from 'src/domain/mcp/domain/mcp-integration.entity';
import { PredefinedMcpIntegrationSlug } from 'src/domain/mcp/domain/predefined-mcp-integration-slug.enum';
import { McpAuthMethod } from 'src/domain/mcp/domain/mcp-auth-method.enum';
import { UnexpectedAgentError } from '../../../application/agents.errors';

describe('ListAvailableMcpIntegrationsUseCase', () => {
  let useCase: ListAvailableMcpIntegrationsUseCase;
  let mcpIntegrationsRepository: jest.Mocked<McpIntegrationsRepositoryPort>;
  let contextService: jest.Mocked<ContextService>;

  const mockAgentId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockOrgId = '123e4567-e89b-12d3-a456-426614174001' as UUID;
  const mockIntegrationId1 = '123e4567-e89b-12d3-a456-426614174002' as UUID;
  const mockIntegrationId2 = '123e4567-e89b-12d3-a456-426614174003' as UUID;

  beforeEach(async () => {
    const mockMcpIntegrationsRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByIds: jest.fn(),
      findAll: jest.fn(),
      findByOrganizationId: jest.fn(),
      findByOrganizationIdAndEnabled: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<McpIntegrationsRepositoryPort>;

    const mockContextService = {
      get: jest.fn((key: string) => {
        if (key === 'orgId') return mockOrgId;
        return undefined;
      }),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListAvailableMcpIntegrationsUseCase,
        {
          provide: McpIntegrationsRepositoryPort,
          useValue: mockMcpIntegrationsRepository,
        },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<ListAvailableMcpIntegrationsUseCase>(
      ListAvailableMcpIntegrationsUseCase,
    );
    mcpIntegrationsRepository = module.get(McpIntegrationsRepositoryPort);
    contextService = module.get(ContextService);

    // Mock logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return array of enabled integrations for user organization', async () => {
      // Arrange
      const query = new ListAvailableMcpIntegrationsQuery(mockAgentId);
      const mockIntegration1 = new PredefinedMcpIntegration(
        mockIntegrationId1,
        'Test Integration',
        mockOrgId,
        PredefinedMcpIntegrationSlug.TEST,
        true,
      );
      const mockIntegration2 = new CustomMcpIntegration(
        mockIntegrationId2,
        'Custom Integration',
        mockOrgId,
        'http://localhost:3000',
        true,
        McpAuthMethod.BEARER_TOKEN,
        'Authorization',
      );
      const mockIntegrations = [mockIntegration1, mockIntegration2];

      mcpIntegrationsRepository.findByOrganizationIdAndEnabled.mockResolvedValue(
        mockIntegrations,
      );

      // Act
      const result = await useCase.execute(query);

      // Assert
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(contextService.get).toHaveBeenCalledWith('orgId');

      expect(
        mcpIntegrationsRepository.findByOrganizationIdAndEnabled,
      ).toHaveBeenCalledWith(mockOrgId);
      expect(result).toEqual(mockIntegrations);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when organization has no enabled integrations', async () => {
      // Arrange
      const query = new ListAvailableMcpIntegrationsQuery(mockAgentId);
      mcpIntegrationsRepository.findByOrganizationIdAndEnabled.mockResolvedValue(
        [],
      );

      // Act
      const result = await useCase.execute(query);

      // Assert
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(contextService.get).toHaveBeenCalledWith('orgId');

      expect(
        mcpIntegrationsRepository.findByOrganizationIdAndEnabled,
      ).toHaveBeenCalledWith(mockOrgId);
      expect(result).toEqual([]);
    });

    it('should throw UnauthorizedException when user not authenticated (no orgId)', async () => {
      // Arrange
      const query = new ListAvailableMcpIntegrationsQuery(mockAgentId);
      contextService.get.mockReturnValue(null); // No orgId in context

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(useCase.execute(query)).rejects.toThrow(
        'User not authenticated',
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(contextService.get).toHaveBeenCalledWith('orgId');

      expect(
        mcpIntegrationsRepository.findByOrganizationIdAndEnabled,
      ).not.toHaveBeenCalled();
    });

    it('should only return enabled integrations (repository handles filtering)', async () => {
      // Arrange
      const query = new ListAvailableMcpIntegrationsQuery(mockAgentId);
      const mockIntegration1 = new PredefinedMcpIntegration(
        mockIntegrationId1,
        'Test Integration',
        mockOrgId,
        PredefinedMcpIntegrationSlug.TEST,
        true, // enabled
      );
      const mockIntegration2 = new CustomMcpIntegration(
        mockIntegrationId2,
        'Custom Integration',
        mockOrgId,
        'http://localhost:3000',
        true, // enabled
      );

      // Repository returns only enabled integrations
      mcpIntegrationsRepository.findByOrganizationIdAndEnabled.mockResolvedValue(
        [mockIntegration1, mockIntegration2],
      );

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every((integration) => integration.enabled)).toBe(true);

      expect(
        mcpIntegrationsRepository.findByOrganizationIdAndEnabled,
      ).toHaveBeenCalledWith(mockOrgId);
    });

    it('should only return integrations belonging to user organization', async () => {
      // Arrange
      const query = new ListAvailableMcpIntegrationsQuery(mockAgentId);
      const mockIntegration1 = new PredefinedMcpIntegration(
        mockIntegrationId1,
        'Test Integration',
        mockOrgId,
        PredefinedMcpIntegrationSlug.TEST,
        true,
      );

      mcpIntegrationsRepository.findByOrganizationIdAndEnabled.mockResolvedValue(
        [mockIntegration1],
      );

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(
        result.every((integration) => integration.organizationId === mockOrgId),
      ).toBe(true);

      expect(
        mcpIntegrationsRepository.findByOrganizationIdAndEnabled,
      ).toHaveBeenCalledWith(mockOrgId);
    });

    it('should wrap unexpected errors in UnexpectedAgentError', async () => {
      // Arrange
      const query = new ListAvailableMcpIntegrationsQuery(mockAgentId);
      const unexpectedError = new Error('Database connection failed');
      mcpIntegrationsRepository.findByOrganizationIdAndEnabled.mockRejectedValue(
        unexpectedError,
      );

      const logSpy = jest.spyOn(Logger.prototype, 'error');

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(
        UnexpectedAgentError,
      );
      await expect(useCase.execute(query)).rejects.toThrow(
        'Unexpected error occurred',
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(contextService.get).toHaveBeenCalledWith('orgId');
      expect(logSpy).toHaveBeenCalledWith(
        'Unexpected error listing available MCP integrations',
        { error: unexpectedError },
      );
    });

    it('should rethrow UnauthorizedException without wrapping', async () => {
      // Arrange
      const query = new ListAvailableMcpIntegrationsQuery(mockAgentId);
      const authError = new UnauthorizedException('User not authenticated');
      mcpIntegrationsRepository.findByOrganizationIdAndEnabled.mockRejectedValue(
        authError,
      );

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(authError);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(contextService.get).toHaveBeenCalledWith('orgId');
    });

    it('should log the query execution', async () => {
      // Arrange
      const query = new ListAvailableMcpIntegrationsQuery(mockAgentId);
      mcpIntegrationsRepository.findByOrganizationIdAndEnabled.mockResolvedValue(
        [],
      );
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      // Act
      await useCase.execute(query);

      // Assert
      expect(logSpy).toHaveBeenCalledWith(
        'Listing available MCP integrations for organization',
      );
    });
  });
});
