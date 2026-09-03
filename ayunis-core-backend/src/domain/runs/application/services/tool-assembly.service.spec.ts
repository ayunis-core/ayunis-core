import { randomUUID } from 'crypto';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { SourceAssignment } from 'src/domain/threads/domain/thread-source-assignment.entity';
import { CSVDataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { PermittedImageGenerationModelNotFoundForOrgError } from 'src/domain/models/application/models.errors';
import { ToolAssemblyService } from './tool-assembly.service';
import { McpToolAssemblerService } from './mcp-tool-assembler.service';
import { Skill } from 'src/domain/skills/domain/skill.entity';

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
    systemPromptBuild?: jest.Mock;
    alwaysOnTemplatesExecute?: jest.Mock;
    skillsEnabled?: boolean;
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
    const systemPromptBuilderService = {
      build: overrides.systemPromptBuild ?? jest.fn().mockReturnValue('prompt'),
    };
    const findActiveSkillsUseCase = null;
    const getUserSystemPromptUseCase = {
      execute: jest.fn().mockResolvedValue(null),
    };
    const getOrgSystemPromptUseCase = {
      execute: jest.fn().mockResolvedValue(null),
    };
    const getMcpIntegrationsByIdsUseCase = {
      execute:
        overrides.mcpIntegrationsExecute ?? jest.fn().mockResolvedValue([]),
    };
    const findActiveAlwaysOnTemplatesUseCase = {
      execute:
        overrides.alwaysOnTemplatesExecute ?? jest.fn().mockResolvedValue([]),
    };
    const features = { skillsEnabled: overrides.skillsEnabled ?? false };
    const contextService = {
      get: overrides.contextServiceGet ?? jest.fn().mockReturnValue(undefined),
    };
    const getPermittedImageGenerationModelUseCase = {
      execute: overrides.imageModelExecute ?? jest.fn().mockResolvedValue({}),
    };
    const artifactToolAssembler = {
      assembleArtifactTools: jest.fn().mockResolvedValue([]),
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
    const tools = await service.assembleTools(thread, new Map());

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
    const tools = await service.assembleTools(thread, new Map());

    const matches = tools.filter(
      (t: { name: string }) => t.name === 'notion.search',
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].description).toBe('first');
  });

  it('should temporarily exclude the map tool from runtime assembly', async () => {
    const { service } = await buildService({
      contextServiceGet: jest.fn().mockReturnValue(mockOrgId),
      imageModelExecute: jest.fn().mockResolvedValue({}),
    });

    const tools = await service.assembleTools(
      createMockThread(),
      [],
      new Map(),
    );

    expect(tools.map((tool: { type: ToolType }) => tool.type)).not.toContain(
      ToolType.MAP,
    );
  });

  it('should include generate_image tool when org has a permitted image model', async () => {
    const { service } = await buildService({
      contextServiceGet: jest.fn().mockReturnValue(mockOrgId),
      imageModelExecute: jest.fn().mockResolvedValue({}),
    });

    const thread = createMockThread();
    const tools = await service.assembleTools(thread, new Map());

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
    const tools = await service.assembleTools(thread, new Map());

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

    await expect(service.assembleTools(thread, new Map())).rejects.toThrow(
      unexpectedError,
    );

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: mockOrgId,
        error: 'Database connection failed',
      }),
      'Failed to check image generation model availability',
    );
  });

  it('should skip image generation check when no orgId is available', async () => {
    const { service, getPermittedImageGenerationModelUseCase } =
      await buildService({
        contextServiceGet: jest.fn().mockReturnValue(undefined),
      });

    const thread = createMockThread();
    const tools = await service.assembleTools(thread, new Map());

    const toolTypes = tools.map((t: { type: ToolType }) => t.type);
    expect(toolTypes).not.toContain(ToolType.GENERATE_IMAGE);
    expect(
      getPermittedImageGenerationModelUseCase.execute,
    ).not.toHaveBeenCalled();
  });

  it('passes only READY data sources to the code execution tool', async () => {
    const { service, assembleToolsUseCase } = await buildService({
      contextServiceGet: jest.fn().mockReturnValue(mockOrgId),
      imageModelExecute: jest.fn().mockResolvedValue({}),
    });

    const csvSource = (status: SourceStatus) =>
      new CSVDataSource({
        name: `${status}.csv`,
        data: { headers: [], rows: [] },
        status,
      });
    const readySource = csvSource(SourceStatus.READY);
    const thread = new Thread({
      userId: randomUUID(),
      messages: [],
      mcpIntegrationIds: [],
      sourceAssignments: [
        readySource,
        csvSource(SourceStatus.PROCESSING),
        csvSource(SourceStatus.FAILED),
      ].map((source) => new SourceAssignment({ source })),
    });

    await service.assembleTools(thread, new Map());

    const codeExecutionCall = assembleToolsUseCase.execute.mock.calls.find(
      ([cmd]: [{ type: ToolType }]) => cmd.type === ToolType.CODE_EXECUTION,
    );
    expect(codeExecutionCall).toBeDefined();
    expect(codeExecutionCall[0].context).toEqual([readySource]);
  });

  it('excludes project skills from activatable skills', async () => {
    const projectSkill = new Skill({
      id: randomUUID(),
      name: 'Project Skill',
      shortDescription: 'Assigned to the project',
      instructions: 'Use project context',
      userId: randomUUID(),
    });
    const activeSkill = new Skill({
      id: randomUUID(),
      name: 'User Skill',
      shortDescription: 'Activated by the user',
      instructions: 'Use user context',
      userId: randomUUID(),
    });
    const systemPromptBuild = jest.fn().mockReturnValue('prompt');
    const { service, assembleToolsUseCase } = await buildService({
      contextServiceGet: jest.fn().mockReturnValue(undefined),
      systemPromptBuild,
      skillsEnabled: true,
    });

    const result = await service.buildRunContext(
      createMockThread(),
      [projectSkill, activeSkill],
      true,
      false,
      {
        instruction: null,
        skills: [projectSkill],
        knowledgeBases: [],
        runtimeSources: [],
        runtimeKnowledgeBases: [],
        mcpIntegrationIds: [],
      },
    );

    expect(result.instructions).toBe('prompt');
    expect(systemPromptBuild).toHaveBeenCalledWith(
      expect.objectContaining({
        skills: [
          { slug: 'user__user-skill', description: 'Activated by the user' },
        ],
        projectSkills: [projectSkill],
      }),
    );

    const editSkillCall = assembleToolsUseCase.execute.mock.calls.find(
      ([command]: [{ type: ToolType }]) => command.type === ToolType.EDIT_SKILL,
    );
    expect(editSkillCall?.[0].context).toEqual(
      expect.arrayContaining(['user__project-skill', 'user__user-skill']),
    );
  });

  it('does not apply project skills when the skills feature is disabled', async () => {
    const projectSkill = new Skill({
      id: randomUUID(),
      name: 'Project Skill',
      shortDescription: 'Assigned to the project',
      instructions: 'Use project context',
      userId: randomUUID(),
    });
    const systemPromptBuild = jest.fn().mockReturnValue('prompt');
    const discoverMcpExecute = jest.fn();
    const { service } = await buildService({
      systemPromptBuild,
      discoverMcpExecute,
      skillsEnabled: false,
    });

    await service.buildRunContext(createMockThread(), [], true, false, {
      instruction: null,
      skills: [projectSkill],
      knowledgeBases: [],
      sources: [],
      runtimeSources: [],
      runtimeKnowledgeBases: [],
      mcpIntegrationIds: [randomUUID()],
    });

    expect(systemPromptBuild).toHaveBeenCalledWith(
      expect.objectContaining({ projectSkills: [] }),
    );
    expect(discoverMcpExecute).not.toHaveBeenCalled();
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
    const tools = await service.assembleTools(thread, new Map());

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
    const tools = await service.assembleTools(thread, new Map());

    const toolTypes = tools.map((t: { type: ToolType }) => t.type);
    expect(toolTypes).not.toContain(ToolType.WEBSITE_CONTENT);
    expect(toolTypes).not.toContain(ToolType.INTERNET_SEARCH);
  });
});
