import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { CreateShareUseCase } from './create-share.use-case';
import { CreateOrgAgentShareCommand } from './create-share.command';
import { ContextService } from 'src/common/context/services/context.service';
import { SharesRepository } from '../../ports/shares-repository.port';
import { ShareAuthorizationFactory } from '../../factories/share-authorization.factory';
import { ShareAuthorizationStrategy } from '../../ports/share-authorization-strategy.port';
import { SharedEntityType } from '../../../domain/value-objects/shared-entity-type.enum';
import { AgentShare } from '../../../domain/share.entity';
import { OrgShareScope } from '../../../domain/share-scope.entity';
import { randomUUID } from 'crypto';

describe('CreateShareUseCase', () => {
  let useCase: CreateShareUseCase;
  let contextService: ContextService;
  let repository: SharesRepository;
  let authorizationFactory: ShareAuthorizationFactory;
  let authorizationStrategy: ShareAuthorizationStrategy;

  const mockUserId = randomUUID();
  const mockOrgId = randomUUID();
  const mockAgentId = randomUUID();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateShareUseCase,
        {
          provide: ContextService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: SharesRepository,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: ShareAuthorizationFactory,
          useValue: {
            getStrategy: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get<CreateShareUseCase>(CreateShareUseCase);
    contextService = module.get<ContextService>(ContextService);
    repository = module.get<SharesRepository>(SharesRepository);
    authorizationFactory = module.get<ShareAuthorizationFactory>(
      ShareAuthorizationFactory,
    );

    // Create mock authorization strategy
    authorizationStrategy = {
      canViewShares: jest.fn(),
      canCreateShare: jest.fn(),
      canDeleteShare: jest.fn(),
    };
  });

  describe('execute', () => {
    it('should create an org-scoped share when user owns the agent', async () => {
      // Arrange
      const command = new CreateOrgAgentShareCommand(mockAgentId);

      (contextService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'userId') return mockUserId;
        if (key === 'orgId') return mockOrgId;
        return null;
      });

      (authorizationFactory.getStrategy as jest.Mock).mockReturnValue(
        authorizationStrategy,
      );
      (authorizationStrategy.canCreateShare as jest.Mock).mockResolvedValue(
        true,
      );
      (repository.create as jest.Mock).mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(authorizationFactory.getStrategy).toHaveBeenCalledWith(
        SharedEntityType.AGENT,
      );
      expect(authorizationStrategy.canCreateShare).toHaveBeenCalledWith(
        mockAgentId,
        mockUserId,
      );
      expect(repository.create).toHaveBeenCalledWith(expect.any(AgentShare));

      const createdShare = (repository.create as jest.Mock).mock.calls[0][0];
      expect(createdShare).toBeInstanceOf(AgentShare);
      expect(createdShare.agentId).toBe(mockAgentId);
      expect(createdShare.ownerId).toBe(mockUserId);
      expect(createdShare.scope).toBeInstanceOf(OrgShareScope);

      expect(result).toBeInstanceOf(AgentShare);
      expect((result as AgentShare).agentId).toBe(mockAgentId);
      expect(result.ownerId).toBe(mockUserId);
    });

    it('should throw UnauthorizedException when user is not authenticated', async () => {
      // Arrange
      const command = new CreateOrgAgentShareCommand(mockAgentId);

      (contextService.get as jest.Mock).mockReturnValue(null);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(useCase.execute(command)).rejects.toThrow(
        'User not authenticated',
      );
    });

    it('should throw UnauthorizedException when org is not found', async () => {
      // Arrange
      const command = new CreateOrgAgentShareCommand(mockAgentId);

      (contextService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'userId') return mockUserId;
        if (key === 'orgId') return null;
        return null;
      });

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(useCase.execute(command)).rejects.toThrow(
        'User organization not found',
      );
    });

    it('should throw ForbiddenException when user cannot create share for the agent', async () => {
      // Arrange
      const command = new CreateOrgAgentShareCommand(mockAgentId);

      (contextService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'userId') return mockUserId;
        if (key === 'orgId') return mockOrgId;
        return null;
      });

      (authorizationFactory.getStrategy as jest.Mock).mockReturnValue(
        authorizationStrategy,
      );
      (authorizationStrategy.canCreateShare as jest.Mock).mockResolvedValue(
        false,
      );

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(useCase.execute(command)).rejects.toThrow(
        'User cannot create share for this agent',
      );
    });

    it('should throw Error for unsupported command type', async () => {
      // Arrange
      const unsupportedCommand = {} as any; // Not an instance of CreateOrgAgentShareCommand

      (contextService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'userId') return mockUserId;
        if (key === 'orgId') return mockOrgId;
        return null;
      });

      // Act & Assert
      await expect(useCase.execute(unsupportedCommand)).rejects.toThrow(
        'Unsupported share command type',
      );
    });

    it('should handle repository errors', async () => {
      // Arrange
      const command = new CreateOrgAgentShareCommand(mockAgentId);
      const repositoryError = new Error('Database connection failed');

      (contextService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'userId') return mockUserId;
        if (key === 'orgId') return mockOrgId;
        return null;
      });

      (authorizationFactory.getStrategy as jest.Mock).mockReturnValue(
        authorizationStrategy,
      );
      (authorizationStrategy.canCreateShare as jest.Mock).mockResolvedValue(
        true,
      );
      (repository.create as jest.Mock).mockRejectedValue(repositoryError);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(repositoryError);
    });
  });
});
