import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { SourceQueryToolHandler } from './source-query-tool.handler';
import { QueryTextSourceUseCase } from 'src/domain/sources/application/use-cases/query-text-source/query-text-source.use-case';
import type { TextSourceQueryResult } from 'src/domain/sources/application/use-cases/query-text-source/query-text-source.use-case';
import { SourceQueryTool } from 'src/domain/tools/domain/tools/source-query-tool.entity';
import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { randomUUID } from 'crypto';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';
import { SourceNotFoundError } from 'src/domain/sources/application/sources.errors';

describe('SourceQueryToolHandler', () => {
  let handler: SourceQueryToolHandler;
  let mockQueryTextSourceUseCase: jest.Mocked<QueryTextSourceUseCase>;

  const mockOrgId = randomUUID();
  const mockThreadId = randomUUID();
  const contract = new FileSource({
    id: randomUUID(),
    name: 'Mietvertrag.pdf',
    type: TextType.FILE,
    fileType: FileType.PDF,
  });
  const statute = new FileSource({
    id: randomUUID(),
    name: 'Satzung.pdf',
    type: TextType.FILE,
    fileType: FileType.PDF,
  });
  const tool = new SourceQueryTool([contract, statute]);

  function queryResult(
    params: Partial<TextSourceQueryResult> & { meta?: Record<string, unknown> },
  ): TextSourceQueryResult {
    return {
      chunk: new TextSourceContentChunk({
        content: 'Die Kündigungsfrist beträgt drei Monate.',
        meta: params.meta ?? {},
      }),
      sourceId: contract.id,
      sourceName: contract.name,
      sourceCreatedBy: SourceCreator.USER,
      matchedQueries: ['Kündigungsfrist'],
      ...params,
    };
  }

  async function execute(input: Record<string, unknown>) {
    return JSON.parse(
      await handler.execute({
        tool,
        input,
        context: { orgId: mockOrgId, threadId: mockThreadId },
      }),
    ) as Record<string, unknown>[];
  }

  beforeAll(async () => {
    mockQueryTextSourceUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<QueryTextSourceUseCase>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SourceQueryToolHandler,
        {
          provide: QueryTextSourceUseCase,
          useValue: mockQueryTextSourceUseCase,
        },
      ],
    }).compile();

    handler = module.get<SourceQueryToolHandler>(SourceQueryToolHandler);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryTextSourceUseCase.execute.mockResolvedValue([]);
  });

  it('queries every requested file with every query in one call', async () => {
    await execute({
      sourceIds: [contract.id, statute.id],
      queries: ['Kündigungsfrist', 'Vertragslaufzeit'],
    });

    expect(mockQueryTextSourceUseCase.execute).toHaveBeenCalledTimes(1);
    expect(mockQueryTextSourceUseCase.execute).toHaveBeenCalledWith({
      orgId: mockOrgId,
      sourceIds: [contract.id, statute.id],
      queries: ['Kündigungsfrist', 'Vertragslaufzeit'],
    });
  });

  it('returns each chunk with its source, line metadata and matching queries', async () => {
    const result = queryResult({
      sourceId: statute.id,
      sourceName: statute.name,
      matchedQueries: ['Kündigungsfrist', 'Vertragslaufzeit'],
      meta: { fileName: 'Satzung.pdf', startLine: 8, endLine: 20 },
    });
    mockQueryTextSourceUseCase.execute.mockResolvedValue([result]);

    const parsed = await execute({
      sourceIds: [contract.id, statute.id],
      queries: ['Kündigungsfrist', 'Vertragslaufzeit'],
    });

    expect(parsed).toEqual([
      {
        chunkId: result.chunk.id,
        sourceId: statute.id,
        sourceName: 'Satzung.pdf',
        citable: true,
        content: 'Die Kündigungsfrist beträgt drei Monate.',
        startLine: 8,
        endLine: 20,
        fileName: 'Satzung.pdf',
        url: null,
        matchedQueries: ['Kündigungsfrist', 'Vertragslaufzeit'],
      },
    ]);
  });

  it('marks system-only source chunks as non-citable', async () => {
    const result = queryResult({ sourceCreatedBy: SourceCreator.SYSTEM });
    mockQueryTextSourceUseCase.execute.mockResolvedValue([result]);

    const parsed = await execute({
      sourceIds: [contract.id],
      queries: ['Kündigungsfrist'],
    });

    expect(parsed[0]).toEqual(
      expect.objectContaining({ chunkId: result.chunk.id, citable: false }),
    );
  });

  it('includes the URL for chunks of web sources', async () => {
    mockQueryTextSourceUseCase.execute.mockResolvedValue([
      queryResult({ meta: { url: 'https://www.bitburg.de/satzungen' } }),
    ]);

    const parsed = await execute({
      sourceIds: [contract.id],
      queries: ['Kündigungsfrist'],
    });

    expect(parsed[0]).toEqual(
      expect.objectContaining({
        url: 'https://www.bitburg.de/satzungen',
        fileName: null,
      }),
    );
  });

  it('returns null metadata when a legacy chunk has none', async () => {
    mockQueryTextSourceUseCase.execute.mockResolvedValue([queryResult({})]);

    const parsed = await execute({
      sourceIds: [contract.id],
      queries: ['Kündigungsfrist'],
    });

    expect(parsed[0]).toEqual(
      expect.objectContaining({
        startLine: null,
        endLine: null,
        fileName: null,
        url: null,
      }),
    );
  });

  it('returns an empty array when no chunks match', async () => {
    const parsed = await execute({
      sourceIds: [contract.id],
      queries: ['Hundesteuer'],
    });

    expect(parsed).toEqual([]);
  });

  it('fails without querying when the model uses the single-file shape', async () => {
    await expect(
      execute({ sourceId: contract.id, query: 'Kündigungsfrist' }),
    ).rejects.toThrow(ToolExecutionFailedError);
    expect(mockQueryTextSourceUseCase.execute).not.toHaveBeenCalled();
  });

  it('tells the model which requested source no longer exists', async () => {
    mockQueryTextSourceUseCase.execute.mockRejectedValue(
      new SourceNotFoundError(statute.id),
    );

    const error = (await execute({
      sourceIds: [contract.id, statute.id],
      queries: ['Kündigungsfrist'],
    }).catch((caught: unknown) => caught)) as ToolExecutionFailedError;

    expect(error).toBeInstanceOf(ToolExecutionFailedError);
    expect(error.exposeToLLM).toBe(true);
    expect(error.message).toContain(`Source with ID '${statute.id}' not found`);
  });
});
