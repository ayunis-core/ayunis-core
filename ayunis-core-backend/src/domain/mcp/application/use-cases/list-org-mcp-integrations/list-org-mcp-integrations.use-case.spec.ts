/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { ListOrgMcpIntegrationsUseCase } from './list-org-mcp-integrations.use-case';
import { ListOrgMcpIntegrationsQuery } from './list-org-mcp-integrations.query';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import { UnexpectedMcpError } from '../../mcp.errors';
import {
  McpIntegration,
  PredefinedMcpIntegration,
  CustomMcpIntegration,
} from '../../../domain/mcp-integration.entity';
import { PredefinedMcpIntegrationSlug } from '../../../domain/predefined-mcp-integration-slug.enum';
import { UUID, randomUUID } from 'crypto';

describe('ListOrgMcpIntegrationsUseCase', () => {
  let useCase: ListOrgMcpIntegrationsUseCase;
  let repository: jest.Mocked<McpIntegrationsRepositoryPort>;
  let contextService: jest.Mocked<ContextService>;
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  const mockOrgId = randomUUID();
  const mockIntegrationId1 = randomUUID();
  const mockIntegrationId2 = randomUUID();

  beforeEach(async () => {
    const mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByIds: jest.fn(),
      findByOrganizationId: jest.fn(),
      findByOrganizationIdAndEnabled: jest.fn(),
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
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return list of integrations for organization', async () => {
      // Arrange
      const now = new Date();
      const mockIntegrations: McpIntegration[] = [
        new PredefinedMcpIntegration(
          mockIntegrationId1,
          'Test MCP 1',
          mockOrgId,
          PredefinedMcpIntegrationSlug.TEST,
          true,
          undefined,
          undefined,
          undefined,
          now,
          now,
        ),
        new CustomMcpIntegration(
          mockIntegrationId2,
          'Custom MCP',
          mockOrgId,
          'http://localhost:3101/mcp',
          true,
          undefined,
          undefined,
          undefined,
          now,
          now,
        ),
      ];

      jest
        .spyOn(repository, 'findByOrganizationId')
        .mockResolvedValue(mockIntegrations);

      const query = new ListOrgMcpIntegrationsQuery();

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(result).toEqual(mockIntegrations);
      expect(repository.findByOrganizationId).toHaveBeenCalledTimes(1);
      expect(repository.findByOrganizationId).toHaveBeenCalledWith(mockOrgId);
      expect(contextService.get).toHaveBeenCalledWith('orgId');
      expect(loggerLogSpy).toHaveBeenCalledWith('listOrgMcpIntegrations');
    });

    it('should return empty array when organization has no integrations', async () => {
      // Arrange
      jest.spyOn(repository, 'findByOrganizationId').mockResolvedValue([]);

      const query = new ListOrgMcpIntegrationsQuery();

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(result).toEqual([]);
      expect(repository.findByOrganizationId).toHaveBeenCalledTimes(1);
      expect(repository.findByOrganizationId).toHaveBeenCalledWith(mockOrgId);
      expect(contextService.get).toHaveBeenCalledWith('orgId');
      expect(loggerLogSpy).toHaveBeenCalledWith('listOrgMcpIntegrations');
    });

    it('should throw UnauthorizedException when user not authenticated', async () => {
      // Arrange
      jest.spyOn(contextService, 'get').mockReturnValue(undefined);

      const query = new ListOrgMcpIntegrationsQuery();

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(useCase.execute(query)).rejects.toThrow(
        'User not authenticated',
      );
      expect(repository.findByOrganizationId).not.toHaveBeenCalled();
    });

    it('should use organizationId from ContextService (not from query)', async () => {
      // Arrange
      jest.spyOn(repository, 'findByOrganizationId').mockResolvedValue([]);

      const query = new ListOrgMcpIntegrationsQuery();

      // Act
      await useCase.execute(query);

      // Assert
      expect(contextService.get).toHaveBeenCalledWith('orgId');
      expect(repository.findByOrganizationId).toHaveBeenCalledWith(mockOrgId);
    });

    it('should wrap unexpected errors in UnexpectedMcpError', async () => {
      // Arrange
      const unexpectedError = new Error('Database connection failed');
      jest
        .spyOn(repository, 'findByOrganizationId')
        .mockRejectedValue(unexpectedError);

      const query = new ListOrgMcpIntegrationsQuery();

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(UnexpectedMcpError);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Unexpected error listing integrations',
        { error: unexpectedError },
      );
    });

    it('should log operation start', async () => {
      // Arrange
      jest.spyOn(repository, 'findByOrganizationId').mockResolvedValue([]);

      const query = new ListOrgMcpIntegrationsQuery();

      // Act
      await useCase.execute(query);

      // Assert
      expect(loggerLogSpy).toHaveBeenCalledWith('listOrgMcpIntegrations');
    });
  });
});
