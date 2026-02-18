import { Test, TestingModule } from '@nestjs/testing';
import { AgentShareAuthorizationStrategy } from './agent-share-authorization.strategy';
import { AgentRepository } from '../ports/agent.repository';
import { Agent } from '../../domain/agent.entity';
import { randomUUID } from 'crypto';

describe('AgentShareAuthorizationStrategy', () => {
  let strategy: AgentShareAuthorizationStrategy;
  let agentRepository: jest.Mocked<AgentRepository>;

  beforeEach(async () => {
    const mockAgentRepository = {
      create: jest.fn(),
      delete: jest.fn(),
      findOne: jest.fn(),
      findMany: jest.fn(),
      findAllByOwner: jest.fn(),
      findAllByModel: jest.fn(),
      update: jest.fn(),
      updateModel: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentShareAuthorizationStrategy,
        {
          provide: AgentRepository,
          useValue: mockAgentRepository,
        },
      ],
    }).compile();

    strategy = module.get<AgentShareAuthorizationStrategy>(
      AgentShareAuthorizationStrategy,
    );
    agentRepository = module.get(AgentRepository);
  });

  describe('canViewShares', () => {
    it('should return true when user owns the agent', async () => {
      // Arrange
      const agentId = randomUUID();
      const userId = randomUUID();
      const mockAgent = {
        id: agentId,
        userId,
        name: 'Test Agent',
      } as Agent;

      agentRepository.findOne.mockResolvedValue(mockAgent);

      // Act
      const result = await strategy.canViewShares(agentId, userId);

      // Assert
      expect(result).toBe(true);
      expect(agentRepository.findOne).toHaveBeenCalledWith(agentId, userId);
    });

    it('should return false when agent does not exist', async () => {
      // Arrange
      const agentId = randomUUID();
      const userId = randomUUID();

      agentRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await strategy.canViewShares(agentId, userId);

      // Assert
      expect(result).toBe(false);
      expect(agentRepository.findOne).toHaveBeenCalledWith(agentId, userId);
    });

    it('should return false when user does not own the agent', async () => {
      // Arrange
      const agentId = randomUUID();
      const userId = randomUUID();

      // Repository returns null when user doesn't own the agent
      agentRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await strategy.canViewShares(agentId, userId);

      // Assert
      expect(result).toBe(false);
      expect(agentRepository.findOne).toHaveBeenCalledWith(agentId, userId);
    });
  });

  describe('canCreateShare', () => {
    it('should return true when user owns the agent', async () => {
      // Arrange
      const agentId = randomUUID();
      const userId = randomUUID();
      const mockAgent = {
        id: agentId,
        userId,
        name: 'Test Agent',
      } as Agent;

      agentRepository.findOne.mockResolvedValue(mockAgent);

      // Act
      const result = await strategy.canCreateShare(agentId, userId);

      // Assert
      expect(result).toBe(true);
      expect(agentRepository.findOne).toHaveBeenCalledWith(agentId, userId);
    });

    it('should return false when agent does not exist', async () => {
      // Arrange
      const agentId = randomUUID();
      const userId = randomUUID();

      agentRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await strategy.canCreateShare(agentId, userId);

      // Assert
      expect(result).toBe(false);
      expect(agentRepository.findOne).toHaveBeenCalledWith(agentId, userId);
    });

    it('should return false when user does not own the agent', async () => {
      // Arrange
      const agentId = randomUUID();
      const userId = randomUUID();

      agentRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await strategy.canCreateShare(agentId, userId);

      // Assert
      expect(result).toBe(false);
      expect(agentRepository.findOne).toHaveBeenCalledWith(agentId, userId);
    });
  });

  describe('canDeleteShare', () => {
    it('should always return true', async () => {
      // Arrange
      const shareId = randomUUID();
      const userId = randomUUID();

      // Act
      const result = await strategy.canDeleteShare(shareId, userId);

      // Assert
      expect(result).toBe(true);
      // Repository should not be called for delete authorization
      expect(agentRepository.findOne).not.toHaveBeenCalled();
    });

    it('should return true regardless of user or share', async () => {
      // Arrange
      const shareId1 = randomUUID();
      const shareId2 = randomUUID();
      const userId1 = randomUUID();
      const userId2 = randomUUID();

      // Act
      const result1 = await strategy.canDeleteShare(shareId1, userId1);
      const result2 = await strategy.canDeleteShare(shareId2, userId2);

      // Assert
      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(agentRepository.findOne).not.toHaveBeenCalled();
    });
  });
});
