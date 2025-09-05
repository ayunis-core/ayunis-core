import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { CreateAgentUseCase } from './create-agent.use-case';
import { CreateAgentCommand } from './create-agent.command';
import { AgentRepository } from '../../ports/agent.repository';
import { GetPermittedLanguageModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-language-model/get-permitted-language-model.use-case';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { Agent } from '../../../domain/agent.entity';
import { AgentToolAssignment } from '../../../domain/agent-tool-assignment.entity';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { ContextService } from 'src/common/context/services/context.service';
import { UUID } from 'crypto';

describe('CreateAgentUseCase', () => {
  let useCase: CreateAgentUseCase;
  let agentRepository: jest.Mocked<AgentRepository>;
  let getPermittedLanguageModelUseCase: jest.Mocked<GetPermittedLanguageModelUseCase>;
  let assembleToolUseCase: jest.Mocked<AssembleToolUseCase>;
  let contextService: jest.Mocked<ContextService>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockOrgId = '123e4567-e89b-12d3-a456-426614174001' as UUID;
  const mockModelId = '123e4567-e89b-12d3-a456-426614174002' as UUID;

  beforeEach(async () => {
    const mockAgentRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const mockGetPermittedLanguageModelUseCase = {
      execute: jest.fn(),
    };

    const mockAssembleToolUseCase = {
      execute: jest.fn(),
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
        CreateAgentUseCase,
        { provide: AgentRepository, useValue: mockAgentRepository },
        {
          provide: GetPermittedLanguageModelUseCase,
          useValue: mockGetPermittedLanguageModelUseCase,
        },
        { provide: AssembleToolUseCase, useValue: mockAssembleToolUseCase },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<CreateAgentUseCase>(CreateAgentUseCase);
    agentRepository = module.get(AgentRepository);
    getPermittedLanguageModelUseCase = module.get(
      GetPermittedLanguageModelUseCase,
    );
    assembleToolUseCase = module.get(AssembleToolUseCase);
    contextService = module.get(ContextService);

    // Mock logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should create an agent successfully', async () => {
      // Arrange
      const command = new CreateAgentCommand({
        name: 'Test Agent',
        instructions: 'Test instructions',
        modelId: mockModelId,
        toolAssignments: [
          {
            toolType: ToolType.INTERNET_SEARCH,
            toolConfigId: null,
          },
        ],
      });

      const mockModel = new PermittedLanguageModel({
        id: mockModelId,
        orgId: mockOrgId,
        model: new LanguageModel({
          name: 'gpt-4',
          displayName: 'gpt-4',
          provider: ModelProvider.OPENAI,
          canStream: true,
          isReasoning: false,
          isArchived: false,
          canUseTools: true,
        }),
      });
      const mockTool = {
        type: ToolType.INTERNET_SEARCH,
        name: 'internet_search',
        description: '',
        parameters: { type: 'object', properties: {} },
        validateParams: (p: any) => p,
      } as any;
      const mockCreatedAgent = new Agent({
        name: command.name,
        instructions: command.instructions,
        model: mockModel,
        toolAssignments: [new AgentToolAssignment({ tool: mockTool })],
        userId: mockUserId,
      });

      getPermittedLanguageModelUseCase.execute.mockResolvedValue(
        mockModel as any,
      );
      assembleToolUseCase.execute.mockResolvedValue(mockTool);
      agentRepository.create.mockResolvedValue(mockCreatedAgent);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(getPermittedLanguageModelUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          id: command.modelId,
        }),
      );
      expect(assembleToolUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ToolType.INTERNET_SEARCH,
        }),
      );
      expect(agentRepository.create).toHaveBeenCalledWith(expect.any(Agent));
      expect(result).toBe(mockCreatedAgent);
    });

    it('should handle tool assignments with config IDs', async () => {
      // Arrange
      const toolConfigId = '123e4567-e89b-12d3-a456-426614174003' as any;
      const command = new CreateAgentCommand({
        name: 'Test Agent',
        instructions: 'Test instructions',
        modelId: mockModelId,
        toolAssignments: [
          {
            toolType: ToolType.SEND_EMAIL,
            toolConfigId: toolConfigId,
          },
        ],
      });

      const mockModel = new PermittedLanguageModel({
        id: mockModelId,
        orgId: mockOrgId,
        model: new LanguageModel({
          name: 'gpt-4',
          displayName: 'gpt-4',
          provider: ModelProvider.OPENAI,
          canStream: true,
          isReasoning: false,
          isArchived: false,
          canUseTools: true,
        }),
      });
      const mockTool = {
        type: ToolType.SEND_EMAIL,
        name: 'send_email',
        description: '',
        parameters: { type: 'object', properties: {} },
        validateParams: (p: any) => p,
      } as any;
      const mockCreatedAgent = new Agent({
        name: command.name,
        instructions: command.instructions,
        model: mockModel,
        toolAssignments: [new AgentToolAssignment({ tool: mockTool })],
        userId: mockUserId,
      });

      getPermittedLanguageModelUseCase.execute.mockResolvedValue(
        mockModel as any,
      );
      assembleToolUseCase.execute.mockResolvedValue(mockTool);
      agentRepository.create.mockResolvedValue(mockCreatedAgent);

      // Act
      await useCase.execute(command);

      // Assert
      expect(assembleToolUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ToolType.SEND_EMAIL,
          configId: toolConfigId,
        }),
      );
    });

    it('should handle multiple tool assignments', async () => {
      // Arrange
      const command = new CreateAgentCommand({
        name: 'Test Agent',
        instructions: 'Test instructions',
        modelId: mockModelId,
        toolAssignments: [
          {
            toolType: ToolType.INTERNET_SEARCH,
            toolConfigId: null,
          },
          {
            toolType: ToolType.SEND_EMAIL,
            toolConfigId: '123e4567-e89b-12d3-a456-426614174003' as any,
          },
        ],
      });

      const mockModel = new PermittedLanguageModel({
        id: mockModelId,
        orgId: mockOrgId,
        model: new LanguageModel({
          name: 'gpt-4',
          displayName: 'gpt-4',
          provider: ModelProvider.OPENAI,
          canStream: true,
          isReasoning: false,
          isArchived: false,
          canUseTools: true,
        }),
      });
      const mockTool1 = {
        type: ToolType.INTERNET_SEARCH,
        name: 'internet_search',
        description: '',
        parameters: { type: 'object', properties: {} },
        validateParams: (p: any) => p,
      } as any;
      const mockTool2 = {
        type: ToolType.SEND_EMAIL,
        name: 'send_email',
        description: '',
        parameters: { type: 'object', properties: {} },
        validateParams: (p: any) => p,
      } as any;
      const mockCreatedAgent = new Agent({
        name: command.name,
        instructions: command.instructions,
        model: mockModel,
        toolAssignments: [
          new AgentToolAssignment({ tool: mockTool1 }),
          new AgentToolAssignment({ tool: mockTool2 }),
        ],
        userId: mockUserId,
      });

      getPermittedLanguageModelUseCase.execute.mockResolvedValue(
        mockModel as any,
      );
      assembleToolUseCase.execute
        .mockResolvedValueOnce(mockTool1)
        .mockResolvedValueOnce(mockTool2);
      agentRepository.create.mockResolvedValue(mockCreatedAgent);

      // Act
      await useCase.execute(command);

      // Assert
      expect(assembleToolUseCase.execute).toHaveBeenCalledTimes(2);
      expect(agentRepository.create).toHaveBeenCalledWith(expect.any(Agent));
    });

    it('should log the agent creation', async () => {
      // Arrange
      const command = new CreateAgentCommand({
        name: 'Test Agent',
        instructions: 'Test instructions',
        modelId: mockModelId,
        toolAssignments: [],
      });

      const mockModel = new PermittedLanguageModel({
        id: mockModelId,
        orgId: mockOrgId,
        model: new LanguageModel({
          name: 'gpt-4',
          displayName: 'gpt-4',
          provider: ModelProvider.OPENAI,
          canStream: true,
          isReasoning: false,
          isArchived: false,
          canUseTools: true,
        }),
      });
      const mockCreatedAgent = new Agent({
        name: command.name,
        instructions: command.instructions,
        model: mockModel,
        toolAssignments: [],
        userId: mockUserId,
      });

      getPermittedLanguageModelUseCase.execute.mockResolvedValue(
        mockModel as any,
      );
      agentRepository.create.mockResolvedValue(mockCreatedAgent);

      const logSpy = jest.spyOn(Logger.prototype, 'log');

      // Act
      await useCase.execute(command);

      // Assert
      expect(logSpy).toHaveBeenCalledWith('Creating agent', {
        name: command.name,
      });
    });
  });
});
