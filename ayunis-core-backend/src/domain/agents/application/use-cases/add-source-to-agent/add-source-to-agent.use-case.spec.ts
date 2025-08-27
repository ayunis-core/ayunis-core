import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AddSourceToAgentUseCase } from './add-source-to-agent.use-case';
import { AddSourceToAgentCommand } from './add-source-to-agent.command';
import { AgentRepository } from '../../ports/agent.repository';
import { Agent } from '../../../domain/agent.entity';
import { AgentSourceAssignment } from '../../../domain/agent-source-assignment.entity';
import { FileSource } from '../../../../sources/domain/sources/file-source.entity';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

describe('AddSourceToAgentUseCase', () => {
  let useCase: AddSourceToAgentUseCase;
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
        AddSourceToAgentUseCase,
        { provide: AgentRepository, useValue: mockAgentRepository },
      ],
    }).compile();

    useCase = module.get<AddSourceToAgentUseCase>(AddSourceToAgentUseCase);
    agentRepository = module.get(AgentRepository);

    // Mock logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should add source to agent successfully', async () => {
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
        sourceAssignments: [],
        userId: mockUserId,
      });

      const updatedAgent = new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        toolAssignments: [],
        sourceAssignments: [new AgentSourceAssignment({ source: mockSource })],
        userId: mockUserId,
      });

      const command = new AddSourceToAgentCommand(originalAgent, mockSource);

      agentRepository.update.mockResolvedValue(updatedAgent);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(agentRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockAgentId,
          name: 'Test Agent',
          instructions: 'Test instructions',
          sourceAssignments: expect.arrayContaining([
            expect.objectContaining({
              source: mockSource,
            }),
          ]),
        }),
      );
      expect(result).toBe(updatedAgent);
      expect(result.sourceAssignments).toHaveLength(1);
      expect(result.sourceAssignments[0].source).toBe(mockSource);
    });

    it('should add source to agent that already has sources', async () => {
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

      const newSource = new FileSource({
        fileType: 'application/pdf',
        fileSize: 1024,
        fileName: 'new-document.pdf',
        text: 'New document content',
        content: [],
      });
      newSource.id = mockSourceId;

      const originalAgent = new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        toolAssignments: [],
        sourceAssignments: [new AgentSourceAssignment({ source: existingSource })],
        userId: mockUserId,
      });

      const updatedAgent = new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        toolAssignments: [],
        sourceAssignments: [
          new AgentSourceAssignment({ source: existingSource }),
          new AgentSourceAssignment({ source: newSource }),
        ],
        userId: mockUserId,
      });

      const command = new AddSourceToAgentCommand(originalAgent, newSource);

      agentRepository.update.mockResolvedValue(updatedAgent);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(agentRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceAssignments: expect.arrayContaining([
            expect.objectContaining({ source: existingSource }),
            expect.objectContaining({ source: newSource }),
          ]),
        }),
      );
      expect(result.sourceAssignments).toHaveLength(2);
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
        sourceAssignments: [],
        userId: mockUserId,
      });

      const updatedAgent = new Agent({
        ...originalAgent,
        sourceAssignments: [new AgentSourceAssignment({ source: mockSource })],
      });

      const command = new AddSourceToAgentCommand(originalAgent, mockSource);

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
      expect(debugSpy).toHaveBeenCalledWith('Source added to agent successfully', {
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
        sourceAssignments: [],
        userId: mockUserId,
      });

      const command = new AddSourceToAgentCommand(originalAgent, mockSource);

      const repositoryError = new Error('Database connection failed');
      agentRepository.update.mockRejectedValue(repositoryError);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        'Database connection failed',
      );

      expect(agentRepository.update).toHaveBeenCalled();
    });

    it('should create new source assignment with unique ID', async () => {
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
        sourceAssignments: [],
        userId: mockUserId,
      });

      const command = new AddSourceToAgentCommand(originalAgent, mockSource);

      agentRepository.update.mockImplementation((agent) => Promise.resolve(agent));

      // Act
      await useCase.execute(command);

      // Assert
      const updatedAgentCall = agentRepository.update.mock.calls[0][0];
      expect(updatedAgentCall.sourceAssignments).toHaveLength(1);
      expect(updatedAgentCall.sourceAssignments[0].id).toBeDefined();
      expect(updatedAgentCall.sourceAssignments[0].source).toBe(mockSource);
      expect(updatedAgentCall.sourceAssignments[0].createdAt).toBeInstanceOf(Date);
      expect(updatedAgentCall.sourceAssignments[0].updatedAt).toBeInstanceOf(Date);
    });
  });
});