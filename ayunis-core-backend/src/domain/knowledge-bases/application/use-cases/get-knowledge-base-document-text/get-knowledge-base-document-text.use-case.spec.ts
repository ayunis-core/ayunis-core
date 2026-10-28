import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { GetKnowledgeBaseDocumentTextUseCase } from './get-knowledge-base-document-text.use-case';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { GetKnowledgeBaseDocumentTextQuery } from './get-knowledge-base-document-text.query';
import {
  KnowledgeBaseNotFoundError,
  DocumentNotInKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { randomUUID } from 'crypto';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import { FindKnowledgeBaseForThreadUseCase } from 'src/domain/knowledge-bases/application/use-cases/find-knowledge-base-for-thread/find-knowledge-base-for-thread.use-case';

describe('GetKnowledgeBaseDocumentTextUseCase', () => {
  let useCase: GetKnowledgeBaseDocumentTextUseCase;
  let mockRepository: jest.Mocked<KnowledgeBaseRepository>;
  let mockFindKnowledgeBaseForThread: jest.Mocked<FindKnowledgeBaseForThreadUseCase>;

  const orgId = randomUUID();
  const userId = randomUUID();
  const knowledgeBaseId = randomUUID();
  const documentId = randomUUID();

  beforeAll(async () => {
    mockRepository = {
      findById: jest.fn(),
      findSourceByIdAndKnowledgeBaseId: jest.fn(),
      countSourcesByKnowledgeBaseId: jest.fn(),
      countSourcesByKnowledgeBaseIds: jest.fn(),
    } as unknown as jest.Mocked<KnowledgeBaseRepository>;

    mockFindKnowledgeBaseForThread = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindKnowledgeBaseForThreadUseCase>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetKnowledgeBaseDocumentTextUseCase,
        {
          provide: KnowledgeBaseRepository,
          useValue: mockRepository,
        },
        {
          provide: FindKnowledgeBaseForThreadUseCase,
          useValue: mockFindKnowledgeBaseForThread,
        },
      ],
    }).compile();

    useCase = module.get(GetKnowledgeBaseDocumentTextUseCase);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the source when knowledge base and document exist with correct access', async () => {
    const knowledgeBase = new PersonalKnowledgeBase({
      id: knowledgeBaseId,
      name: 'Municipal Policies',
      orgId,
      userId,
    });

    const source = new FileSource({
      id: documentId,
      name: 'building-codes.pdf',
      type: TextType.FILE,
      fileType: FileType.PDF,
    });

    mockFindKnowledgeBaseForThread.execute.mockResolvedValue(knowledgeBase);
    mockRepository.findSourceByIdAndKnowledgeBaseId.mockResolvedValue(source);

    const result = await useCase.execute(
      new GetKnowledgeBaseDocumentTextQuery({
        knowledgeBaseId,
        documentId,
        orgId,
        userId,
      }),
    );

    expect(result).toBe(source);
    expect(mockFindKnowledgeBaseForThread.execute).toHaveBeenCalledWith({
      knowledgeBaseId: knowledgeBaseId,
      threadId: undefined,
    });
    expect(
      mockRepository.findSourceByIdAndKnowledgeBaseId,
    ).toHaveBeenCalledWith(documentId, knowledgeBaseId);
  });

  it('should throw KnowledgeBaseNotFoundError when knowledge base does not exist', async () => {
    mockFindKnowledgeBaseForThread.execute.mockRejectedValue(
      new KnowledgeBaseNotFoundError(knowledgeBaseId),
    );

    await expect(
      useCase.execute(
        new GetKnowledgeBaseDocumentTextQuery({
          knowledgeBaseId,
          documentId,
          orgId,
          userId,
        }),
      ),
    ).rejects.toThrow(KnowledgeBaseNotFoundError);
  });

  it('should throw KnowledgeBaseNotFoundError when KB is not owned or shared', async () => {
    mockFindKnowledgeBaseForThread.execute.mockRejectedValue(
      new KnowledgeBaseNotFoundError(knowledgeBaseId),
    );

    await expect(
      useCase.execute(
        new GetKnowledgeBaseDocumentTextQuery({
          knowledgeBaseId,
          documentId,
          orgId,
          userId,
        }),
      ),
    ).rejects.toThrow(KnowledgeBaseNotFoundError);
  });

  it('should allow access to a shared knowledge base document', async () => {
    const otherUserId = randomUUID();
    const sharedKb = new PersonalKnowledgeBase({
      id: knowledgeBaseId,
      name: 'Shared Municipal Policies',
      orgId,
      userId: otherUserId,
    });

    const source = new FileSource({
      id: documentId,
      name: 'shared-building-codes.pdf',
      type: TextType.FILE,
      fileType: FileType.PDF,
    });

    mockFindKnowledgeBaseForThread.execute.mockResolvedValue(sharedKb);
    mockRepository.findSourceByIdAndKnowledgeBaseId.mockResolvedValue(source);

    const result = await useCase.execute(
      new GetKnowledgeBaseDocumentTextQuery({
        knowledgeBaseId,
        documentId,
        orgId,
        userId,
      }),
    );

    expect(result).toBe(source);
  });

  it('should throw KnowledgeBaseNotFoundError when orgId does not match', async () => {
    const otherOrgId = randomUUID();
    const knowledgeBase = new PersonalKnowledgeBase({
      id: knowledgeBaseId,
      name: 'Other Org KB',
      orgId: otherOrgId,
      userId,
    });

    mockFindKnowledgeBaseForThread.execute.mockResolvedValue(knowledgeBase);

    await expect(
      useCase.execute(
        new GetKnowledgeBaseDocumentTextQuery({
          knowledgeBaseId,
          documentId,
          orgId,
          userId,
        }),
      ),
    ).rejects.toThrow(KnowledgeBaseNotFoundError);
  });

  it('should throw DocumentNotInKnowledgeBaseError when document is not found in knowledge base', async () => {
    const knowledgeBase = new PersonalKnowledgeBase({
      id: knowledgeBaseId,
      name: 'Municipal Policies',
      orgId,
      userId,
    });

    mockFindKnowledgeBaseForThread.execute.mockResolvedValue(knowledgeBase);
    mockRepository.findSourceByIdAndKnowledgeBaseId.mockResolvedValue(null);

    const query = new GetKnowledgeBaseDocumentTextQuery({
      knowledgeBaseId,
      documentId,
      orgId,
      userId,
    });

    await expect(useCase.execute(query)).rejects.toThrow(
      DocumentNotInKnowledgeBaseError,
    );
  });
});
