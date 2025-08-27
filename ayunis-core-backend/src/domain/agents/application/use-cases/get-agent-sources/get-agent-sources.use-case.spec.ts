import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { GetAgentSourcesUseCase } from './get-agent-sources.use-case';
import { GetAgentSourcesQuery } from './get-agent-sources.query';
import { AgentRepository } from '../../ports/agent.repository';
import { Agent } from '../../../domain/agent.entity';
import { AgentSourceAssignment } from '../../../domain/agent-source-assignment.entity';
import { FileSource } from '../../../../sources/domain/sources/file-source.entity';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { AgentNotFoundError } from '../../agents.errors';
import { ContextService } from 'src/common/context/services/context.service';

describe('GetAgentSourcesUseCase', () => {
  let useCase: GetAgentSourcesUseCase;
  let agentRepository: jest.Mocked<AgentRepository>;
  let contextService: jest.Mocked<ContextService>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as any;
  const mockOrgId = '123e4567-e89b-12d3-a456-426614174001' as any;
  const mockAgentId = '123e4567-e89b-12d3-a456-426614174002' as any;
  const mockSourceId1 = '123e4567-e89b-12d3-a456-426614174003' as any;
  const mockSourceId2 = '123e4567-e89b-12d3-a456-426614174004' as any;
  const mockModelId = '123e4567-e89b-12d3-a456-426614174005' as any;

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

    const mockContextService = {
      get: jest.fn((key: string) => {
        if (key === 'userId') return mockUserId;
        if (key === 'orgId') return mockOrgId;
        return undefined;
      }),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAgentSourcesUseCase,
        { provide: AgentRepository, useValue: mockAgentRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<GetAgentSourcesUseCase>(GetAgentSourcesUseCase);
    agentRepository = module.get(AgentRepository);
    contextService = module.get(ContextService);

    // Mock logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return agent sources successfully', async () => {
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

      const mockSource1 = new FileSource({
        fileType: 'application/pdf',
        fileSize: 1024,
        fileName: 'document1.pdf',
        text: 'Document 1 content',
        content: [],
      });
      mockSource1.id = mockSourceId1;

      const mockSource2 = new FileSource({
        fileType: 'text/plain',
        fileSize: 512,
        fileName: 'document2.txt',
        text: 'Document 2 content',
        content: [],
      });
      mockSource2.id = mockSourceId2;

      const mockAgent = new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        toolAssignments: [],
        sourceAssignments: [
          new AgentSourceAssignment({ source: mockSource1 }),
          new AgentSourceAssignment({ source: mockSource2 }),
        ],
        userId: mockUserId,
      });

      const query = new GetAgentSourcesQuery(mockAgentId);

      agentRepository.findOne.mockResolvedValue(mockAgent);

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(agentRepository.findOne).toHaveBeenCalledWith(mockAgentId, mockUserId);
      expect(result).toHaveLength(2);
      expect(result[0]).toBe(mockSource1);
      expect(result[1]).toBe(mockSource2);
    });

    it('should return empty array for agent with no sources', async () => {
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

      const mockAgent = new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        toolAssignments: [],
        sourceAssignments: [],
        userId: mockUserId,
      });

      const query = new GetAgentSourcesQuery(mockAgentId);

      agentRepository.findOne.mockResolvedValue(mockAgent);

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(agentRepository.findOne).toHaveBeenCalledWith(mockAgentId, mockUserId);
      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should throw AgentNotFoundError when agent does not exist', async () => {
      // Arrange
      const query = new GetAgentSourcesQuery(mockAgentId);

      agentRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(AgentNotFoundError);
      await expect(useCase.execute(query)).rejects.toThrow(
        `Agent with ID ${mockAgentId} not found`,
      );

      expect(agentRepository.findOne).toHaveBeenCalledWith(mockAgentId, mockUserId);
    });

    it('should return single source for agent with one source', async () => {
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
        fileName: 'single-document.pdf',
        text: 'Single document content',
        content: [],
      });
      mockSource.id = mockSourceId1;

      const mockAgent = new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        toolAssignments: [],
        sourceAssignments: [new AgentSourceAssignment({ source: mockSource })],
        userId: mockUserId,
      });

      const query = new GetAgentSourcesQuery(mockAgentId);

      agentRepository.findOne.mockResolvedValue(mockAgent);

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockSource);
      expect(result[0].id).toBe(mockSourceId1);
      expect(result[0].name).toBe('single-document.pdf');
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

      const mockAgent = new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        toolAssignments: [],
        sourceAssignments: [],
        userId: mockUserId,
      });

      const query = new GetAgentSourcesQuery(mockAgentId);

      agentRepository.findOne.mockResolvedValue(mockAgent);

      const logSpy = jest.spyOn(Logger.prototype, 'log');
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');

      // Act
      await useCase.execute(query);

      // Assert
      expect(logSpy).toHaveBeenCalledWith('execute', {
        agentId: mockAgentId,
      });
      expect(debugSpy).toHaveBeenCalledWith('Retrieved agent sources successfully', {
        agentId: mockAgentId,
        sourceCount: 0,
      });
    });

    it('should handle repository errors', async () => {
      // Arrange
      const query = new GetAgentSourcesQuery(mockAgentId);

      const repositoryError = new Error('Database connection failed');
      agentRepository.findOne.mockRejectedValue(repositoryError);

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(
        'Database connection failed',
      );

      expect(agentRepository.findOne).toHaveBeenCalledWith(mockAgentId, mockUserId);
    });

    it('should preserve source order from agent source assignments', async () => {
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

      const firstSource = new FileSource({
        fileType: 'application/pdf',
        fileSize: 1024,
        fileName: 'first-document.pdf',
        text: 'First document content',
        content: [],
      });
      firstSource.id = mockSourceId1;

      const secondSource = new FileSource({
        fileType: 'text/plain',
        fileSize: 512,
        fileName: 'second-document.txt',
        text: 'Second document content',
        content: [],
      });
      secondSource.id = mockSourceId2;

      const mockAgent = new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        toolAssignments: [],
        sourceAssignments: [
          new AgentSourceAssignment({ source: firstSource }),
          new AgentSourceAssignment({ source: secondSource }),
        ],
        userId: mockUserId,
      });

      const query = new GetAgentSourcesQuery(mockAgentId);

      agentRepository.findOne.mockResolvedValue(mockAgent);

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('first-document.pdf');
      expect(result[1].name).toBe('second-document.txt');
    });

    it('should handle different source types', async () => {
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

      const pdfSource = new FileSource({
        fileType: 'application/pdf',
        fileSize: 2048,
        fileName: 'document.pdf',
        text: 'PDF document content',
        content: [],
      });
      pdfSource.id = mockSourceId1;

      const textSource = new FileSource({
        fileType: 'text/plain',
        fileSize: 1024,
        fileName: 'document.txt',
        text: 'Text document content',
        content: [],
      });
      textSource.id = mockSourceId2;

      const mockAgent = new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        toolAssignments: [],
        sourceAssignments: [
          new AgentSourceAssignment({ source: pdfSource }),
          new AgentSourceAssignment({ source: textSource }),
        ],
        userId: mockUserId,
      });

      const query = new GetAgentSourcesQuery(mockAgentId);

      agentRepository.findOne.mockResolvedValue(mockAgent);

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(result).toHaveLength(2);
      expect((result[0] as FileSource).fileType).toBe('application/pdf');
      expect((result[1] as FileSource).fileType).toBe('text/plain');
    });
  });
});