import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { AgentsService } from '../src/domain/agents/application/agents.service';
import { AgentRepository } from '../src/domain/agents/application/ports/agent.repository';
import { ModelsService } from '../src/domain/models/application/models.service';
import { ToolsService } from '../src/domain/tools/application/tools.service';
import { ModelProvider } from '../src/domain/models/domain/value-objects/model-provider.enum';
import { AgentsController } from '../src/domain/agents/presenters/http/agents.controller';
import { Agent } from '../src/domain/agents/domain/agent.entity';
import { PotentialModel } from '../src/domain/models/domain/potential-model';
import { InferenceHandlerRegistry } from '../src/domain/models/application/registry/inference-handler.registry';
import { ToolType } from '../src/domain/tools/domain/value-objects/tool-type.enum';
import { AgentToolAssignment } from '../src/domain/agents/domain/value-objects/agent-tool-assignment.object';

describe('Agents Tools Issue (e2e)', () => {
  let app: INestApplication;
  let agentsService: AgentsService;
  let toolsService: ToolsService;

  // Mock repositories and services
  let agentRepository: {
    create: jest.Mock;
    findOne: jest.Mock;
    findMany: jest.Mock;
    findAllByOwner: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  const mockUserId = randomUUID();
  const mockModel = new PotentialModel('gpt-4', ModelProvider.OPENAI);

  beforeEach(async () => {
    // Create mocks
    agentRepository = {
      create: jest.fn(),
      findOne: jest.fn(),
      findMany: jest.fn(),
      findAllByOwner: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const mockToolsService = {
      findOne: jest.fn(),
      findMany: jest.fn(),
      findAllUser: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AgentsController],
      providers: [
        AgentsService,
        {
          provide: AgentRepository,
          useValue: agentRepository,
        },
        {
          provide: ModelsService,
          useClass: ModelsService,
        },
        {
          provide: InferenceHandlerRegistry,
          useValue: {},
        },
        {
          provide: ToolsService,
          useValue: mockToolsService,
        },
      ],
    }).compile();

    agentsService = moduleFixture.get<AgentsService>(AgentsService);
    toolsService = moduleFixture.get<ToolsService>(ToolsService) as any; // Cast to allow mocking

    app = moduleFixture.createNestApplication();

    // Set up the middleware to extract user info from headers
    app.use((req, res, next) => {
      if (req.headers['x-user-id']) {
        req.user = { id: req.headers['x-user-id'] };
      }
      next();
    });

    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('should handle agents with tool assignments being undefined from the database', async () => {
    // Create agent objects with undefined toolAssignments (simulating database issue)
    const agentWithoutToolAssignments = {
      id: randomUUID(),
      name: 'Agent without tool assignments',
      instructions: 'Test instructions',
      model: mockModel,
      userId: mockUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      // toolAssignments is intentionally not defined to simulate the database issue
    };

    // Use a type assertion to bypass TypeScript's type checking
    // since we're intentionally creating an invalid state to test error handling
    const invalidAgent = agentWithoutToolAssignments as unknown as Agent;

    // Mock the repository to return the agent with undefined toolAssignments
    agentRepository.findMany.mockResolvedValue([invalidAgent]);

    // Call the service method directly
    const result = await agentsService.findMany([invalidAgent.id], mockUserId);

    // This will likely fail with the current implementation
    expect(result).toBeDefined();
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBe(1);
  });

  it('should preserve tool assignments when creating and retrieving an agent', async () => {
    // Setup mock tool
    const mockToolId = randomUUID();
    const mockTool = {
      id: mockToolId,
      name: 'test-tool',
      displayName: 'Test Tool',
      description: 'A test tool',
      parameters: { type: 'object', properties: {} },
      type: ToolType.HTTP,
      userId: mockUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      validateParams: jest.fn(),
    };

    // Mock the ToolsService.findOne to return the mock tool
    (toolsService.findOne as jest.Mock).mockResolvedValue(mockTool);

    // Create an agent with the tool - this simulates what happens during agent creation
    const createdAgent = new Agent({
      name: 'Agent with Tool',
      instructions: 'Test instructions for agent with tool',
      model: mockModel,
      toolAssignments: [
        new AgentToolAssignment({
          toolType: ToolType.HTTP,
          toolConfigId: mockToolId,
        }),
      ],
      userId: mockUserId,
    });

    // First test: verify the agent has tool assignments when created
    console.log(
      'Created agent tool assignments:',
      createdAgent.toolAssignments,
    );
    expect(createdAgent.toolAssignments).toHaveLength(1);
    expect(createdAgent.toolAssignments[0].toolConfigId).toBe(mockToolId);

    // Mock the repository to return our agent with tool assignments
    agentRepository.findMany.mockResolvedValue([createdAgent]);

    // Test retrieval - verify tool assignments are preserved
    const result = await agentsService.findMany([createdAgent.id], mockUserId);

    console.log('Retrieved agent with tool assignments:', result);

    // Assertions
    expect(result).toBeDefined();
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBe(1);
    expect(result[0].toolAssignments).toBeDefined();
    expect(result[0].toolAssignments).toBeInstanceOf(Array);
    expect(result[0].toolAssignments.length).toBe(1);
    expect(result[0].toolAssignments[0].toolType).toBe(ToolType.HTTP);
    expect(result[0].toolAssignments[0].toolConfigId).toBe(mockToolId);
  });

  it('should create an agent using the service and preserve tool assignments', async () => {
    // Setup mock tool
    const mockToolId = randomUUID();
    const mockTool = {
      id: mockToolId,
      name: 'test-tool',
      displayName: 'Test Tool',
      description: 'A test tool',
      parameters: { type: 'object', properties: {} },
      type: ToolType.HTTP,
      userId: mockUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      validateParams: jest.fn(),
    };

    // Mock the ToolsService to return the tool
    (toolsService.findOne as jest.Mock).mockResolvedValue(mockTool);

    // Create the command for agent creation
    const createCommand = {
      name: 'Test Agent with Tool',
      instructions: 'Test instructions',
      modelName: 'gpt-4',
      modelProvider: ModelProvider.OPENAI,
      toolAssignments: [
        {
          toolType: ToolType.HTTP,
          toolConfigId: mockToolId,
        },
      ],
      userId: mockUserId,
    };

    // Mock the expected agent to be returned
    const expectedAgent = new Agent({
      name: createCommand.name,
      instructions: createCommand.instructions,
      model: mockModel,
      toolAssignments: [
        new AgentToolAssignment({
          toolType: ToolType.HTTP,
          toolConfigId: mockToolId,
        }),
      ],
      userId: mockUserId,
    });

    agentRepository.create.mockResolvedValue(expectedAgent);

    // Call the service
    const result = await agentsService.create(createCommand);

    // Verify
    expect(agentRepository.create).toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(result.toolAssignments).toHaveLength(1);
    expect(result.toolAssignments[0].toolType).toBe(ToolType.HTTP);
    expect(result.toolAssignments[0].toolConfigId).toBe(mockToolId);
  });
});
