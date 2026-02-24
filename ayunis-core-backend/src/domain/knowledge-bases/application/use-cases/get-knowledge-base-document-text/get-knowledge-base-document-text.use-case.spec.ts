import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { GetKnowledgeBaseDocumentTextUseCase } from './get-knowledge-base-document-text.use-case';
import { KnowledgeBaseRepository } from '../../ports/knowledge-base.repository';
import { GetKnowledgeBaseDocumentTextQuery } from './get-knowledge-base-document-text.query';
import {
  KnowledgeBaseNotFoundError,
  DocumentNotInKnowledgeBaseError,
} from '../../knowledge-bases.errors';
import { KnowledgeBase } from '../../../domain/knowledge-base.entity';
import { randomUUID } from 'crypto';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';

describe('GetKnowledgeBaseDocumentTextUseCase', () => {
  let useCase: GetKnowledgeBaseDocumentTextUseCase;
  let mockRepository: jest.Mocked<KnowledgeBaseRepository>;

  const orgId = randomUUID();
  const userId = randomUUID();
  const knowledgeBaseId = randomUUID();
  const documentId = randomUUID();

  beforeAll(async () => {
    mockRepository = {
      findById: jest.fn(),
      findSourceByIdAndKnowledgeBaseId: jest.fn(),
    } as unknown as jest.Mocked<KnowledgeBaseRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetKnowledgeBaseDocumentTextUseCase,
        {
          provide: KnowledgeBaseRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    useCase = module.get(GetKnowledgeBaseDocumentTextUseCase);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the source when knowledge base and document exist with correct ownership', async () => {
    const knowledgeBase = new KnowledgeBase({
      id: knowledgeBaseId,
      name: 'Municipal Policies',
      orgId,
      userId,
    });

    const source = new FileSource({
      id: documentId,
      name: 'building-codes.pdf',
      text: 'Building code regulations...',
      contentChunks: [],
      type: TextType.FILE,
      fileType: FileType.PDF,
    });

    mockRepository.findById.mockResolvedValue(knowledgeBase);
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
    expect(mockRepository.findById).toHaveBeenCalledWith(knowledgeBaseId);
    expect(
      mockRepository.findSourceByIdAndKnowledgeBaseId,
    ).toHaveBeenCalledWith(documentId, knowledgeBaseId);
  });

  it('should throw KnowledgeBaseNotFoundError when knowledge base does not exist', async () => {
    mockRepository.findById.mockResolvedValue(null);

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

  it('should throw KnowledgeBaseNotFoundError when userId does not match', async () => {
    const otherUserId = randomUUID();
    const knowledgeBase = new KnowledgeBase({
      id: knowledgeBaseId,
      name: 'Other User KB',
      orgId,
      userId: otherUserId,
    });

    mockRepository.findById.mockResolvedValue(knowledgeBase);

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

  it('should throw KnowledgeBaseNotFoundError when orgId does not match', async () => {
    const otherOrgId = randomUUID();
    const knowledgeBase = new KnowledgeBase({
      id: knowledgeBaseId,
      name: 'Other Org KB',
      orgId: otherOrgId,
      userId,
    });

    mockRepository.findById.mockResolvedValue(knowledgeBase);

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
    const knowledgeBase = new KnowledgeBase({
      id: knowledgeBaseId,
      name: 'Municipal Policies',
      orgId,
      userId,
    });

    mockRepository.findById.mockResolvedValue(knowledgeBase);
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
