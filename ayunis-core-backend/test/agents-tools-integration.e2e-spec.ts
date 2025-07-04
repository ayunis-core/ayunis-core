import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { AgentsService } from '../src/domain/agents/application/agents.service';
import { AgentRepository } from '../src/domain/agents/application/ports/agent.repository';
import { ModelsService } from '../src/domain/models/application/models.service';
import { ToolsService } from '../src/domain/tools/application/tools.service';
import { ModelProvider } from '../src/domain/models/domain/value-objects/model-provider.enum';
import { ToolType } from '../src/domain/tools/domain/value-objects/tool-type.enum';
import { AgentsController } from '../src/domain/agents/presenters/http/agents.controller';
import { Agent } from '../src/domain/agents/domain/agent.entity';
import { PotentialModel } from '../src/domain/models/domain/potential-model';
import { AgentToolAssignment } from '../src/domain/agents/domain/value-objects/agent-tool-assignment.object';
import { InferenceHandlerRegistry } from '../src/domain/models/application/registry/inference-handler.registry';

describe('Agents-Tools Integration Repository Tests', () => {
  let agentsService: AgentsService;
  let agentRepository: {
    create: jest.Mock;
    findOne: jest.Mock;
    findMany: jest.Mock;
    findAllByOwner: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let toolRepository: {
    create: jest.Mock;
    findOne: jest.Mock;
    findMany: jest.Mock;
    findAll: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  const userId = randomUUID();

  beforeEach(async () => {
    // Create mock repositories
    agentRepository = {
      create: jest.fn(),
      findOne: jest.fn(),
      findMany: jest.fn(),
      findAllByOwner: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    toolRepository = {
      create: jest.fn(),
      findOne: jest.fn(),
      findMany: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AgentsService,
        {
          provide: AgentRepository,
          useValue: agentRepository,
        },
        {
          provide: ModelsService,
          useValue: {
            create: jest
              .fn()
              .mockReturnValue(
                new PotentialModel('gpt-4', ModelProvider.OPENAI),
              ),
          },
        },
        {
          provide: InferenceHandlerRegistry,
          useValue: {},
        },
        {
          provide: ToolsService,
          useValue: {
            findOne: jest.fn(),
            findMany: jest.fn(),
            findAllUser: jest.fn(),
          },
        },
      ],
    }).compile();

    agentsService = moduleRef.get<AgentsService>(AgentsService);
  });

  it('should retrieve agents with their tool assignments', async () => {
    // Mock data
    const mockAgent = {
      id: randomUUID(),
      name: 'Test Agent',
      instructions: 'Test instructions',
      model: new PotentialModel('gpt-4', ModelProvider.OPENAI),
      toolAssignments: [
        new AgentToolAssignment({
          toolType: ToolType.HTTP,
          toolConfigId: randomUUID(),
        }),
        new AgentToolAssignment({
          toolType: ToolType.SOURCE_QUERY,
          toolConfigId: null,
        }),
      ],
      userId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Configure mock
    agentRepository.findMany.mockResolvedValue([mockAgent]);

    // Call service
    const result = await agentsService.findMany([mockAgent.id], userId);

    // Verify
    expect(agentRepository.findMany).toHaveBeenCalledWith(
      [mockAgent.id],
      userId,
    );
    expect(result).toHaveLength(1);
    expect(result[0].toolAssignments).toBeDefined();
    expect(result[0].toolAssignments).toHaveLength(2);
    expect(result[0].toolAssignments[0].toolType).toBe(ToolType.HTTP);
    expect(result[0].toolAssignments[1].toolType).toBe(ToolType.SOURCE_QUERY);
  });

  it('should retrieve a single agent with its tool assignments', async () => {
    // Mock data
    const agentId = randomUUID();

    const mockAgent = {
      id: agentId,
      name: 'Test Agent',
      instructions: 'Test instructions',
      model: new PotentialModel('gpt-4', ModelProvider.OPENAI),
      toolAssignments: [
        new AgentToolAssignment({
          toolType: ToolType.HTTP,
          toolConfigId: randomUUID(),
        }),
      ],
      userId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Configure mock
    agentRepository.findOne.mockResolvedValue(mockAgent);

    // Call service
    const result = await agentsService.findOne({
      id: agentId,
      userId: userId,
    });

    // Verify
    expect(agentRepository.findOne).toHaveBeenCalledWith(agentId, userId);
    expect(result).toBeDefined();
    expect(result).not.toBeNull();
    expect(result!.toolAssignments).toBeDefined();
    expect(result!.toolAssignments).toHaveLength(1);
    expect(result!.toolAssignments[0].toolType).toBe(ToolType.HTTP);
  });

  it('should create an agent with tool assignments', async () => {
    // Mock data
    const agentId = randomUUID();
    const toolId = randomUUID();

    const mockTool = {
      id: toolId,
      name: 'test-tool',
      displayName: 'Test Tool',
      description: 'Test tool description',
      type: ToolType.HTTP,
      userId: userId,
      parameters: { type: 'object', properties: {} },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockAgent = {
      id: agentId,
      name: 'Test Agent',
      instructions: 'Test instructions',
      model: new PotentialModel('gpt-4', ModelProvider.OPENAI),
      toolAssignments: [
        new AgentToolAssignment({
          toolType: ToolType.HTTP,
          toolConfigId: toolId,
        }),
      ],
      userId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Configure mocks
    toolRepository.findOne.mockResolvedValue(mockTool);
    agentRepository.create.mockResolvedValue(mockAgent);

    // Command to create agent
    const createCommand = {
      name: 'Test Agent',
      instructions: 'Test instructions',
      modelName: 'gpt-4',
      modelProvider: ModelProvider.OPENAI,
      toolAssignments: [
        {
          toolType: ToolType.HTTP,
          toolConfigId: toolId,
        },
      ],
      userId: userId,
    };

    // Call service
    const result = await agentsService.create(createCommand);

    // Verify
    expect(agentRepository.create).toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(result.toolAssignments).toHaveLength(1);
    expect(result.toolAssignments[0].toolType).toBe(ToolType.HTTP);
    expect(result.toolAssignments[0].toolConfigId).toBe(toolId);
  });
});
