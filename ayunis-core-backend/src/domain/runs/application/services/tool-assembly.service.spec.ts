import { randomUUID } from 'crypto';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { PermittedImageGenerationModelNotFoundForOrgError } from 'src/domain/models/application/models.errors';

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
   * Constructor order (12 params):
   *  0 configService, 1 assembleToolsUseCase, 2 discoverMcpCapabilitiesUseCase,
   *  3 systemPromptBuilderService, 4 findActiveSkillsUseCase,
   *  5 getUserSystemPromptUseCase, 6 getMcpIntegrationsByIdsUseCase,
   *  7 findActiveAlwaysOnTemplatesUseCase, 8 features,
   *  9 contextService, 10 getPermittedImageGenerationModelUseCase,
   *  11 artifactToolAssembler
   */
  async function buildService(overrides: {
    contextServiceGet?: jest.Mock;
    imageModelExecute?: jest.Mock;
    assembleToolExecute?: jest.Mock;
  }) {
    const mod = await import('./tool-assembly.service');

    const configService = { get: jest.fn().mockReturnValue(false) }; // internetSearch.isAvailable = false
    const assembleToolsUseCase = {
      execute:
        overrides.assembleToolExecute ??
        jest
          .fn()
          .mockImplementation((cmd: { type: ToolType }) =>
            Promise.resolve(createMockTool(cmd.type)),
          ),
    };
    const discoverMcpCapabilitiesUseCase = { execute: jest.fn() };
    const systemPromptBuilderService = null;
    const findActiveSkillsUseCase = null;
    const getUserSystemPromptUseCase = null;
    const getMcpIntegrationsByIdsUseCase = {
      execute: jest.fn().mockResolvedValue([]),
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
      assembleArtifactTools: jest.fn().mockResolvedValue([]),
    };

    const service = new (mod.ToolAssemblyService as any)(
      configService,
      assembleToolsUseCase,
      discoverMcpCapabilitiesUseCase,
      systemPromptBuilderService,
      findActiveSkillsUseCase,
      getUserSystemPromptUseCase,
      getMcpIntegrationsByIdsUseCase,
      findActiveAlwaysOnTemplatesUseCase,
      features,
      contextService,
      getPermittedImageGenerationModelUseCase,
      artifactToolAssembler,
    );

    return {
      service,
      assembleToolsUseCase,
      getPermittedImageGenerationModelUseCase,
      contextService,
    };
  }

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
});
