import { randomUUID } from 'crypto';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { PermittedImageGenerationModelNotFoundForOrgError } from 'src/domain/models/application/models.errors';
import { ToolAssemblyService } from './tool-assembly.service';
import { McpToolAssemblerService } from './mcp-tool-assembler.service';

describe('ToolAssemblyService — image generation tool assembly', () => {
  const mockOrgId = randomUUID();

  function createMockThread(): Thread {
    return new Thread({
      userId: randomUUID(),
      messages: [],
      mcpIntegrationIds: [],
      sourceAssignments: [],
    });
  }

  function createMockTool(type: ToolType) {
    return { type, name: type, description: `mock ${type}` };
  }

  /**
   * Build a ToolAssemblyService with mocked dependencies.
   * Constructor order (13 params):
   *  0 configService, 1 assembleToolsUseCase, 2 mcpToolAssembler,
   *  3 systemPromptBuilderService, 4 findActiveSkillsUseCase,
   *  5 getUserSystemPromptUseCase, 6 getOrgSystemPromptUseCase,
   *  7 findActiveAlwaysOnTemplatesUseCase,
   *  8 features, 9 contextService,
   *  10 getPermittedImageGenerationModelUseCase, 11 artifactToolAssembler,
   *  12 getOrgChatSettingsUseCase
   */
  async function buildService(overrides: {
    contextServiceGet?: jest.Mock;
    imageModelExecute?: jest.Mock;
    assembleToolExecute?: jest.Mock;
    internetSearchIsAvailable?: boolean;
    orgChatSettingsExecute?: jest.Mock;
    discoverMcpExecute?: jest.Mock;
    mcpIntegrationsExecute?: jest.Mock;
  }) {
    const configService = {
      get: jest
        .fn()
        .mockReturnValue(overrides.internetSearchIsAvailable ?? false),
    }; // internetSearch.isAvailable
    const assembleToolsUseCase = {
      execute:
        overrides.assembleToolExecute ??
        jest
          .fn()
          .mockImplementation((cmd: { type: ToolType }) =>
            Promise.resolve(createMockTool(cmd.type)),
          ),
    };
    const discoverMcpCapabilitiesUseCase = {
      execute: overrides.discoverMcpExecute ?? jest.fn(),
    };
    const systemPromptBuilderService = null;
    const findActiveSkillsUseCase = null;
    const getUserSystemPromptUseCase = null;
    const getOrgSystemPromptUseCase = null;
    const getMcpIntegrationsByIdsUseCase = {
      execute:
        overrides.mcpIntegrationsExecute ?? jest.fn().mockResolvedValue([]),
    };
    const findActiveAlwaysOnTemplatesUseCase = null;
    const features = { skillsEnabled: false };
    const contextService = {
      get: overrides.contextServiceGet ?? jest.fn().mockReturnValue(undefined),
    };
    const getPermittedImageGenerationModelUseCase = {
      execute: overrides.imageModelExecute ?? jest.fn().mockResolvedValue({}),
    };
    const artifactToolAssembler = {
      assembleDocumentAndDiagramTools: jest.fn().mockResolvedValue([]),
    };
    const getOrgChatSettingsUseCase = {
      execute:
        overrides.orgChatSettingsExecute ??
        jest.fn().mockResolvedValue({ internetSearchEnabled: true }),
    };

    const mcpToolAssembler = new (McpToolAssemblerService as any)(
      discoverMcpCapabilitiesUseCase,
      getMcpIntegrationsByIdsUseCase,
    );

    const service = new (ToolAssemblyService as any)(
      configService,
      assembleToolsUseCase,
      mcpToolAssembler,
      systemPromptBuilderService,
      findActiveSkillsUseCase,
      getUserSystemPromptUseCase,
      getOrgSystemPromptUseCase,
      findActiveAlwaysOnTemplatesUseCase,
      features,
      contextService,
      getPermittedImageGenerationModelUseCase,
      artifactToolAssembler,
      getOrgChatSettingsUseCase,
    );

    return {
      service,
      assembleToolsUseCase,
      getPermittedImageGenerationModelUseCase,
      contextService,
      getOrgChatSettingsUseCase,
    };
  }

  it('keeps MCP tools whose name only collides with a built-in after wire translation', async () => {
    const integrationId = randomUUID();
    const { service } = await buildService({
      contextServiceGet: jest.fn().mockReturnValue(mockOrgId),
      imageModelExecute: jest.fn().mockResolvedValue({}),
      // 'code.execution' sanitizes to 'code_execution' — the built-in's name
      discoverMcpExecute: jest.fn().mockResolvedValue({
        tools: [
          {
            name: 'code.execution',
            description: 'third-party tool',
            inputSchema: { type: 'object', properties: {} },
            integrationId,
          },
        ],
        resources: [],
        prompts: [],
        returnsPii: false,
      }),
      mcpIntegrationsExecute: jest
        .fn()
        .mockResolvedValue([{ id: integrationId, name: 'Nasty Integration' }]),
    });

    const thread = new Thread({
      userId: randomUUID(),
      messages: [],
      mcpIntegrationIds: [integrationId],
      sourceAssignments: [],
    });
    const tools = await service.assembleTools(thread, [], new Map());

    // Backend names are canonical: the built-in and the MCP tool coexist —
    // wire-level collision handling is the providers' job.
    const builtIn = tools.filter(
      (t: { name: string }) => t.name === 'code_execution',
    );
    expect(builtIn).toHaveLength(1);
    expect(builtIn[0].type).toBe(ToolType.CODE_EXECUTION);
    expect(
      tools.some((t: { name: string }) => t.name === 'code.execution'),
    ).toBe(true);
  });

  it('keeps only the first MCP tool when two share a name', async () => {
    const integrationId = randomUUID();
    const duplicateTool = (description: string) => ({
      name: 'notion.search',
      description,
      inputSchema: { type: 'object', properties: {} },
      integrationId,
    });
    const { service } = await buildService({
      contextServiceGet: jest.fn().mockReturnValue(mockOrgId),
      imageModelExecute: jest.fn().mockResolvedValue({}),
      discoverMcpExecute: jest.fn().mockResolvedValue({
        tools: [duplicateTool('first'), duplicateTool('second')],
        resources: [],
        prompts: [],
        returnsPii: false,
      }),
      mcpIntegrationsExecute: jest
        .fn()
        .mockResolvedValue([{ id: integrationId, name: 'Integration' }]),
    });

    const thread = new Thread({
      userId: randomUUID(),
      messages: [],
      mcpIntegrationIds: [integrationId],
      sourceAssignments: [],
    });
    const tools = await service.assembleTools(thread, [], new Map());

    const matches = tools.filter(
      (t: { name: string }) => t.name === 'notion.search',
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].description).toBe('first');
  });

  it('should include generate_image tool when org has a permitted image model', async () => {
    const { service } = await buildService({
      contextServiceGet: jest.fn().mockReturnValue(mockOrgId),
      imageModelExecute: jest.fn().mockResolvedValue({}),
    });

    const thread = createMockThread();
    const tools = await service.assembleTools(thread, undefined, [], new Map());

    const toolTypes = tools.map((t: { type: ToolType }) => t.type);
    expect(toolTypes).toContain(ToolType.GENERATE_IMAGE);
  });

  it('should exclude generate_image tool when no permitted image model exists', async () => {
    const { service } = await buildService({
      contextServiceGet: jest.fn().mockReturnValue(mockOrgId),
      imageModelExecute: jest
        .fn()
        .mockRejectedValue(
          new PermittedImageGenerationModelNotFoundForOrgError(mockOrgId),
        ),
    });

    const thread = createMockThread();
    const tools = await service.assembleTools(thread, undefined, [], new Map());

    const toolTypes = tools.map((t: { type: ToolType }) => t.type);
    expect(toolTypes).not.toContain(ToolType.GENERATE_IMAGE);
  });

  it('should log error and rethrow when unexpected error occurs', async () => {
    const unexpectedError = new Error('Database connection failed');
    const { service } = await buildService({
      contextServiceGet: jest.fn().mockReturnValue(mockOrgId),
      imageModelExecute: jest.fn().mockRejectedValue(unexpectedError),
    });

    const loggerSpy = jest.spyOn(service['logger'], 'error');

    const thread = createMockThread();

    await expect(
      service.assembleTools(thread, undefined, [], new Map()),
    ).rejects.toThrow(unexpectedError);

    expect(loggerSpy).toHaveBeenCalledWith(
      'Failed to check image generation model availability',
      expect.objectContaining({
        orgId: mockOrgId,
        error: 'Database connection failed',
      }),
    );
  });

  it('should skip image generation check when no orgId is available', async () => {
    const { service, getPermittedImageGenerationModelUseCase } =
      await buildService({
        contextServiceGet: jest.fn().mockReturnValue(undefined),
      });

    const thread = createMockThread();
    const tools = await service.assembleTools(thread, undefined, [], new Map());

    const toolTypes = tools.map((t: { type: ToolType }) => t.type);
    expect(toolTypes).not.toContain(ToolType.GENERATE_IMAGE);
    expect(
      getPermittedImageGenerationModelUseCase.execute,
    ).not.toHaveBeenCalled();
  });

  it('should include website content and internet search when internet access is enabled', async () => {
    const { service } = await buildService({
      contextServiceGet: jest.fn().mockReturnValue(mockOrgId),
      internetSearchIsAvailable: true,
      orgChatSettingsExecute: jest
        .fn()
        .mockResolvedValue({ internetSearchEnabled: true }),
    });

    const thread = createMockThread();
    const tools = await service.assembleTools(thread, undefined, new Map());

    const toolTypes = tools.map((t: { type: ToolType }) => t.type);
    expect(toolTypes).toContain(ToolType.WEBSITE_CONTENT);
    expect(toolTypes).toContain(ToolType.INTERNET_SEARCH);
  });

  it('should omit website content and internet search when internet access is disabled', async () => {
    const { service } = await buildService({
      contextServiceGet: jest.fn().mockReturnValue(mockOrgId),
      internetSearchIsAvailable: true,
      orgChatSettingsExecute: jest
        .fn()
        .mockResolvedValue({ internetSearchEnabled: false }),
    });

    const thread = createMockThread();
    const tools = await service.assembleTools(thread, undefined, new Map());

    const toolTypes = tools.map((t: { type: ToolType }) => t.type);
    expect(toolTypes).not.toContain(ToolType.WEBSITE_CONTENT);
    expect(toolTypes).not.toContain(ToolType.INTERNET_SEARCH);
  });
});
