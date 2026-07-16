import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { ArtifactToolAssemblerService } from './artifact-tool-assembler.service';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import type { AssembleToolCommand } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.command';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import { FindArtifactsByThreadUseCase } from 'src/domain/artifacts/application/use-cases/find-artifacts-by-thread/find-artifacts-by-thread.use-case';
import { FindArtifactWithVersionsUseCase } from 'src/domain/artifacts/application/use-cases/find-artifact-with-versions/find-artifact-with-versions.use-case';
import { FindAllLetterheadsUseCase } from 'src/domain/letterheads/application/use-cases/find-all-letterheads/find-all-letterheads.use-case';
import {
  DiagramArtifact,
  DocumentArtifact,
  SpreadsheetArtifact,
} from 'src/domain/artifacts/domain/artifact.entity';
import { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';
import type { Thread } from 'src/domain/threads/domain/thread.entity';

describe('ArtifactToolAssemblerService', () => {
  let service: ArtifactToolAssemblerService;
  let findArtifactsByThreadUseCase: jest.Mocked<FindArtifactsByThreadUseCase>;
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
    } = {},
  ) {
    const params = {
      id: overrides.id ?? randomUUID(),
      threadId: mockThreadId,
      userId: mockUserId,
      title: overrides.title ?? 'Artifact',
      currentVersionNumber: overrides.currentVersionNumber ?? 1,
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

    findArtifactsByThreadUseCase = {
      execute: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<FindArtifactsByThreadUseCase>;

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
          provide: FindArtifactsByThreadUseCase,
          useValue: findArtifactsByThreadUseCase,
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

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function toolNames(tools: Tool[]): string[] {
    return tools.map((t) => t.name);
  }

  function findTool(tools: Tool[], type: ToolType): Tool | undefined {
    return tools.find((t) => t.name === type.toString());
  }

  it('should always offer create tools for document, diagram, and spreadsheet', async () => {
    const tools = await service.assembleArtifactTools(thread);

    const names = toolNames(tools);
    expect(names).toContain(ToolType.CREATE_DOCUMENT);
    expect(names).toContain(ToolType.CREATE_DIAGRAM);
    expect(names).toContain(ToolType.CREATE_SPREADSHEET);
  });

  it('should not offer update_diagram or update_spreadsheet on an empty thread', async () => {
    const tools = await service.assembleArtifactTools(thread);

    const names = toolNames(tools);
    expect(names).not.toContain(ToolType.UPDATE_DIAGRAM);
    expect(names).not.toContain(ToolType.UPDATE_SPREADSHEET);
  });

  it('should offer update_diagram only when the thread has diagram artifacts', async () => {
    findArtifactsByThreadUseCase.execute.mockResolvedValue([
      makeArtifact('diagram'),
    ]);

    const tools = await service.assembleArtifactTools(thread);

    const names = toolNames(tools);
    expect(names).toContain(ToolType.UPDATE_DIAGRAM);
    expect(names).not.toContain(ToolType.UPDATE_SPREADSHEET);
  });

  it('should offer update_spreadsheet only when the thread has spreadsheet artifacts', async () => {
    findArtifactsByThreadUseCase.execute.mockResolvedValue([
      makeArtifact('spreadsheet'),
    ]);

    const tools = await service.assembleArtifactTools(thread);

    const names = toolNames(tools);
    expect(names).toContain(ToolType.UPDATE_SPREADSHEET);
    expect(names).not.toContain(ToolType.UPDATE_DIAGRAM);
  });

  it('should list spreadsheet artifacts with their current version in the tool description', async () => {
    const spreadsheet = makeArtifact('spreadsheet', {
      title: 'Budget 2026',
      currentVersionNumber: 3,
    });
    findArtifactsByThreadUseCase.execute.mockResolvedValue([spreadsheet]);

    const tools = await service.assembleArtifactTools(thread);

    const updateTool = findTool(tools, ToolType.UPDATE_SPREADSHEET);
    expect(updateTool?.descriptionLong).toContain(spreadsheet.id);
    expect(updateTool?.descriptionLong).toContain('"Budget 2026"');
    expect(updateTool?.descriptionLong).toContain('(current version 3)');
  });

  it('should only list document artifacts in the document tool descriptions', async () => {
    const document = makeArtifact('document', { title: 'Report' });
    const spreadsheet = makeArtifact('spreadsheet', { title: 'Sheet' });
    findArtifactsByThreadUseCase.execute.mockResolvedValue([
      document,
      spreadsheet,
    ]);

    const tools = await service.assembleArtifactTools(thread);

    const updateDocTool = findTool(tools, ToolType.UPDATE_DOCUMENT);
    expect(updateDocTool?.descriptionLong).toContain(document.id);
    expect(updateDocTool?.descriptionLong).not.toContain(spreadsheet.id);
    expect(findArtifactWithVersionsUseCase.execute).toHaveBeenCalledTimes(1);
  });
});
