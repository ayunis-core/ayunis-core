import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { GetSharesUseCase } from './get-shares.use-case';
import { GetSharesQuery } from './get-shares.query';
import { SharesRepository } from '../../ports/shares-repository.port';
import { ShareAuthorizationFactory } from '../../factories/share-authorization.factory';
import { ShareAuthorizationStrategy } from '../../ports/share-authorization-strategy.port';
import { ContextService } from 'src/common/context/services/context.service';
import { AgentShare } from '../../../domain/share.entity';
import { SharedEntityType } from '../../../domain/value-objects/shared-entity-type.enum';
import { OrgShareScope } from '../../../domain/share-scope.entity';
import { randomUUID } from 'crypto';

describe('GetSharesUseCase', () => {
  let useCase: GetSharesUseCase;
  let sharesRepository: jest.Mocked<SharesRepository>;
  let authFactory: jest.Mocked<ShareAuthorizationFactory>;
  let authStrategy: jest.Mocked<ShareAuthorizationStrategy>;
  let contextService: jest.Mocked<ContextService>;

  beforeEach(async () => {
    const mockSharesRepository = {
      create: jest.fn(),
      delete: jest.fn(),
      findByEntityIdAndType: jest.fn(),
    };

    const mockAuthStrategy = {
      canViewShares: jest.fn(),
      canCreateShare: jest.fn(),
      canDeleteShare: jest.fn(),
    };

    const mockAuthFactory = {
      getStrategy: jest.fn().mockReturnValue(mockAuthStrategy),
    };

    const mockContextService = {
      get: jest.fn(),
      set: jest.fn(),
      run: jest.fn(),
      updateContext: jest.fn(),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetSharesUseCase,
        {
          provide: SharesRepository,
          useValue: mockSharesRepository,
        },
        {
          provide: ShareAuthorizationFactory,
          useValue: mockAuthFactory,
        },
        {
          provide: ContextService,
          useValue: mockContextService,
        },
      ],
    }).compile();

    useCase = module.get<GetSharesUseCase>(GetSharesUseCase);
    sharesRepository = module.get(SharesRepository);
    authFactory = module.get(ShareAuthorizationFactory);
    authStrategy = mockAuthStrategy;
    contextService = module.get(ContextService);
  });

  describe('execute', () => {
    it('should return shares when user has permission', async () => {
      // Arrange
      const userId = randomUUID();
      const entityId = randomUUID();
      const entityType = SharedEntityType.AGENT;
      const query = new GetSharesQuery(entityId, entityType);

      contextService.get.mockReturnValue(userId);
      authStrategy.canViewShares.mockResolvedValue(true);

      const mockScope = new OrgShareScope({
        id: randomUUID(),
        orgId: randomUUID(),
      });

      const mockShares: AgentShare[] = [
        new AgentShare({
          id: randomUUID(),
          agentId: entityId,
          scope: mockScope,
          ownerId: userId,
        }),
        new AgentShare({
          id: randomUUID(),
          agentId: entityId,
          scope: mockScope,
          ownerId: userId,
        }),
      ];

      sharesRepository.findByEntityIdAndType.mockResolvedValue(mockShares);

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(result).toEqual(mockShares);
      expect(contextService.get).toHaveBeenCalledWith('userId');
      expect(authFactory.getStrategy).toHaveBeenCalledWith(entityType);
      expect(authStrategy.canViewShares).toHaveBeenCalledWith(entityId, userId);
      expect(sharesRepository.findByEntityIdAndType).toHaveBeenCalledWith(
        entityId,
        entityType,
      );
    });

    it('should throw UnauthorizedException when user is not authenticated', async () => {
      // Arrange
      const entityId = randomUUID();
      const entityType = SharedEntityType.AGENT;
      const query = new GetSharesQuery(entityId, entityType);

      contextService.get.mockReturnValue(null);

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(contextService.get).toHaveBeenCalledWith('userId');
      expect(authFactory.getStrategy).not.toHaveBeenCalled();
      expect(sharesRepository.findByEntityIdAndType).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user cannot view shares', async () => {
      // Arrange
      const userId = randomUUID();
      const entityId = randomUUID();
      const entityType = SharedEntityType.AGENT;
      const query = new GetSharesQuery(entityId, entityType);

      contextService.get.mockReturnValue(userId);
      authStrategy.canViewShares.mockResolvedValue(false);

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(ForbiddenException);
      expect(contextService.get).toHaveBeenCalledWith('userId');
      expect(authFactory.getStrategy).toHaveBeenCalledWith(entityType);
      expect(authStrategy.canViewShares).toHaveBeenCalledWith(entityId, userId);
      expect(sharesRepository.findByEntityIdAndType).not.toHaveBeenCalled();
    });

    it('should return empty array when no shares exist', async () => {
      // Arrange
      const userId = randomUUID();
      const entityId = randomUUID();
      const entityType = SharedEntityType.AGENT;
      const query = new GetSharesQuery(entityId, entityType);

      contextService.get.mockReturnValue(userId);
      authStrategy.canViewShares.mockResolvedValue(true);
      sharesRepository.findByEntityIdAndType.mockResolvedValue([]);

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(result).toEqual([]);
      expect(sharesRepository.findByEntityIdAndType).toHaveBeenCalledWith(
        entityId,
        entityType,
      );
    });

    it('should use the correct authorization strategy for the entity type', async () => {
      // Arrange
      const userId = randomUUID();
      const entityId = randomUUID();
      const entityType = SharedEntityType.AGENT;
      const query = new GetSharesQuery(entityId, entityType);

      contextService.get.mockReturnValue(userId);
      authStrategy.canViewShares.mockResolvedValue(true);
      sharesRepository.findByEntityIdAndType.mockResolvedValue([]);

      // Act
      await useCase.execute(query);

      // Assert
      expect(authFactory.getStrategy).toHaveBeenCalledWith(
        SharedEntityType.AGENT,
      );
      expect(authFactory.getStrategy).toHaveBeenCalledTimes(1);
    });
  });
});
