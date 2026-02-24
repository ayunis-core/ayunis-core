import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { KnowledgeQueryToolHandler } from './knowledge-query-tool.handler';
import { QueryKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/query-knowledge-base/query-knowledge-base.use-case';
import type { KnowledgeQueryTool } from '../../domain/tools/knowledge-query-tool.entity';
import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { randomUUID } from 'crypto';
import { ToolExecutionFailedError } from '../tools.errors';
import { ContextService } from 'src/common/context/services/context.service';
import type { KnowledgeBaseQueryResult } from 'src/domain/knowledge-bases/application/use-cases/query-knowledge-base/query-knowledge-base.use-case';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';

function createMockTool(knowledgeBaseId: string) {
  return {
    name: 'knowledge_query',
    validateParams: jest.fn().mockReturnValue({
      knowledgeBaseId,
      query: 'test query',
    }),
  } as unknown as KnowledgeQueryTool;
}

describe('KnowledgeQueryToolHandler', () => {
  let handler: KnowledgeQueryToolHandler;
  let mockQueryKbUseCase: jest.Mocked<QueryKnowledgeBaseUseCase>;
  let mockContextService: jest.Mocked<ContextService>;

  const mockKbId = randomUUID();
  const mockOrgId = randomUUID();
  const mockUserId = randomUUID();
  const mockThreadId = randomUUID();
  const mockSourceId = randomUUID();

  beforeAll(async () => {
    mockQueryKbUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<QueryKnowledgeBaseUseCase>;

    mockContextService = {
      get: jest.fn().mockReturnValue(mockUserId),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeQueryToolHandler,
        {
          provide: QueryKnowledgeBaseUseCase,
          useValue: mockQueryKbUseCase,
        },
        {
          provide: ContextService,
          useValue: mockContextService,
        },
      ],
    }).compile();

    handler = module.get<KnowledgeQueryToolHandler>(KnowledgeQueryToolHandler);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockContextService.get.mockReturnValue(mockUserId);
  });

  it('should return formatted results with document provenance', async () => {
    const mockResults: KnowledgeBaseQueryResult[] = [
      {
        chunk: new TextSourceContentChunk({
          content: 'Relevant content about vacation policy',
          meta: {
            fileName: 'hr-policies.pdf',
            startLine: 15,
            endLine: 25,
          },
        }),
        sourceName: 'HR Policies Document',
        sourceId: mockSourceId,
      },
    ];

    mockQueryKbUseCase.execute.mockResolvedValue(mockResults);

    const tool = createMockTool(mockKbId);
    const result = await handler.execute({
      tool,
      input: { knowledgeBaseId: mockKbId, query: 'vacation policy' },
      context: { orgId: mockOrgId, threadId: mockThreadId },
    });

    const parsed = JSON.parse(result);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual({
      content: 'Relevant content about vacation policy',
      startLine: 15,
      endLine: 25,
      fileName: 'hr-policies.pdf',
      documentId: mockSourceId,
      documentName: 'HR Policies Document',
    });
  });

  it('should return empty array when no results found', async () => {
    mockQueryKbUseCase.execute.mockResolvedValue([]);

    const tool = createMockTool(mockKbId);
    const result = await handler.execute({
      tool,
      input: { knowledgeBaseId: mockKbId, query: 'nonexistent topic' },
      context: { orgId: mockOrgId, threadId: mockThreadId },
    });

    expect(JSON.parse(result)).toEqual([]);
  });

  it('should return null for missing metadata fields', async () => {
    const mockResults: KnowledgeBaseQueryResult[] = [
      {
        chunk: new TextSourceContentChunk({
          content: 'Content without line numbers',
          meta: {},
        }),
        sourceName: 'Some Doc',
        sourceId: mockSourceId,
      },
    ];

    mockQueryKbUseCase.execute.mockResolvedValue(mockResults);

    const tool = createMockTool(mockKbId);
    const result = await handler.execute({
      tool,
      input: { knowledgeBaseId: mockKbId, query: 'test' },
      context: { orgId: mockOrgId, threadId: mockThreadId },
    });

    const parsed = JSON.parse(result);
    expect(parsed[0].startLine).toBeNull();
    expect(parsed[0].endLine).toBeNull();
    expect(parsed[0].fileName).toBeNull();
  });

  it('should throw ToolExecutionFailedError on unexpected errors', async () => {
    mockQueryKbUseCase.execute.mockRejectedValue(
      new Error('Database connection lost'),
    );

    const tool = createMockTool(mockKbId);

    await expect(
      handler.execute({
        tool,
        input: { knowledgeBaseId: mockKbId, query: 'test' },
        context: { orgId: mockOrgId, threadId: mockThreadId },
      }),
    ).rejects.toThrow(ToolExecutionFailedError);
  });

  it('should expose knowledge base not found error to LLM', async () => {
    mockQueryKbUseCase.execute.mockRejectedValue(
      new KnowledgeBaseNotFoundError(mockKbId),
    );

    const tool = createMockTool(mockKbId);

    try {
      await handler.execute({
        tool,
        input: { knowledgeBaseId: mockKbId, query: 'test' },
        context: { orgId: mockOrgId, threadId: mockThreadId },
      });
      fail('Expected ToolExecutionFailedError');
    } catch (error) {
      expect(error).toBeInstanceOf(ToolExecutionFailedError);
      expect((error as ToolExecutionFailedError).exposeToLLM).toBe(true);
      expect((error as ToolExecutionFailedError).message).toContain(
        'Knowledge base not found',
      );
    }
  });
});
