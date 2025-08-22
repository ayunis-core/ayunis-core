import { Test, TestingModule } from '@nestjs/testing';
import { GetAgentUseCase } from './get-agent.use-case';
import { AgentRepository } from '../../ports/agent.repository';
import { GetAgentQuery } from './get-agent.query';
import { Agent } from '../../../domain/agent.entity';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { randomUUID } from 'crypto';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';

describe('FindAgentUseCase', () => {
  let useCase: GetAgentUseCase;
  let mockAgentRepository: Partial<AgentRepository>;

  beforeEach(async () => {
    mockAgentRepository = {
      create: jest.fn(),
      findOne: jest.fn(),
      findMany: jest.fn(),
      findAllByOwner: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAgentUseCase,
        { provide: AgentRepository, useValue: mockAgentRepository },
      ],
    }).compile();

    useCase = module.get<GetAgentUseCase>(GetAgentUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should find and return an agent successfully', async () => {
      // Arrange
      const agentId = randomUUID();
      const userId = randomUUID();
      const query = new GetAgentQuery({ id: agentId, userId });

      const mockModel = new PermittedLanguageModel({
        id: randomUUID(),
        orgId: randomUUID(),
        model: new LanguageModel({
          name: 'gpt-4',
          displayName: 'gpt-4',
          provider: ModelProvider.OPENAI,
          canStream: true,
          isReasoning: false,
          isArchived: false,
        }),
      });
      const expectedAgent = new Agent({
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        toolAssignments: [],
        userId,
      });

      jest
        .spyOn(mockAgentRepository, 'findOne')
        .mockResolvedValue(expectedAgent);

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(mockAgentRepository.findOne).toHaveBeenCalledWith(agentId, userId);
      expect(result).toBe(expectedAgent);
    });

    it('should throw when agent is not found', async () => {
      // Arrange
      const agentId = randomUUID();
      const userId = randomUUID();
      const query = new GetAgentQuery({ id: agentId, userId });

      jest.spyOn(mockAgentRepository, 'findOne').mockResolvedValue(null);

      // Act
      await expect(useCase.execute(query)).rejects.toThrow();
      expect(mockAgentRepository.findOne).toHaveBeenCalledWith(agentId, userId);
    });

    it('should throw when agent belongs to different user', async () => {
      // Arrange
      const agentId = randomUUID();
      const userId = randomUUID();
      const query = new GetAgentQuery({ id: agentId, userId });

      // Mock repository to return null (agent not found for this user)
      jest.spyOn(mockAgentRepository, 'findOne').mockResolvedValue(null);

      await expect(useCase.execute(query)).rejects.toThrow();
      expect(mockAgentRepository.findOne).toHaveBeenCalledWith(agentId, userId);
    });
  });
});
