import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { Letterhead } from 'src/domain/letterheads/domain/letterhead.entity';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { PermittedImageGenerationModelNotFoundForOrgError } from 'src/domain/models/application/models.errors';
import { buildLetterheadSuffix } from './letterhead-suffix.helper';

/**
 * Tests for the letterhead suffix logic extracted to letterhead-suffix.helper.ts.
 */
describe('buildLetterheadSuffix', () => {
  const mockOrgId = randomUUID();

  function createLetterhead(overrides?: {
    name?: string;
    description?: string | null;
    id?: UUID;
  }): Letterhead {
    return new Letterhead({
      id: overrides?.id ?? randomUUID(),
      orgId: mockOrgId,
      name: overrides?.name ?? 'Stadt Musterstadt',
      description:
        overrides?.description !== undefined
          ? overrides.description
          : 'Offizielles Briefpapier',
      firstPageStoragePath: `letterheads/${mockOrgId}/first.pdf`,
      firstPageMargins: { top: 55, bottom: 20, left: 20, right: 20 },
      continuationPageMargins: { top: 20, bottom: 20, left: 20, right: 20 },
    });
  }

  it('should return empty string when no letterheads exist', () => {
    const result = buildLetterheadSuffix([]);
    expect(result).toBe('');
  });

  it('should include letterhead name and description in suffix', () => {
    const letterhead = createLetterhead({
      name: 'Gemeinde Testdorf',
      description: 'Für formelle Schreiben',
    });

    const result = buildLetterheadSuffix([letterhead]);

    expect(result).toContain('Gemeinde Testdorf');
    expect(result).toContain('Für formelle Schreiben');
    expect(result).toContain(letterhead.id);
    expect(result).toContain('letterhead_id');
  });

  it('should handle letterhead without description', () => {
    const letterhead = createLetterhead({
      name: 'Einfaches Briefpapier',
      description: null,
    });

    const result = buildLetterheadSuffix([letterhead]);

    expect(result).toContain('Einfaches Briefpapier');
    expect(result).not.toContain(' — ');
  });

  it('should list multiple letterheads', () => {
    const letterheads = [
      createLetterhead({ name: 'Briefpapier A' }),
      createLetterhead({ name: 'Briefpapier B' }),
    ];

    const result = buildLetterheadSuffix(letterheads);

    expect(result).toContain('Briefpapier A');
    expect(result).toContain('Briefpapier B');
    expect(result).toContain('Available letterheads (Briefpapier)');
  });
});

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
   * Constructor order (14 params):
   *  0 configService, 1 assembleToolsUseCase, 2 discoverMcpCapabilitiesUseCase,
   *  3 systemPromptBuilderService, 4 findActiveSkillsUseCase,
   *  5 getUserSystemPromptUseCase, 6 getMcpIntegrationsByIdsUseCase,
   *  7 findActiveAlwaysOnTemplatesUseCase, 8 features,
   *  9 findArtifactsByThreadUseCase, 10 findArtifactWithVersionsUseCase,
   *  11 findAllLetterheadsUseCase, 12 contextService,
   *  13 getPermittedImageGenerationModelUseCase
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
    const findArtifactsByThreadUseCase = {
      execute: jest.fn().mockResolvedValue([]),
    };
    const findArtifactWithVersionsUseCase = null;
    const findAllLetterheadsUseCase = {
      execute: jest.fn().mockResolvedValue([]),
    };
    const contextService = {
      get: overrides.contextServiceGet ?? jest.fn().mockReturnValue(undefined),
    };
    const getPermittedImageGenerationModelUseCase = {
      execute: overrides.imageModelExecute ?? jest.fn().mockResolvedValue({}),
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
      findArtifactsByThreadUseCase,
      findArtifactWithVersionsUseCase,
      findAllLetterheadsUseCase,
      contextService,
      getPermittedImageGenerationModelUseCase,
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

  it('should log warning and exclude tool when unexpected error occurs', async () => {
    const { service } = await buildService({
      contextServiceGet: jest.fn().mockReturnValue(mockOrgId),
      imageModelExecute: jest
        .fn()
        .mockRejectedValue(new Error('Database connection failed')),
    });

    const loggerSpy = jest.spyOn(service['logger'], 'warn');

    const thread = createMockThread();
    const tools = await service.assembleTools(thread, undefined, [], new Map());

    const toolTypes = tools.map((t: { type: ToolType }) => t.type);
    expect(toolTypes).not.toContain(ToolType.GENERATE_IMAGE);
    expect(loggerSpy).toHaveBeenCalledWith(
      'Failed to check image generation model availability',
      expect.objectContaining({
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
