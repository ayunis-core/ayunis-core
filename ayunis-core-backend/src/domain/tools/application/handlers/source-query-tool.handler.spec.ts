import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { SourceQueryToolHandler } from './source-query-tool.handler';
import { GetTextSourceByIdUseCase } from 'src/domain/sources/application/use-cases/get-text-source-by-id/get-text-source-by-id.use-case';
import { QueryTextSourceUseCase } from 'src/domain/sources/application/use-cases/query-text-source/query-text-source.use-case';
import type { SourceQueryTool } from 'src/domain/tools/domain/tools/source-query-tool.entity';
import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { randomUUID } from 'crypto';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';

// Helper to create a mock tool with validation bypass
function createMockTool(sourceId: string) {
  return {
    name: 'source_query',
    validateParams: jest.fn().mockReturnValue({
      sourceId,
      query: 'test query',
    }),
  } as unknown as SourceQueryTool;
}

describe('SourceQueryToolHandler', () => {
  let handler: SourceQueryToolHandler;
  let mockGetSourceByIdUseCase: jest.Mocked<GetTextSourceByIdUseCase>;
  let mockQueryTextSourceUseCase: jest.Mocked<QueryTextSourceUseCase>;

  const mockSourceId = randomUUID();
  const mockOrgId = randomUUID();
  const mockThreadId = randomUUID();

  beforeAll(async () => {
    mockGetSourceByIdUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetTextSourceByIdUseCase>;

    mockQueryTextSourceUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<QueryTextSourceUseCase>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SourceQueryToolHandler,
        {
          provide: GetTextSourceByIdUseCase,
          useValue: mockGetSourceByIdUseCase,
        },
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
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute with line number metadata', () => {
    it('should include line numbers in response when metadata is present', async () => {
      const mockSource = new FileSource({
        id: mockSourceId,
        name: 'test-file.pdf',
        type: TextType.FILE,
        fileType: FileType.PDF,
      });

      const mockChunks: TextSourceContentChunk[] = [
        new TextSourceContentChunk({
          content: 'First chunk content',
          meta: {
            fileName: 'test-file.pdf',
            index: 0,
            startLine: 1,
            endLine: 10,
            startCharOffset: 0,
            endCharOffset: 100,
          },
        }),
        new TextSourceContentChunk({
          content: 'Second chunk content',
          meta: {
            fileName: 'test-file.pdf',
            index: 1,
            startLine: 8,
            endLine: 20,
            startCharOffset: 80,
            endCharOffset: 200,
          },
        }),
      ];

      mockGetSourceByIdUseCase.execute.mockResolvedValue(mockSource);
      mockQueryTextSourceUseCase.execute.mockResolvedValue(mockChunks);

      const tool = createMockTool(mockSourceId);
      const result = await handler.execute({
        tool,
        input: {
          sourceId: mockSourceId,
          query: 'test query',
        },
        context: { orgId: mockOrgId, threadId: mockThreadId },
      });

      const parsedResult = JSON.parse(result);

      expect(parsedResult).toHaveLength(2);
      expect(parsedResult[0]).toEqual({
        chunkId: mockChunks[0].id,
        sourceId: mockSource.id,
        sourceName: mockSource.name,
        citable: true,
        content: 'First chunk content',
        startLine: 1,
        endLine: 10,
        fileName: 'test-file.pdf',
        url: null,
      });
      expect(parsedResult[1]).toEqual({
        chunkId: mockChunks[1].id,
        sourceId: mockSource.id,
        sourceName: mockSource.name,
        citable: true,
        content: 'Second chunk content',
        startLine: 8,
        endLine: 20,
        fileName: 'test-file.pdf',
        url: null,
      });
    });

    it('should mark system-only source chunks as non-citable', async () => {
      const systemSource = new FileSource({
        id: mockSourceId,
        name: 'Internal instructions.pdf',
        type: TextType.FILE,
        fileType: FileType.PDF,
        createdBy: SourceCreator.SYSTEM,
      });
      const chunk = new TextSourceContentChunk({
        content: 'Internal retrieval context',
        meta: { startLine: 1, endLine: 1 },
      });
      mockGetSourceByIdUseCase.execute.mockResolvedValue(systemSource);
      mockQueryTextSourceUseCase.execute.mockResolvedValue([chunk]);

      const result = await handler.execute({
        tool: createMockTool(mockSourceId),
        input: { sourceId: mockSourceId, query: 'internal context' },
        context: { orgId: mockOrgId, threadId: mockThreadId },
      });

      expect(JSON.parse(result)[0]).toEqual(
        expect.objectContaining({ chunkId: chunk.id, citable: false }),
      );
    });

    it('should include URL in response for URL sources', async () => {
      const mockSource = new FileSource({
        id: mockSourceId,
        name: 'Example Website',
        type: TextType.FILE,
        fileType: FileType.PDF,
      });

      const mockChunks: TextSourceContentChunk[] = [
        new TextSourceContentChunk({
          content: 'Web page content',
          meta: {
            url: 'https://example.com/page',
            index: 0,
            startLine: 1,
            endLine: 50,
          },
        }),
      ];

      mockGetSourceByIdUseCase.execute.mockResolvedValue(mockSource);
      mockQueryTextSourceUseCase.execute.mockResolvedValue(mockChunks);

      const tool = createMockTool(mockSourceId);
      const result = await handler.execute({
        tool,
        input: {
          sourceId: mockSourceId,
          query: 'test query',
        },
        context: { orgId: mockOrgId, threadId: mockThreadId },
      });

      const parsedResult = JSON.parse(result);

      expect(parsedResult[0]).toEqual({
        chunkId: mockChunks[0].id,
        sourceId: mockSource.id,
        sourceName: mockSource.name,
        citable: true,
        content: 'Web page content',
        startLine: 1,
        endLine: 50,
        fileName: null,
        url: 'https://example.com/page',
      });
    });

    it('should return null for line numbers when metadata is missing (graceful degradation)', async () => {
      const mockSource = new FileSource({
        id: mockSourceId,
        name: 'old-file.pdf',
        type: TextType.FILE,
        fileType: FileType.PDF,
      });

      // Simulate old indexed content without line number metadata
      const mockChunks: TextSourceContentChunk[] = [
        new TextSourceContentChunk({
          content: 'Legacy chunk without line numbers',
          meta: {
            fileName: 'old-file.pdf',
          },
        }),
      ];

      mockGetSourceByIdUseCase.execute.mockResolvedValue(mockSource);
      mockQueryTextSourceUseCase.execute.mockResolvedValue(mockChunks);

      const tool = createMockTool(mockSourceId);
      const result = await handler.execute({
        tool,
        input: {
          sourceId: mockSourceId,
          query: 'test query',
        },
        context: { orgId: mockOrgId, threadId: mockThreadId },
      });

      const parsedResult = JSON.parse(result);

      expect(parsedResult[0]).toEqual({
        chunkId: mockChunks[0].id,
        sourceId: mockSource.id,
        sourceName: mockSource.name,
        citable: true,
        content: 'Legacy chunk without line numbers',
        startLine: null,
        endLine: null,
        fileName: 'old-file.pdf',
        url: null,
      });
    });

    it('should return null for all metadata when chunk has empty meta', async () => {
      const mockSource = new FileSource({
        id: mockSourceId,
        name: 'test.pdf',
        type: TextType.FILE,
        fileType: FileType.PDF,
      });

      const mockChunks: TextSourceContentChunk[] = [
        new TextSourceContentChunk({
          content: 'Chunk with empty metadata',
          meta: {},
        }),
      ];

      mockGetSourceByIdUseCase.execute.mockResolvedValue(mockSource);
      mockQueryTextSourceUseCase.execute.mockResolvedValue(mockChunks);

      const tool = createMockTool(mockSourceId);
      const result = await handler.execute({
        tool,
        input: {
          sourceId: mockSourceId,
          query: 'test query',
        },
        context: { orgId: mockOrgId, threadId: mockThreadId },
      });

      const parsedResult = JSON.parse(result);

      expect(parsedResult[0]).toEqual({
        chunkId: mockChunks[0].id,
        sourceId: mockSource.id,
        sourceName: mockSource.name,
        citable: true,
        content: 'Chunk with empty metadata',
        startLine: null,
        endLine: null,
        fileName: null,
        url: null,
      });
    });

    it('should return empty array when no chunks match', async () => {
      const mockSource = new FileSource({
        id: mockSourceId,
        name: 'test.pdf',
        type: TextType.FILE,
        fileType: FileType.PDF,
      });

      mockGetSourceByIdUseCase.execute.mockResolvedValue(mockSource);
      mockQueryTextSourceUseCase.execute.mockResolvedValue([]);

      const tool = createMockTool(mockSourceId);
      const result = await handler.execute({
        tool,
        input: {
          sourceId: mockSourceId,
          query: 'test query',
        },
        context: { orgId: mockOrgId, threadId: mockThreadId },
      });

      const parsedResult = JSON.parse(result);

      expect(parsedResult).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should throw ToolExecutionFailedError when source is not found', async () => {
      mockGetSourceByIdUseCase.execute.mockResolvedValue(
        null as unknown as ReturnType<typeof mockGetSourceByIdUseCase.execute>,
      );

      const tool = createMockTool(mockSourceId);

      await expect(
        handler.execute({
          tool,
          input: {
            sourceId: mockSourceId,
            query: 'test query',
          },
          context: { orgId: mockOrgId, threadId: mockThreadId },
        }),
      ).rejects.toThrow(ToolExecutionFailedError);
    });
  });
});
