import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { ArtifactToolAssemblerService } from './artifact-tool-assembler.service';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import type { AssembleToolCommand } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.command';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import { FindArtifactsForRunUseCase } from 'src/domain/artifacts/application/use-cases/find-artifacts-for-run/find-artifacts-for-run.use-case';
import type { Artifact } from 'src/domain/artifacts/domain/artifact.entity';
import { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import { FindArtifactWithVersionsUseCase } from 'src/domain/artifacts/application/use-cases/find-artifact-with-versions/find-artifact-with-versions.use-case';
import { FindAllLetterheadsUseCase } from 'src/domain/letterheads/application/use-cases/find-all-letterheads/find-all-letterheads.use-case';
import {
  DiagramArtifact,
  DocumentArtifact,
  SpreadsheetArtifact,
} from 'src/domain/artifacts/domain/artifact.entity';
import { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';
import type { ArtifactVersion } from 'src/domain/artifacts/domain/artifact-version.entity';
import type { Thread } from 'src/domain/threads/domain/thread.entity';

describe('ArtifactToolAssemblerService', () => {
  let service: ArtifactToolAssemblerService;
  let findArtifactsForRunUseCase: jest.Mocked<FindArtifactsForRunUseCase>;
  let findArtifactWithVersionsUseCase: jest.Mocked<FindArtifactWithVersionsUseCase>;

  const mockThreadId = randomUUID();
  const mockUserId = randomUUID();
  const thread = { id: mockThreadId } as Thread;

  function makeArtifact(
    kind: 'document' | 'diagram' | 'spreadsheet',
    overrides: {
      id?: UUID;
      title?: string;
      currentVersionNumber?: number;
      versions?: ArtifactVersion[];
      isAnonymous?: boolean;
    } = {},
  ) {
    const params = {
      id: overrides.id ?? randomUUID(),
      threadId: mockThreadId,
      userId: mockUserId,
      title: overrides.title ?? 'Artifact',
      isAnonymous: overrides.isAnonymous,
      currentVersionNumber: overrides.currentVersionNumber ?? 1,
      versions: overrides.versions,
    };
    if (kind === 'document') return new DocumentArtifact(params);
    if (kind === 'diagram') return new DiagramArtifact(params);
    return new SpreadsheetArtifact(params);
  }

  beforeEach(async () => {
    const mockAssembleToolUseCase = {
      execute: jest.fn((command: AssembleToolCommand) =>
        Promise.resolve({
          name: command.type,
          type: command.type,
          description: `${command.type} description`,
          descriptionLong: undefined,
        } as unknown as Tool),
      ),
    };

    findArtifactsForRunUseCase = {
      execute: jest
        .fn()
        .mockResolvedValue({ artifacts: [], threadPiiMasks: null }),
    } as unknown as jest.Mocked<FindArtifactsForRunUseCase>;

    findArtifactWithVersionsUseCase = {
      execute: jest.fn().mockResolvedValue({
        currentVersionNumber: 1,
        versions: [{ versionNumber: 1, authorType: AuthorType.ASSISTANT }],
      }),
    } as unknown as jest.Mocked<FindArtifactWithVersionsUseCase>;

    const mockFindAllLetterheadsUseCase = {
      execute: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArtifactToolAssemblerService,
        { provide: AssembleToolUseCase, useValue: mockAssembleToolUseCase },
        {
          provide: FindArtifactsForRunUseCase,
          useValue: findArtifactsForRunUseCase,
        },
        {
          provide: FindArtifactWithVersionsUseCase,
          useValue: findArtifactWithVersionsUseCase,
        },
        {
          provide: FindAllLetterheadsUseCase,
          useValue: mockFindAllLetterheadsUseCase,
        },
      ],
    }).compile();

    service = module.get<ArtifactToolAssemblerService>(
      ArtifactToolAssemblerService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function givenArtifacts(...artifacts: Artifact[]): void {
    findArtifactsForRunUseCase.execute.mockResolvedValue({
      artifacts: artifacts.map((artifact) => ({
        artifact,
        title: artifact.title,
      })),
      threadPiiMasks: null,
    });
  }

  async function assemble(isAnonymous = false): Promise<Tool[]> {
    return (await service.assembleArtifactTools(thread, isAnonymous)).tools;
  }

  function toolNames(tools: Tool[]): string[] {
    return tools.map((t) => t.name);
  }

  function findTool(tools: Tool[], type: ToolType): Tool | undefined {
    return tools.find((t) => t.name === type.toString());
  }

  it('should always offer create tools for document, diagram, and spreadsheet', async () => {
    const tools = await assemble();

    const names = toolNames(tools);
    expect(names).toContain(ToolType.CREATE_DOCUMENT);
    expect(names).toContain(ToolType.CREATE_DIAGRAM);
    expect(names).toContain(ToolType.CREATE_SPREADSHEET);
  });

  it('lists the run’s artifacts with their titles in the chat’s placeholders and hands on new chat masks', async () => {
    const letter = makeArtifact('document', {
      title: 'Brief an {{pii:PERSON_NAME_1}}',
      isAnonymous: true,
    });
    const chatMasks = [
      new ThreadPiiMask({
        threadId: mockThreadId,
        category: PiiCategory.PERSON_NAME,
        maskIndex: 3,
        value: 'Anna Schmidt',
      }),
    ];
    findArtifactsForRunUseCase.execute.mockResolvedValue({
      artifacts: [
        { artifact: letter, title: 'Brief an {{pii:PERSON_NAME_3}}' },
      ],
      threadPiiMasks: chatMasks,
    });

    const assembled = await service.assembleArtifactTools(thread, true);

    const listing = findTool(
      assembled.tools,
      ToolType.READ_DOCUMENT,
    )?.descriptionLong;
    expect(listing).toContain(`${letter.id}: "Brief an {{pii:PERSON_NAME_3}}"`);
    expect(listing).not.toContain('{{pii:PERSON_NAME_1}}');
    expect(assembled.threadPiiMasks).toBe(chatMasks);
    expect(findArtifactsForRunUseCase.execute.mock.calls[0][0].run).toEqual({
      threadId: mockThreadId,
      isAnonymous: true,
    });
  });

  it('should not offer diagram or spreadsheet update and read tools on an empty thread', async () => {
    const tools = await assemble();

    const names = toolNames(tools);
    expect(names).not.toContain(ToolType.UPDATE_DIAGRAM);
    expect(names).not.toContain(ToolType.READ_DIAGRAM);
    expect(names).not.toContain(ToolType.UPDATE_SPREADSHEET);
    expect(names).not.toContain(ToolType.READ_SPREADSHEET);
  });

  it('should offer update_diagram and read_diagram only when the thread has diagram artifacts', async () => {
    givenArtifacts(makeArtifact('diagram'));

    const tools = await assemble();

    const names = toolNames(tools);
    expect(names).toContain(ToolType.UPDATE_DIAGRAM);
    expect(names).toContain(ToolType.READ_DIAGRAM);
    expect(names).not.toContain(ToolType.UPDATE_SPREADSHEET);
    expect(names).not.toContain(ToolType.READ_SPREADSHEET);
  });

  it('should offer update_spreadsheet and read_spreadsheet only when the thread has spreadsheet artifacts', async () => {
    givenArtifacts(makeArtifact('spreadsheet'));

    const tools = await assemble();

    const names = toolNames(tools);
    expect(names).toContain(ToolType.UPDATE_SPREADSHEET);
    expect(names).toContain(ToolType.READ_SPREADSHEET);
    expect(names).not.toContain(ToolType.UPDATE_DIAGRAM);
    expect(names).not.toContain(ToolType.READ_DIAGRAM);
  });

  it.each([
    ['diagram', ToolType.UPDATE_DIAGRAM, ToolType.READ_DIAGRAM],
    ['spreadsheet', ToolType.UPDATE_SPREADSHEET, ToolType.READ_SPREADSHEET],
  ] as const)(
    'should list the same %s artifacts in the read tool as in the update tool',
    async (kind, updateType, readType) => {
      const first = makeArtifact(kind, { title: 'Ablauf' });
      const second = makeArtifact(kind, { title: 'Zuständigkeiten' });
      givenArtifacts(first, second);

      const tools = await assemble();

      const updateList = findTool(tools, updateType)?.descriptionLong?.split(
        'Available',
      )[1];
      const readList = findTool(tools, readType)?.descriptionLong?.split(
        'Available',
      )[1];
      expect(readList).toContain(first.id);
      expect(readList).toContain(second.id);
      expect(readList).toBe(updateList);
    },
  );

  it('should list spreadsheet artifacts with their current version in the tool description', async () => {
    const spreadsheet = makeArtifact('spreadsheet', {
      title: 'Budget 2026',
      currentVersionNumber: 3,
    });
    givenArtifacts(spreadsheet);

    const tools = await assemble();

    const updateTool = findTool(tools, ToolType.UPDATE_SPREADSHEET);
    expect(updateTool?.descriptionLong).toContain(spreadsheet.id);
    expect(updateTool?.descriptionLong).toContain('"Budget 2026"');
    expect(updateTool?.descriptionLong).toContain('(current version 3)');
  });

  it('should warn before updating a user-edited spreadsheet', async () => {
    const spreadsheet = makeArtifact('spreadsheet', { title: 'Budget 2026' });
    givenArtifacts(spreadsheet);
    findArtifactWithVersionsUseCase.execute.mockResolvedValue(
      makeArtifact('spreadsheet', {
        id: spreadsheet.id,
        versions: [
          {
            id: randomUUID(),
            artifactId: spreadsheet.id,
            versionNumber: 1,
            content: '{}',
            authorType: AuthorType.USER,
            authorId: mockUserId,
            createdAt: new Date(),
          },
        ],
      }),
    );

    const tools = await assemble();

    const updateTool = findTool(tools, ToolType.UPDATE_SPREADSHEET);
    expect(updateTool?.descriptionLong).toContain(
      'user-edited — use read_spreadsheet before updating',
    );
  });

  it('should only list document artifacts in the document tool descriptions', async () => {
    const document = makeArtifact('document', { title: 'Report' });
    const spreadsheet = makeArtifact('spreadsheet', { title: 'Sheet' });
    givenArtifacts(document, spreadsheet);

    const tools = await assemble();

    const updateDocTool = findTool(tools, ToolType.UPDATE_DOCUMENT);
    expect(updateDocTool?.descriptionLong).toContain(document.id);
    expect(updateDocTool?.descriptionLong).not.toContain(spreadsheet.id);
    expect(findArtifactWithVersionsUseCase.execute).toHaveBeenCalledTimes(2);
  });
});
