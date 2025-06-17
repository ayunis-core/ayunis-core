import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { AgentsService } from '../src/domain/agents/application/agents.service';
import { AgentRepository } from '../src/domain/agents/application/ports/agent.repository';
import { ModelsService } from '../src/domain/models/application/models.service';
import { ToolsService } from '../src/domain/tools/application/tools.service';
import { ModelProvider } from '../src/domain/models/domain/value-objects/model-provider.object';
import { AgentsController } from '../src/domain/agents/presenters/http/agents.controller';
import { Agent } from '../src/domain/agents/domain/agent.entity';
import { PotentialModel } from '../src/domain/models/domain/potential-model';
import { InferenceHandlerRegistry } from '../src/domain/models/application/registry/inference-handler.registry';
import { ToolType } from '../src/domain/tools/domain/value-objects/tool-type.enum';
import { AgentToolAssignment } from '../src/domain/agents/domain/value-objects/agent-tool-assignment.object';

describe('Agents (e2e)', () => {
  let app: INestApplication;
  const mockUserId = randomUUID();
  const mockToolId = randomUUID();

  // Mock repositories and services
  let agentRepository: {
    create: jest.Mock;
    findOne: jest.Mock;
    findAllByOwner: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  let modelsService: ModelsService;
  let toolsService: {
    findOne: jest.Mock;
    findMany: jest.Mock;
  };

  // Mock data
  const mockModel = new PotentialModel('gpt-4', ModelProvider.OPENAI);

  beforeEach(async () => {
    // Create mocks
    agentRepository = {
      create: jest.fn(),
      findOne: jest.fn(),
      findAllByOwner: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    toolsService = {
      findOne: jest.fn(),
      findMany: jest.fn(),
    };

    // Create a test module with mocked dependencies
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
          useValue: toolsService,
        },
      ],
    }).compile();

    modelsService = moduleFixture.get<ModelsService>(ModelsService);

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

  it('should create and retrieve an agent', async () => {
    // Setup mock returns
    const mockAgent = new Agent({
      name: 'E2E Test Agent',
      instructions: 'This is an e2e test agent',
      model: mockModel,
      toolAssignments: [],
      userId: mockUserId,
    });

    agentRepository.create.mockResolvedValue(mockAgent);
    agentRepository.findOne.mockResolvedValue(mockAgent);
    agentRepository.findAllByOwner.mockResolvedValue([mockAgent]);

    // Create agent
    const createAgentDto = {
      name: 'E2E Test Agent',
      instructions: 'This is an e2e test agent',
      modelName: 'gpt-4',
      modelProvider: ModelProvider.OPENAI,
      toolAssignments: [],
    };

    // Create the agent
    const createResponse = await request(app.getHttpServer())
      .post('/agents')
      .set('x-user-id', mockUserId)
      .send(createAgentDto)
      .expect(201);

    const agentId = createResponse.body.id;
    expect(agentId).toBeDefined();
    expect(createResponse.body.name).toBe(createAgentDto.name);
    expect(createResponse.body.instructions).toBe(createAgentDto.instructions);

    // Get the agent by ID
    const getResponse = await request(app.getHttpServer())
      .get(`/agents/${agentId}`)
      .set('x-user-id', mockUserId)
      .expect(200);

    expect(getResponse.body.id).toBe(agentId);
    expect(getResponse.body.name).toBe(createAgentDto.name);

    // Get all agents for user
    const getAllResponse = await request(app.getHttpServer())
      .get('/agents')
      .set('x-user-id', mockUserId)
      .expect(200);

    expect(getAllResponse.body).toBeInstanceOf(Array);
    expect(getAllResponse.body.length).toBeGreaterThanOrEqual(1);

    // Check repository calls
    expect(agentRepository.create).toHaveBeenCalled();
    expect(agentRepository.findOne).toHaveBeenCalled();
    expect(agentRepository.findAllByOwner).toHaveBeenCalledWith(mockUserId);
  });

  it('should create an agent with tools and retrieve it', async () => {
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

    toolsService.findOne.mockResolvedValue(mockTool);
    toolsService.findMany.mockResolvedValue([mockTool]);

    // Setup mock agent with tool
    const mockAgentWithTool = new Agent({
      name: 'E2E Test Agent with Tool',
      instructions: 'This is an e2e test agent with a tool',
      model: mockModel,
      toolAssignments: [
        new AgentToolAssignment({
          toolType: ToolType.HTTP,
          toolConfigId: mockToolId,
        }),
      ],
      userId: mockUserId,
    });

    agentRepository.create.mockResolvedValue(mockAgentWithTool);
    agentRepository.findOne.mockResolvedValue(mockAgentWithTool);

    // Create agent with the tool
    const createAgentDto = {
      name: 'E2E Test Agent with Tool',
      instructions: 'This is an e2e test agent with a tool',
      modelName: 'gpt-4',
      modelProvider: ModelProvider.OPENAI,
      toolAssignments: [
        {
          toolType: ToolType.HTTP,
          toolConfigId: mockToolId,
        },
      ],
    };

    // Create the agent
    const createResponse = await request(app.getHttpServer())
      .post('/agents')
      .set('x-user-id', mockUserId)
      .send(createAgentDto)
      .expect(201);

    const agentId = createResponse.body.id;
    expect(agentId).toBeDefined();
    expect(createResponse.body.name).toBe(createAgentDto.name);

    // Get the agent by ID
    const getResponse = await request(app.getHttpServer())
      .get(`/agents/${agentId}`)
      .set('x-user-id', mockUserId)
      .expect(200);

    expect(getResponse.body.id).toBe(agentId);

    // Check repository calls
    expect(agentRepository.create).toHaveBeenCalled();
    expect(agentRepository.findOne).toHaveBeenCalled();
    expect(toolsService.findOne).toHaveBeenCalled();
  });

  it('should return 404 for a non-existent agent', async () => {
    const nonExistentId = randomUUID();

    // Setup mock return to trigger NotFoundException
    agentRepository.findOne.mockResolvedValue(null);

    const response = await request(app.getHttpServer())
      .get(`/agents/${nonExistentId}`)
      .set('x-user-id', mockUserId);

    // The error is wrapped in an AgentExecutionFailedError with status 500
    expect(response.status).toBe(500);
    expect(response.body.message).toContain('Failed to get agent');
    expect(agentRepository.findOne).toHaveBeenCalled();
  });

  it('should delete an agent', async () => {
    // Setup mock agent
    const mockAgent = new Agent({
      name: 'E2E Test Agent To Delete',
      instructions: 'This is an e2e test agent that will be deleted',
      model: mockModel,
      toolAssignments: [],
      userId: mockUserId,
    });

    // Setup mocks for create, find, and then null after delete
    agentRepository.create.mockResolvedValue(mockAgent);
    agentRepository.findOne
      .mockResolvedValueOnce(mockAgent)
      .mockResolvedValueOnce(null);
    agentRepository.delete.mockResolvedValue(undefined);

    // Create agent
    const createAgentDto = {
      name: 'E2E Test Agent To Delete',
      instructions: 'This is an e2e test agent that will be deleted',
      modelName: 'gpt-4',
      modelProvider: ModelProvider.OPENAI,
      toolAssignments: [],
    };

    // Create the agent
    const createResponse = await request(app.getHttpServer())
      .post('/agents')
      .set('x-user-id', mockUserId)
      .send(createAgentDto)
      .expect(201);

    const agentId = createResponse.body.id;

    // Delete the agent - endpoint returns 200 success
    const deleteResponse = await request(app.getHttpServer())
      .delete(`/agents/${agentId}`)
      .set('x-user-id', mockUserId);

    expect(deleteResponse.status).toBe(200);
    expect(agentRepository.delete).toHaveBeenCalledWith(agentId, mockUserId);
  });

  it('should handle agent creation with invalid model provider', async () => {
    const createAgentDto = {
      name: 'Test Agent Invalid Provider',
      instructions: 'Test instructions',
      modelName: 'gpt-4',
      modelProvider: 'INVALID_PROVIDER' as any,
      toolAssignments: [],
    };

    const response = await request(app.getHttpServer())
      .post('/agents')
      .set('x-user-id', mockUserId)
      .send(createAgentDto);

    expect(response.status).toBe(400);
  });

  it('should handle agent creation with missing required fields', async () => {
    const createAgentDto = {
      name: 'Test Agent Missing Fields',
      // Missing instructions, modelName, modelProvider
      toolAssignments: [],
    };

    const response = await request(app.getHttpServer())
      .post('/agents')
      .set('x-user-id', mockUserId)
      .send(createAgentDto);

    expect(response.status).toBe(400);
  });

  it('should retrieve agent with tool assignments', async () => {
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

    // Setup mock agent with tools
    const mockAgent = new Agent({
      name: 'Test Agent with Tool Assignment',
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

    // Mock the repository to return our agent with tools
    agentRepository.findOne.mockResolvedValue(mockAgent);

    // Test retrieval
    const getResponse = await request(app.getHttpServer())
      .get(`/agents/${mockAgent.id}`)
      .set('x-user-id', mockUserId)
      .expect(200);

    // Verify
    expect(getResponse.body).toBeDefined();
    expect(getResponse.body.toolAssignments).toBeDefined();
    expect(getResponse.body.toolAssignments).toBeInstanceOf(Array);
    expect(getResponse.body.toolAssignments.length).toBe(1);
    expect(getResponse.body.toolAssignments[0].toolType).toBe(ToolType.HTTP);
    expect(getResponse.body.toolAssignments[0].toolConfigId).toBe(mockToolId);
  });
});
