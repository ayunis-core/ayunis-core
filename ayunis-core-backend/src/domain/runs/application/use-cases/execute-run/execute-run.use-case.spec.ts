import { Test, TestingModule } from '@nestjs/testing';
import { ExecuteRunUseCase } from './execute-run.use-case';
import { DiscoverMcpCapabilitiesUseCase } from 'src/domain/mcp/application/use-cases/discover-mcp-capabilities/discover-mcp-capabilities.use-case';
import { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { ContextService } from 'src/common/context/services/context.service';
import { ConfigService } from '@nestjs/config';
import { CreateUserMessageUseCase } from 'src/domain/messages/application/use-cases/create-user-message/create-user-message.use-case';
import { CreateAssistantMessageUseCase } from 'src/domain/messages/application/use-cases/create-assistant-message/create-assistant-message.use-case';
import { SaveAssistantMessageUseCase } from 'src/domain/messages/application/use-cases/save-assistant-message/save-assistant-message.use-case';
import { CreateToolResultMessageUseCase } from 'src/domain/messages/application/use-cases/create-tool-result-message/create-tool-result-message.use-case';
import { DeleteMessageUseCase } from 'src/domain/messages/application/use-cases/delete-message/delete-message.use-case';
import { ExecuteToolUseCase } from 'src/domain/tools/application/use-cases/execute-tool/execute-tool.use-case';
import { CheckToolCapabilitiesUseCase } from 'src/domain/tools/application/use-cases/check-tool-capabilities/check-tool-capabilities.use-case';
import { GetInferenceUseCase } from 'src/domain/models/application/use-cases/get-inference/get-inference.use-case';
import { StreamInferenceUseCase } from 'src/domain/models/application/use-cases/stream-inference/stream-inference.use-case';
import { AddMessageToThreadUseCase } from 'src/domain/threads/application/use-cases/add-message-to-thread/add-message-to-thread.use-case';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { ExecuteMcpToolUseCase } from 'src/domain/mcp/application/use-cases/execute-mcp-tool/execute-mcp-tool.use-case';
import { RetrieveMcpResourceUseCase } from 'src/domain/mcp/application/use-cases/retrieve-mcp-resource/retrieve-mcp-resource.use-case';
import { GetMcpPromptUseCase } from 'src/domain/mcp/application/use-cases/get-mcp-prompt/get-mcp-prompt.use-case';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { Agent } from 'src/domain/agents/domain/agent.entity';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { McpTool as McpToolEntity } from 'src/domain/mcp/domain/mcp-tool.entity';
import { McpResource } from 'src/domain/mcp/domain/mcp-resource.entity';
import { McpPrompt } from 'src/domain/mcp/domain/mcp-prompt.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { randomUUID } from 'crypto';
import { LangfuseTraceClient } from 'langfuse';

describe('ExecuteRunUseCase - MCP Discovery Integration', () => {
  let useCase: ExecuteRunUseCase;
  let discoverMcpCapabilitiesUseCase: jest.Mocked<DiscoverMcpCapabilitiesUseCase>;
  let getMcpPromptUseCase: jest.Mocked<GetMcpPromptUseCase>;
  let retrieveMcpResourceUseCase: jest.Mocked<RetrieveMcpResourceUseCase>;
  let findThreadUseCase: jest.Mocked<FindThreadUseCase>;
  let contextService: jest.Mocked<ContextService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUserId = randomUUID();
  const mockOrgId = randomUUID();
  const mockThreadId = randomUUID();
  const mockIntegrationId1 = randomUUID();
  const mockIntegrationId2 = randomUUID();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecuteRunUseCase,
        {
          provide: CreateUserMessageUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: CreateAssistantMessageUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: SaveAssistantMessageUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: CreateToolResultMessageUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: DeleteMessageUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ExecuteToolUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: CheckToolCapabilitiesUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetInferenceUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: StreamInferenceUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: FindThreadUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: AddMessageToThreadUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: AssembleToolUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'app.isSelfHosted') return false;
              if (key === 'app.isCloudHosted') return true;
              return null;
            }),
          },
        },
        {
          provide: ContextService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'userId') return mockUserId;
              if (key === 'orgId') return mockOrgId;
              return null;
            }),
          },
        },
        {
          provide: ExecuteMcpToolUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: RetrieveMcpResourceUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetMcpPromptUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: DiscoverMcpCapabilitiesUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get<ExecuteRunUseCase>(ExecuteRunUseCase);
    discoverMcpCapabilitiesUseCase = module.get(DiscoverMcpCapabilitiesUseCase);
    getMcpPromptUseCase = module.get(GetMcpPromptUseCase);
    retrieveMcpResourceUseCase = module.get(RetrieveMcpResourceUseCase);
    findThreadUseCase = module.get(FindThreadUseCase);
    contextService = module.get(ContextService);
    configService = module.get(ConfigService);
  });

  describe('MCP Discovery', () => {
    it('should successfully discover capabilities from single integration', async () => {
      // Arrange
      const mockModel = {
        model: {
          name: 'gpt-4',
          canUseTools: true,
        } as LanguageModel,
      } as PermittedLanguageModel;

      const mockAgent = {
        id: randomUUID(),
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        mcpIntegrationIds: [mockIntegrationId1],
        tools: [],
        toolAssignments: [],
        sourceAssignments: [],
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Agent;

      const mockThread = {
        id: mockThreadId,
        title: 'Test Thread',
        agent: mockAgent,
        model: mockModel,
        messages: [],
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        getLastMessage: jest.fn(() => null),
      } as unknown as Thread;

      const mockDiscoveredTools = [
        new McpToolEntity(
          'slack_send_message',
          'Send a message to Slack',
          { type: 'object', properties: {} },
          mockIntegrationId1,
        ),
      ];

      const mockDiscoveredResources = [
        new McpResource(
          'slack://channel/general',
          'General Channel',
          'Access to general channel',
          'text/plain',
          mockIntegrationId1,
        ),
      ];

      const mockDiscoveredPrompts = [
        new McpPrompt('summarize', 'Summarize text', [], mockIntegrationId1),
      ];

      findThreadUseCase.execute.mockResolvedValue(mockThread);
      discoverMcpCapabilitiesUseCase.execute.mockResolvedValue({
        tools: mockDiscoveredTools,
        resources: mockDiscoveredResources,
        prompts: mockDiscoveredPrompts,
      });

      // Note: We can't fully test execute() as it returns an async generator
      // So we'll test the private discoverMcpCapabilitiesForAgent method indirectly
      // by verifying the use case was called with correct parameters

      // Act - call a method that triggers discovery
      const executeRunSpy = jest.spyOn(
        useCase as any,
        'discoverMcpCapabilitiesForAgent',
      );

      // Call the private method directly for testing
      const result = await (useCase as any).discoverMcpCapabilitiesForAgent(
        mockAgent,
      );

      // Assert
      expect(discoverMcpCapabilitiesUseCase.execute).toHaveBeenCalledTimes(1);
      expect(discoverMcpCapabilitiesUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          integrationId: mockIntegrationId1,
        }),
      );
      expect(result.tools).toHaveLength(1);
      expect(result.resources).toHaveLength(1);
      expect(result.prompts).toHaveLength(1);
    });

    it('should successfully discover capabilities from multiple integrations in parallel', async () => {
      // Arrange
      const mockAgent = {
        mcpIntegrationIds: [mockIntegrationId1, mockIntegrationId2],
      } as unknown as Agent;

      const mockTools1 = [
        new McpToolEntity(
          'tool1',
          'Tool 1',
          { type: 'object' },
          mockIntegrationId1,
        ),
      ];
      const mockTools2 = [
        new McpToolEntity(
          'tool2',
          'Tool 2',
          { type: 'object' },
          mockIntegrationId2,
        ),
      ];

      discoverMcpCapabilitiesUseCase.execute
        .mockResolvedValueOnce({
          tools: mockTools1,
          resources: [],
          prompts: [],
        })
        .mockResolvedValueOnce({
          tools: mockTools2,
          resources: [],
          prompts: [],
        });

      // Act
      const result = await (useCase as any).discoverMcpCapabilitiesForAgent(
        mockAgent,
      );

      // Assert
      expect(discoverMcpCapabilitiesUseCase.execute).toHaveBeenCalledTimes(2);
      expect(result.tools).toHaveLength(2);
    });

    it('should continue conversation when one integration fails discovery', async () => {
      // Arrange
      const mockAgent = {
        mcpIntegrationIds: [mockIntegrationId1, mockIntegrationId2],
      } as unknown as Agent;

      const mockTools = [
        new McpToolEntity(
          'tool1',
          'Tool 1',
          { type: 'object' },
          mockIntegrationId1,
        ),
      ];

      // First integration succeeds, second fails
      discoverMcpCapabilitiesUseCase.execute
        .mockResolvedValueOnce({
          tools: mockTools,
          resources: [],
          prompts: [],
        })
        .mockRejectedValueOnce(new Error('Integration 2 failed'));

      // Act
      const result = await (useCase as any).discoverMcpCapabilitiesForAgent(
        mockAgent,
      );

      // Assert
      expect(discoverMcpCapabilitiesUseCase.execute).toHaveBeenCalledTimes(2);
      expect(result.tools).toHaveLength(1); // Only tools from successful integration
    });

    it('should continue conversation when all integrations fail discovery', async () => {
      // Arrange
      const mockAgent = {
        mcpIntegrationIds: [mockIntegrationId1, mockIntegrationId2],
      } as unknown as Agent;

      discoverMcpCapabilitiesUseCase.execute
        .mockRejectedValueOnce(new Error('Integration 1 failed'))
        .mockRejectedValueOnce(new Error('Integration 2 failed'));

      // Act
      const result = await (useCase as any).discoverMcpCapabilitiesForAgent(
        mockAgent,
      );

      // Assert
      expect(discoverMcpCapabilitiesUseCase.execute).toHaveBeenCalledTimes(2);
      expect(result.tools).toHaveLength(0);
      expect(result.resources).toHaveLength(0);
      expect(result.prompts).toHaveLength(0);
    });

    it('should handle agent with no MCP integrations (skips discovery)', async () => {
      // Arrange
      const mockAgent = {
        mcpIntegrationIds: [],
      } as unknown as Agent;

      // Act
      const result = await (useCase as any).discoverMcpCapabilitiesForAgent(
        mockAgent,
      );

      // Assert
      expect(discoverMcpCapabilitiesUseCase.execute).not.toHaveBeenCalled();
      expect(result.tools).toHaveLength(0);
      expect(result.resources).toHaveLength(0);
      expect(result.prompts).toHaveLength(0);
    });

    it('should handle agent with empty mcpIntegrationIds array (skips discovery)', async () => {
      // Arrange
      const mockAgent = {
        mcpIntegrationIds: [],
      } as unknown as Agent;

      // Act
      const result = await (useCase as any).discoverMcpCapabilitiesForAgent(
        mockAgent,
      );

      // Assert
      expect(discoverMcpCapabilitiesUseCase.execute).not.toHaveBeenCalled();
      expect(result.tools).toHaveLength(0);
    });

    it('should handle null agent (skips discovery)', async () => {
      // Act
      const result = await (useCase as any).discoverMcpCapabilitiesForAgent(
        null,
      );

      // Assert
      expect(discoverMcpCapabilitiesUseCase.execute).not.toHaveBeenCalled();
      expect(result.tools).toHaveLength(0);
    });
  });

  describe('MCP Tool Conversion', () => {
    it('should convert MCP tools to Tool entities correctly', () => {
      // Arrange
      const mockMcpTools = [
        new McpToolEntity(
          'slack_send_message',
          'Send a message to Slack',
          {
            type: 'object',
            properties: {
              channel: { type: 'string' },
              message: { type: 'string' },
            },
            required: ['channel', 'message'],
          },
          mockIntegrationId1,
        ),
        new McpToolEntity(
          'github_create_issue',
          'Create a GitHub issue',
          {
            type: 'object',
            properties: {
              title: { type: 'string' },
              body: { type: 'string' },
            },
            required: ['title'],
          },
          mockIntegrationId2,
        ),
      ];

      // Act
      const result = (useCase as any).convertMcpToolsToTools(mockMcpTools);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('slack_send_message');
      expect(result[0].description).toBe('Send a message to Slack');
      expect(result[0].type).toBe('mcp_tool');
      expect(result[1].name).toBe('github_create_issue');
      expect(result[1].description).toBe('Create a GitHub issue');
      expect(result[1].type).toBe('mcp_tool');
    });

    it('should handle MCP tools without descriptions', () => {
      // Arrange
      const mockMcpTools = [
        new McpToolEntity(
          'test_tool',
          undefined,
          { type: 'object', properties: {} },
          mockIntegrationId1,
        ),
      ];

      // Act
      const result = (useCase as any).convertMcpToolsToTools(mockMcpTools);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].description).toBe('');
    });

    it('should handle empty MCP tools array', () => {
      // Arrange
      const mockMcpTools: McpToolEntity[] = [];

      // Act
      const result = (useCase as any).convertMcpToolsToTools(mockMcpTools);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('Tool Assembly with MCP Tools', () => {
    it('should merge native and MCP tools without duplicates', async () => {
      // Arrange
      const mockMcpTool = {
        name: 'slack_send_message',
        description: 'Send a message',
        parameters: { type: 'object', properties: {} },
        type: 'mcp_tool',
        integrationId: mockIntegrationId1,
        validateParams: jest.fn(),
      };

      const mockNativeTool = {
        name: 'http_tool',
        description: 'Make HTTP request',
        parameters: { type: 'object', properties: {} },
        type: 'http',
        validateParams: jest.fn(),
      };

      const mockAgent = {
        tools: [mockNativeTool],
        sourceAssignments: [],
      };

      const mockThread = {
        agent: mockAgent,
        sourceAssignments: [],
      } as unknown as Thread;

      // Act
      const result = await (useCase as any).assembleTools(mockThread, [
        mockMcpTool,
      ]);

      // Assert
      expect(result).toContainEqual(mockNativeTool);
      expect(result).toContainEqual(mockMcpTool);
      // Should also include system tools (code execution, website content, etc.)
      expect(result.length).toBeGreaterThan(2);
    });
  });

  describe('MCP Prompt Retrieval', () => {
    let mockTrace: jest.Mocked<LangfuseTraceClient>;

    beforeEach(() => {
      mockTrace = {
        span: jest.fn().mockReturnValue({
          end: jest.fn(),
          update: jest.fn(),
        }),
      } as any;
    });

    it('should successfully retrieve prompt with arguments and return formatted result', async () => {
      // Arrange
      const toolUseContent = new ToolUseMessageContent(
        'test-tool-use-id',
        'retrieve_mcp_prompt',
        {
          integrationId: mockIntegrationId1,
          promptName: 'customer_support',
          arguments: { topic: 'billing', name: 'John' },
        },
      );

      const mockPromptResult = {
        messages: [
          { role: 'system', content: 'You are a helpful support agent.' },
          { role: 'user', content: 'I need help with billing.' },
          { role: 'assistant', content: 'I can help you with that, John.' },
        ],
        description: 'Customer support template',
      };

      getMcpPromptUseCase.execute.mockResolvedValue(mockPromptResult);

      // Act
      const result = await (useCase as any).executeMcpPromptRetrieval(
        toolUseContent,
        mockTrace,
      );

      // Assert
      expect(getMcpPromptUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          integrationId: mockIntegrationId1,
          promptName: 'customer_support',
          args: { topic: 'billing', name: 'John' },
        }),
      );
      expect(result.toolUseId).toBe('test-tool-use-id');
      expect(result.toolName).toBe('retrieve_mcp_prompt');
      expect(result.result).toContain('Prompt: customer_support');
      expect(result.result).toContain('Description: Customer support template');
      expect(result.result).toContain(
        '1. System: You are a helpful support agent.',
      );
      expect(result.result).toContain('2. User: I need help with billing.');
      expect(result.result).toContain(
        '3. Assistant: I can help you with that, John.',
      );
    });

    it('should successfully retrieve prompt without arguments', async () => {
      // Arrange
      const toolUseContent = new ToolUseMessageContent(
        'test-tool-use-id',
        'retrieve_mcp_prompt',
        {
          integrationId: mockIntegrationId1,
          promptName: 'greeting',
        },
      );

      const mockPromptResult = {
        messages: [{ role: 'system', content: 'Be friendly.' }],
        description: 'Simple greeting',
      };

      getMcpPromptUseCase.execute.mockResolvedValue(mockPromptResult);

      // Act
      const result = await (useCase as any).executeMcpPromptRetrieval(
        toolUseContent,
        mockTrace,
      );

      // Assert
      expect(getMcpPromptUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          integrationId: mockIntegrationId1,
          promptName: 'greeting',
          args: undefined,
        }),
      );
      expect(result.result).toContain('Prompt: greeting');
      expect(result.result).toContain('Description: Simple greeting');
      expect(result.result).toContain('1. System: Be friendly.');
    });

    it('should return error to LLM when prompt retrieval fails', async () => {
      // Arrange
      const toolUseContent = new ToolUseMessageContent(
        'test-tool-use-id',
        'retrieve_mcp_prompt',
        {
          integrationId: mockIntegrationId1,
          promptName: 'nonexistent',
        },
      );

      getMcpPromptUseCase.execute.mockRejectedValue(
        new Error('Prompt not found'),
      );

      // Act
      const result = await (useCase as any).executeMcpPromptRetrieval(
        toolUseContent,
        mockTrace,
      );

      // Assert
      expect(result.toolUseId).toBe('test-tool-use-id');
      expect(result.toolName).toBe('retrieve_mcp_prompt');
      expect(result.result).toBe('Prompt retrieval failed: Prompt not found');
    });

    it('should return error when integration ID missing from parameters', async () => {
      // Arrange
      const toolUseContent = new ToolUseMessageContent(
        'test-tool-use-id',
        'retrieve_mcp_prompt',
        {
          promptName: 'greeting',
        },
      );

      // Act
      const result = await (useCase as any).executeMcpPromptRetrieval(
        toolUseContent,
        mockTrace,
      );

      // Assert
      expect(getMcpPromptUseCase.execute).not.toHaveBeenCalled();
      expect(result.result).toBe(
        'Prompt retrieval failed: integrationId parameter is required',
      );
    });

    it('should return error when prompt name missing from parameters', async () => {
      // Arrange
      const toolUseContent = new ToolUseMessageContent(
        'test-tool-use-id',
        'retrieve_mcp_prompt',
        {
          integrationId: mockIntegrationId1,
        },
      );

      // Act
      const result = await (useCase as any).executeMcpPromptRetrieval(
        toolUseContent,
        mockTrace,
      );

      // Assert
      expect(getMcpPromptUseCase.execute).not.toHaveBeenCalled();
      expect(result.result).toBe(
        'Prompt retrieval failed: promptName parameter is required',
      );
    });

    it('should format prompt messages correctly with role labels', async () => {
      // Arrange
      const promptResult = {
        messages: [
          { role: 'system', content: 'System message' },
          { role: 'user', content: 'User message' },
          { role: 'assistant', content: 'Assistant message' },
        ],
        description: 'Test prompt',
      };

      // Act
      const result = (useCase as any).formatPromptResult(
        promptResult,
        'test_prompt',
      );

      // Assert
      expect(result).toContain('Prompt: test_prompt');
      expect(result).toContain('Description: Test prompt');
      expect(result).toContain('1. System: System message');
      expect(result).toContain('2. User: User message');
      expect(result).toContain('3. Assistant: Assistant message');
    });

    it('should create MCP prompt retrieval tool when agent has MCP integrations', async () => {
      // Arrange
      const mockAgent = {
        mcpIntegrationIds: [mockIntegrationId1],
        tools: [],
        sourceAssignments: [],
      } as unknown as Agent;

      const mockThread = {
        agent: mockAgent,
        sourceAssignments: [],
      } as unknown as Thread;

      // Act
      const result = await (useCase as any).assembleTools(mockThread, []);

      // Assert
      const promptRetrievalTool = result.find(
        (tool: Tool) => tool.name === 'retrieve_mcp_prompt',
      );
      expect(promptRetrievalTool).toBeDefined();
      expect(promptRetrievalTool.type).toBe(ToolType.MCP_PROMPT);
      expect(promptRetrievalTool.description).toContain(
        'Retrieve a prompt template from an MCP integration',
      );
    });

    it('should not create MCP prompt retrieval tool when agent has no MCP integrations', async () => {
      // Arrange
      const mockAgent = {
        mcpIntegrationIds: [],
        tools: [],
        sourceAssignments: [],
      } as unknown as Agent;

      const mockThread = {
        agent: mockAgent,
        sourceAssignments: [],
      } as unknown as Thread;

      // Act
      const result = await (useCase as any).assembleTools(mockThread, []);

      // Assert
      const promptRetrievalTool = result.find(
        (tool: Tool) => tool.name === 'retrieve_mcp_prompt',
      );
      expect(promptRetrievalTool).toBeUndefined();
    });

    it('should validate tool parameters (promptName and integrationId required)', () => {
      // Arrange
      const mockAgent = {
        mcpIntegrationIds: [mockIntegrationId1],
      } as unknown as Agent;

      // Act
      const tool = (useCase as any).createMcpPromptRetrievalTool();

      // Assert
      expect(tool.parameters.required).toContain('integrationId');
      expect(tool.parameters.required).toContain('promptName');
      expect(tool.parameters.properties.integrationId).toBeDefined();
      expect(tool.parameters.properties.promptName).toBeDefined();
      expect(tool.parameters.properties.arguments).toBeDefined();
      expect(tool.parameters.properties.arguments.description).toContain(
        'Optional arguments',
      );
    });
  });

  describe('MCP Resource Retrieval', () => {
    let mockTrace: jest.Mocked<LangfuseTraceClient>;

    beforeEach(() => {
      mockTrace = {
        span: jest.fn().mockReturnValue({
          end: jest.fn(),
          update: jest.fn(),
        }),
      } as any;
    });

    it('should create MCP resource retrieval tool when agent has MCP integrations', () => {
      // Act
      const tool = (useCase as any).createMcpResourceRetrievalTool();

      // Assert
      expect(tool.name).toBe('retrieve_mcp_resource');
      expect(tool.type).toBe(ToolType.MCP_RESOURCE);
      expect(tool.description).toContain(
        'CSV resources are automatically imported as data sources',
      );
      expect(tool.parameters.required).toEqual([
        'integrationId',
        'resourceUri',
      ]);
      expect(tool.parameters.properties.integrationId).toBeDefined();
      expect(tool.parameters.properties.resourceUri).toBeDefined();
      expect(tool.parameters.properties.parameters).toBeDefined();
    });

    it('should successfully retrieve CSV resource and return success message', async () => {
      // Arrange
      const toolUseContent = new ToolUseMessageContent(
        'tool-use-123',
        'retrieve_mcp_resource',
        {
          integrationId: mockIntegrationId1,
          resourceUri: 'dataset://sales',
          parameters: { category: 'electronics' },
        },
      );

      const mockThread = {
        id: mockThreadId,
      } as unknown as Thread;

      retrieveMcpResourceUseCase.execute.mockResolvedValue(undefined);

      // Act
      const result = await (useCase as any).executeMcpResourceRetrieval(
        toolUseContent,
        mockTrace,
        mockThread,
      );

      // Assert
      expect(retrieveMcpResourceUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          integrationId: mockIntegrationId1,
          resourceUri: 'dataset://sales',
          parameters: { category: 'electronics' },
        }),
      );
      expect(result.toolUseId).toBe('tool-use-123');
      expect(result.toolName).toBe('retrieve_mcp_resource');
      expect(result.result).toContain(
        'CSV resource imported as data source: dataset://sales',
      );
      expect(result.result).toContain(
        'You can now query this data using the source_query tool',
      );
    });

    it('should handle parameterized resource URIs correctly', async () => {
      // Arrange
      const toolUseContent = new ToolUseMessageContent(
        'tool-use-456',
        'retrieve_mcp_resource',
        {
          integrationId: mockIntegrationId1,
          resourceUri: 'dataset://filtered-sales',
          parameters: {
            category: 'electronics',
            year: 2024,
            region: 'EU',
          },
        },
      );

      const mockThread = {
        id: mockThreadId,
      } as unknown as Thread;

      retrieveMcpResourceUseCase.execute.mockResolvedValue(undefined);

      // Act
      const result = await (useCase as any).executeMcpResourceRetrieval(
        toolUseContent,
        mockTrace,
        mockThread,
      );

      // Assert
      expect(retrieveMcpResourceUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          integrationId: mockIntegrationId1,
          resourceUri: 'dataset://filtered-sales',
          parameters: {
            category: 'electronics',
            year: 2024,
            region: 'EU',
          },
        }),
      );
      expect(result.result).toContain('CSV resource imported as data source');
    });

    it('should return error to LLM when resource retrieval fails', async () => {
      // Arrange
      const toolUseContent = new ToolUseMessageContent(
        'tool-use-789',
        'retrieve_mcp_resource',
        {
          integrationId: mockIntegrationId1,
          resourceUri: 'dataset://nonexistent',
        },
      );

      const mockThread = {
        id: mockThreadId,
      } as unknown as Thread;

      retrieveMcpResourceUseCase.execute.mockRejectedValue(
        new Error('Resource not found'),
      );

      // Act
      const result = await (useCase as any).executeMcpResourceRetrieval(
        toolUseContent,
        mockTrace,
        mockThread,
      );

      // Assert
      expect(result.toolUseId).toBe('tool-use-789');
      expect(result.toolName).toBe('retrieve_mcp_resource');
      expect(result.result).toBe(
        'Resource retrieval failed: Resource not found',
      );
    });

    it('should return error when integrationId parameter is missing', async () => {
      // Arrange
      const toolUseContent = new ToolUseMessageContent(
        'tool-use-missing-id',
        'retrieve_mcp_resource',
        {
          resourceUri: 'dataset://sales',
        },
      );

      const mockThread = {
        id: mockThreadId,
      } as unknown as Thread;

      // Act
      const result = await (useCase as any).executeMcpResourceRetrieval(
        toolUseContent,
        mockTrace,
        mockThread,
      );

      // Assert
      expect(retrieveMcpResourceUseCase.execute).not.toHaveBeenCalled();
      expect(result.result).toBe(
        'Resource retrieval failed: integrationId parameter is required',
      );
    });

    it('should return error when resourceUri parameter is missing', async () => {
      // Arrange
      const toolUseContent = new ToolUseMessageContent(
        'tool-use-missing-uri',
        'retrieve_mcp_resource',
        {
          integrationId: mockIntegrationId1,
        },
      );

      const mockThread = {
        id: mockThreadId,
      } as unknown as Thread;

      // Act
      const result = await (useCase as any).executeMcpResourceRetrieval(
        toolUseContent,
        mockTrace,
        mockThread,
      );

      // Assert
      expect(retrieveMcpResourceUseCase.execute).not.toHaveBeenCalled();
      expect(result.result).toBe(
        'Resource retrieval failed: resourceUri parameter is required',
      );
    });

    it('should include MCP resource retrieval tool in assembled tools when agent has integrations', async () => {
      // Arrange
      const mockAgent = {
        mcpIntegrationIds: [mockIntegrationId1],
        tools: [],
        sourceAssignments: [],
      };

      const mockThread = {
        agent: mockAgent,
        sourceAssignments: [],
      } as unknown as Thread;

      // Act
      const result = await (useCase as any).assembleTools(mockThread, []);

      // Assert
      const resourceRetrievalTool = result.find(
        (tool: Tool) => tool.name === 'retrieve_mcp_resource',
      );
      expect(resourceRetrievalTool).toBeDefined();
      expect(resourceRetrievalTool?.type).toBe(ToolType.MCP_RESOURCE);
    });

    it('should not include MCP resource retrieval tool when agent has no integrations', async () => {
      // Arrange
      const mockAgent = {
        mcpIntegrationIds: [],
        tools: [],
        sourceAssignments: [],
      };

      const mockThread = {
        agent: mockAgent,
        sourceAssignments: [],
      } as unknown as Thread;

      // Act
      const result = await (useCase as any).assembleTools(mockThread, []);

      // Assert
      const resourceRetrievalTool = result.find(
        (tool: Tool) => tool.name === 'retrieve_mcp_resource',
      );
      expect(resourceRetrievalTool).toBeUndefined();
    });

    it('should log resource retrieval with correct metadata', async () => {
      // Arrange
      const toolUseContent = new ToolUseMessageContent(
        'tool-use-log-test',
        'retrieve_mcp_resource',
        {
          integrationId: mockIntegrationId1,
          resourceUri: 'dataset://logs',
          parameters: { level: 'error' },
        },
      );

      const mockThread = {
        id: mockThreadId,
      } as unknown as Thread;

      retrieveMcpResourceUseCase.execute.mockResolvedValue(undefined);

      const loggerSpy = jest.spyOn(useCase['logger'], 'log');

      // Act
      await (useCase as any).executeMcpResourceRetrieval(
        toolUseContent,
        mockTrace,
        mockThread,
      );

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        'Retrieving MCP resource',
        expect.objectContaining({
          integrationId: mockIntegrationId1,
          resourceUri: 'dataset://logs',
          hasParameters: true,
        }),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        'MCP resource retrieval succeeded',
        expect.objectContaining({
          integrationId: mockIntegrationId1,
          resourceUri: 'dataset://logs',
        }),
      );
    });

    it('should create span trace for resource retrieval with correct metadata', async () => {
      // Arrange
      const toolUseContent = new ToolUseMessageContent(
        'tool-use-trace-test',
        'retrieve_mcp_resource',
        {
          integrationId: mockIntegrationId1,
          resourceUri: 'dataset://trace-test',
        },
      );

      const mockThread = {
        id: mockThreadId,
      } as unknown as Thread;

      retrieveMcpResourceUseCase.execute.mockResolvedValue(undefined);

      // Act
      await (useCase as any).executeMcpResourceRetrieval(
        toolUseContent,
        mockTrace,
        mockThread,
      );

      // Assert
      expect(mockTrace.span).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'mcp_resource_retrieval',
          input: {
            integrationId: mockIntegrationId1,
            resourceUri: 'dataset://trace-test',
            parameters: undefined,
          },
          metadata: expect.objectContaining({
            integrationId: mockIntegrationId1,
            resourceUri: 'dataset://trace-test',
            operationType: 'resource_retrieval',
          }),
        }),
      );
    });

    it('should validate tool parameters (resourceUri and integrationId required)', () => {
      // Act
      const tool = (useCase as any).createMcpResourceRetrievalTool();

      // Assert
      expect(tool.parameters.required).toContain('integrationId');
      expect(tool.parameters.required).toContain('resourceUri');
      expect(tool.parameters.properties.integrationId).toBeDefined();
      expect(tool.parameters.properties.resourceUri).toBeDefined();
      expect(tool.parameters.properties.parameters).toBeDefined();
      expect(tool.parameters.properties.parameters.description).toContain(
        'Optional parameters',
      );
    });
  });
});
