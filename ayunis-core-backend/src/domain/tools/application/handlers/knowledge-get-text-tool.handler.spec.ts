import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { KnowledgeGetTextToolHandler } from './knowledge-get-text-tool.handler';
import { GetKnowledgeBaseDocumentTextUseCase } from 'src/domain/knowledge-bases/application/use-cases/get-knowledge-base-document-text/get-knowledge-base-document-text.use-case';
import type { KnowledgeGetTextTool } from '../../domain/tools/knowledge-get-text-tool.entity';
import { randomUUID } from 'crypto';
import { ToolExecutionFailedError } from '../tools.errors';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import { ContextService } from 'src/common/context/services/context.service';
import toolsConfig from 'src/config/tools.config';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';

function createMockTool(knowledgeBaseId: string, documentId: string) {
  return {
    name: 'knowledge_get_text',
    validateParams: jest.fn().mockReturnValue({
      knowledgeBaseId,
      documentId,
      startLine: 1,
      numLines: 100,
    }),
  } as unknown as KnowledgeGetTextTool;
}

describe('KnowledgeGetTextToolHandler', () => {
  let handler: KnowledgeGetTextToolHandler;
  let mockGetDocTextUseCase: jest.Mocked<GetKnowledgeBaseDocumentTextUseCase>;
  let mockContextService: jest.Mocked<ContextService>;

  const mockKbId = randomUUID();
  const mockDocId = randomUUID();
  const mockOrgId = randomUUID();
  const mockUserId = randomUUID();
  const mockThreadId = randomUUID();

  beforeAll(async () => {
    mockGetDocTextUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetKnowledgeBaseDocumentTextUseCase>;

    mockContextService = {
      get: jest.fn().mockReturnValue(mockUserId),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeGetTextToolHandler,
        {
          provide: GetKnowledgeBaseDocumentTextUseCase,
          useValue: mockGetDocTextUseCase,
        },
        {
          provide: ContextService,
          useValue: mockContextService,
        },
        {
          provide: toolsConfig.KEY,
          useValue: {
            sourceGetText: { maxLines: 500, maxChars: 50000 },
          },
        },
      ],
    }).compile();

    handler = module.get<KnowledgeGetTextToolHandler>(
      KnowledgeGetTextToolHandler,
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockContextService.get.mockReturnValue(mockUserId);
  });

  it('should return text content for a valid document', async () => {
    const mockSource = new FileSource({
      id: mockDocId,
      name: 'policy-document.pdf',
      text: 'Line 1\nLine 2\nLine 3',
      contentChunks: [],
      type: TextType.FILE,
      fileType: FileType.PDF,
    });

    mockGetDocTextUseCase.execute.mockResolvedValue(mockSource);

    const tool = createMockTool(mockKbId, mockDocId);
    const result = await handler.execute({
      tool,
      input: { knowledgeBaseId: mockKbId, documentId: mockDocId },
      context: { orgId: mockOrgId, threadId: mockThreadId },
    });

    const parsed = JSON.parse(result);
    expect(parsed.knowledgeBaseId).toBe(mockKbId);
    expect(parsed.documentId).toBe(mockDocId);
    expect(parsed.documentName).toBe('policy-document.pdf');
    expect(parsed.totalLines).toBe(3);
    expect(parsed.text).toBe('Line 1\nLine 2\nLine 3');
  });

  it('should throw when knowledge base is not found', async () => {
    mockGetDocTextUseCase.execute.mockRejectedValue(
      new KnowledgeBaseNotFoundError(mockKbId),
    );

    const tool = createMockTool(mockKbId, mockDocId);

    await expect(
      handler.execute({
        tool,
        input: { knowledgeBaseId: mockKbId, documentId: mockDocId },
        context: { orgId: mockOrgId, threadId: mockThreadId },
      }),
    ).rejects.toThrow(ToolExecutionFailedError);
  });

  it('should expose knowledge base not found error to LLM', async () => {
    mockGetDocTextUseCase.execute.mockRejectedValue(
      new KnowledgeBaseNotFoundError(mockKbId),
    );

    const tool = createMockTool(mockKbId, mockDocId);

    try {
      await handler.execute({
        tool,
        input: { knowledgeBaseId: mockKbId, documentId: mockDocId },
        context: { orgId: mockOrgId, threadId: mockThreadId },
      });
      fail('Expected ToolExecutionFailedError');
    } catch (error) {
      expect(error).toBeInstanceOf(ToolExecutionFailedError);
      expect((error as ToolExecutionFailedError).exposeToLLM).toBe(true);
    }
  });

  it('should throw when source is not a TextSource', async () => {
    const mockSource = {
      id: mockDocId,
      name: 'data.csv',
    } as unknown as FileSource;

    mockGetDocTextUseCase.execute.mockResolvedValue(mockSource);

    const tool = createMockTool(mockKbId, mockDocId);

    await expect(
      handler.execute({
        tool,
        input: { knowledgeBaseId: mockKbId, documentId: mockDocId },
        context: { orgId: mockOrgId, threadId: mockThreadId },
      }),
    ).rejects.toThrow(ToolExecutionFailedError);
  });

  it('should handle empty text content', async () => {
    const mockSource = new FileSource({
      id: mockDocId,
      name: 'empty-doc.pdf',
      text: '',
      contentChunks: [],
      type: TextType.FILE,
      fileType: FileType.PDF,
    });

    mockGetDocTextUseCase.execute.mockResolvedValue(mockSource);

    const tool = createMockTool(mockKbId, mockDocId);
    const result = await handler.execute({
      tool,
      input: { knowledgeBaseId: mockKbId, documentId: mockDocId },
      context: { orgId: mockOrgId, threadId: mockThreadId },
    });

    const parsed = JSON.parse(result);
    expect(parsed.totalLines).toBe(0);
    expect(parsed.text).toBe('');
  });

  it('should throw when user is not authenticated', async () => {
    mockContextService.get.mockReturnValue(undefined);

    const tool = createMockTool(mockKbId, mockDocId);

    await expect(
      handler.execute({
        tool,
        input: { knowledgeBaseId: mockKbId, documentId: mockDocId },
        context: { orgId: mockOrgId, threadId: mockThreadId },
      }),
    ).rejects.toThrow(ToolExecutionFailedError);
  });
});
