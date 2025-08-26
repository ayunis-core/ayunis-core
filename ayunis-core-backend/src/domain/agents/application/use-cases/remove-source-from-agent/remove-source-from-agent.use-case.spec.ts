import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { RemoveSourceFromAgentUseCase } from './remove-source-from-agent.use-case';
import { RemoveSourceFromAgentCommand } from './remove-source-from-agent.command';
import { AgentRepository } from '../../ports/agent.repository';
import { Agent } from '../../../domain/agent.entity';
import { AgentSourceAssignment } from '../../../domain/agent-source-assignment.entity';
import { FileSource } from '../../../../sources/domain/sources/file-source.entity';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { AgentSourceNotFoundError } from '../../agents.errors';

describe('RemoveSourceFromAgentUseCase', () => {
  let useCase: RemoveSourceFromAgentUseCase;
  let agentRepository: jest.Mocked<AgentRepository>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as any;
  const mockOrgId = '123e4567-e89b-12d3-a456-426614174001' as any;
  const mockAgentId = '123e4567-e89b-12d3-a456-426614174002' as any;
  const mockSourceId = '123e4567-e89b-12d3-a456-426614174003' as any;
  const mockModelId = '123e4567-e89b-12d3-a456-426614174004' as any;

  beforeEach(async () => {
    const mockAgentRepository = {
      create: jest.fn(),
      findOne: jest.fn(),
      findMany: jest.fn(),
      findAllByOwner: jest.fn(),
      findAllByModel: jest.fn(),
      update: jest.fn(),
      updateModel: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemoveSourceFromAgentUseCase,
        { provide: AgentRepository, useValue: mockAgentRepository },
      ],
    }).compile();

    useCase = module.get<RemoveSourceFromAgentUseCase>(RemoveSourceFromAgentUseCase);
    agentRepository = module.get(AgentRepository);

    // Mock logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should remove source from agent successfully', async () => {
      // Arrange
      const mockModel = new PermittedLanguageModel({
        id: mockModelId,
        orgId: mockOrgId,
        model: new LanguageModel({
          name: 'gpt-4',
          displayName: 'GPT-4',
          provider: ModelProvider.OPENAI,
          canStream: true,
          isReasoning: false,
          isArchived: false,
        }),
      });

      const mockSource = new FileSource({
        fileType: 'application/pdf',
        fileSize: 1024,
        fileName: 'test-document.pdf',
        text: 'Test document content',
        content: [],
      });
      mockSource.id = mockSourceId;

      const originalAgent = new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        toolAssignments: [],
        sourceAssignments: [new AgentSourceAssignment({ source: mockSource })],
        userId: mockUserId,
      });

      const updatedAgent = new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        toolAssignments: [],
        sourceAssignments: [],
        userId: mockUserId,
      });

      const command = new RemoveSourceFromAgentCommand(originalAgent, mockSourceId);

      agentRepository.update.mockResolvedValue(updatedAgent);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(agentRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockAgentId,
          name: 'Test Agent',
          instructions: 'Test instructions',
          sourceAssignments: [],
        }),
      );
      expect(result).toBe(updatedAgent);
      expect(result.sourceAssignments).toHaveLength(0);
    });

    it('should remove specific source from agent with multiple sources', async () => {
      // Arrange
      const mockModel = new PermittedLanguageModel({
        id: mockModelId,
        orgId: mockOrgId,
        model: new LanguageModel({
          name: 'gpt-4',
          displayName: 'GPT-4',
          provider: ModelProvider.OPENAI,
          canStream: true,
          isReasoning: false,
          isArchived: false,
        }),
      });

      const sourceToRemove = new FileSource({
        fileType: 'application/pdf',
        fileSize: 1024,
        fileName: 'document-to-remove.pdf',
        text: 'Document to remove content',
        content: [],
      });
      sourceToRemove.id = mockSourceId;

      const sourceToKeep = new FileSource({
        fileType: 'text/plain',
        fileSize: 512,
        fileName: 'document-to-keep.txt',
        text: 'Document to keep content',
        content: [],
      });
      sourceToKeep.id = '123e4567-e89b-12d3-a456-426614174005' as any;

      const originalAgent = new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        toolAssignments: [],
        sourceAssignments: [
          new AgentSourceAssignment({ source: sourceToRemove }),
          new AgentSourceAssignment({ source: sourceToKeep }),
        ],
        userId: mockUserId,
      });

      const updatedAgent = new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        toolAssignments: [],
        sourceAssignments: [new AgentSourceAssignment({ source: sourceToKeep })],
        userId: mockUserId,
      });

      const command = new RemoveSourceFromAgentCommand(originalAgent, mockSourceId);

      agentRepository.update.mockResolvedValue(updatedAgent);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(agentRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceAssignments: expect.arrayContaining([
            expect.objectContaining({ source: sourceToKeep }),
          ]),
        }),
      );
      expect(result.sourceAssignments).toHaveLength(1);
      expect(result.sourceAssignments[0].source.id).toBe(sourceToKeep.id);
    });

    it('should throw AgentSourceNotFoundError when removing non-existent source', async () => {
      // Arrange
      const mockModel = new PermittedLanguageModel({
        id: mockModelId,
        orgId: mockOrgId,
        model: new LanguageModel({
          name: 'gpt-4',
          displayName: 'GPT-4',
          provider: ModelProvider.OPENAI,
          canStream: true,
          isReasoning: false,
          isArchived: false,
        }),
      });

      const existingSource = new FileSource({
        fileType: 'text/plain',
        fileSize: 512,
        fileName: 'existing-document.txt',
        text: 'Existing document content',
        content: [],
      });
      existingSource.id = '123e4567-e89b-12d3-a456-426614174005' as any;

      const originalAgent = new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        toolAssignments: [],
        sourceAssignments: [new AgentSourceAssignment({ source: existingSource })],
        userId: mockUserId,
      });

      const nonExistentSourceId = '123e4567-e89b-12d3-a456-426614174999' as any;
      const command = new RemoveSourceFromAgentCommand(originalAgent, nonExistentSourceId);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(AgentSourceNotFoundError);
      await expect(useCase.execute(command)).rejects.toThrow(
        `Source with ID ${nonExistentSourceId} not found in agent ${mockAgentId}`,
      );

      expect(agentRepository.update).not.toHaveBeenCalled();
    });

    it('should throw AgentSourceNotFoundError when agent has no sources', async () => {
      // Arrange
      const mockModel = new PermittedLanguageModel({
        id: mockModelId,
        orgId: mockOrgId,
        model: new LanguageModel({
          name: 'gpt-4',
          displayName: 'GPT-4',
          provider: ModelProvider.OPENAI,
          canStream: true,
          isReasoning: false,
          isArchived: false,
        }),
      });

      const originalAgent = new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        toolAssignments: [],
        sourceAssignments: [],
        userId: mockUserId,
      });

      const command = new RemoveSourceFromAgentCommand(originalAgent, mockSourceId);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(AgentSourceNotFoundError);
      await expect(useCase.execute(command)).rejects.toThrow(
        `Source with ID ${mockSourceId} not found in agent ${mockAgentId}`,
      );

      expect(agentRepository.update).not.toHaveBeenCalled();
    });

    it('should log the operation', async () => {
      // Arrange
      const mockModel = new PermittedLanguageModel({
        id: mockModelId,
        orgId: mockOrgId,
        model: new LanguageModel({
          name: 'gpt-4',
          displayName: 'GPT-4',
          provider: ModelProvider.OPENAI,
          canStream: true,
          isReasoning: false,
          isArchived: false,
        }),
      });

      const mockSource = new FileSource({
        fileType: 'application/pdf',
        fileSize: 1024,
        fileName: 'test-document.pdf',
        text: 'Test document content',
        content: [],
      });
      mockSource.id = mockSourceId;

      const originalAgent = new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        toolAssignments: [],
        sourceAssignments: [new AgentSourceAssignment({ source: mockSource })],
        userId: mockUserId,
      });

      const updatedAgent = new Agent({
        ...originalAgent,
        sourceAssignments: [],
      });

      const command = new RemoveSourceFromAgentCommand(originalAgent, mockSourceId);

      agentRepository.update.mockResolvedValue(updatedAgent);

      const logSpy = jest.spyOn(Logger.prototype, 'log');
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');

      // Act
      await useCase.execute(command);

      // Assert
      expect(logSpy).toHaveBeenCalledWith('execute', {
        agentId: mockAgentId,
        sourceId: mockSourceId,
      });
      expect(debugSpy).toHaveBeenCalledWith('Source removed from agent successfully', {
        agentId: mockAgentId,
        sourceId: mockSourceId,
      });
    });

    it('should handle repository errors', async () => {
      // Arrange
      const mockModel = new PermittedLanguageModel({
        id: mockModelId,
        orgId: mockOrgId,
        model: new LanguageModel({
          name: 'gpt-4',
          displayName: 'GPT-4',
          provider: ModelProvider.OPENAI,
          canStream: true,
          isReasoning: false,
          isArchived: false,
        }),
      });

      const mockSource = new FileSource({
        fileType: 'application/pdf',
        fileSize: 1024,
        fileName: 'test-document.pdf',
        text: 'Test document content',
        content: [],
      });
      mockSource.id = mockSourceId;

      const originalAgent = new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        toolAssignments: [],
        sourceAssignments: [new AgentSourceAssignment({ source: mockSource })],
        userId: mockUserId,
      });

      const command = new RemoveSourceFromAgentCommand(originalAgent, mockSourceId);

      const repositoryError = new Error('Database connection failed');
      agentRepository.update.mockRejectedValue(repositoryError);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        'Database connection failed',
      );

      expect(agentRepository.update).toHaveBeenCalled();
    });
  });
});