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
import { KnowledgeBaseAccessService } from '../../services/knowledge-base-access.service';

describe('GetKnowledgeBaseDocumentTextUseCase', () => {
  let useCase: GetKnowledgeBaseDocumentTextUseCase;
  let mockRepository: jest.Mocked<KnowledgeBaseRepository>;
  let mockAccessService: jest.Mocked<KnowledgeBaseAccessService>;

  const orgId = randomUUID();
  const userId = randomUUID();
  const knowledgeBaseId = randomUUID();
  const documentId = randomUUID();

  beforeAll(async () => {
    mockRepository = {
      findById: jest.fn(),
      findSourceByIdAndKnowledgeBaseId: jest.fn(),
    } as unknown as jest.Mocked<KnowledgeBaseRepository>;

    mockAccessService = {
      findAccessibleKnowledgeBase: jest.fn(),
      findOneAccessible: jest.fn(),
      resolveIsShared: jest.fn(),
      findAllAccessible: jest.fn(),
    } as unknown as jest.Mocked<KnowledgeBaseAccessService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetKnowledgeBaseDocumentTextUseCase,
        {
          provide: KnowledgeBaseRepository,
          useValue: mockRepository,
        },
        {
          provide: KnowledgeBaseAccessService,
          useValue: mockAccessService,
        },
      ],
    }).compile();

    useCase = module.get(GetKnowledgeBaseDocumentTextUseCase);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the source when knowledge base and document exist with correct access', async () => {
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

    mockAccessService.findAccessibleKnowledgeBase.mockResolvedValue(
      knowledgeBase,
    );
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
    expect(mockAccessService.findAccessibleKnowledgeBase).toHaveBeenCalledWith(
      knowledgeBaseId,
    );
    expect(
      mockRepository.findSourceByIdAndKnowledgeBaseId,
    ).toHaveBeenCalledWith(documentId, knowledgeBaseId);
  });

  it('should throw KnowledgeBaseNotFoundError when knowledge base does not exist', async () => {
    mockAccessService.findAccessibleKnowledgeBase.mockRejectedValue(
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
    mockAccessService.findAccessibleKnowledgeBase.mockRejectedValue(
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
    const sharedKb = new KnowledgeBase({
      id: knowledgeBaseId,
      name: 'Shared Municipal Policies',
      orgId,
      userId: otherUserId,
    });

    const source = new FileSource({
      id: documentId,
      name: 'shared-building-codes.pdf',
      text: 'Shared building code regulations...',
      contentChunks: [],
      type: TextType.FILE,
      fileType: FileType.PDF,
    });

    mockAccessService.findAccessibleKnowledgeBase.mockResolvedValue(sharedKb);
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
    const knowledgeBase = new KnowledgeBase({
      id: knowledgeBaseId,
      name: 'Other Org KB',
      orgId: otherOrgId,
      userId,
    });

    mockAccessService.findAccessibleKnowledgeBase.mockResolvedValue(
      knowledgeBase,
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

  it('should throw DocumentNotInKnowledgeBaseError when document is not found in knowledge base', async () => {
    const knowledgeBase = new KnowledgeBase({
      id: knowledgeBaseId,
      name: 'Municipal Policies',
      orgId,
      userId,
    });

    mockAccessService.findAccessibleKnowledgeBase.mockResolvedValue(
      knowledgeBase,
    );
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
