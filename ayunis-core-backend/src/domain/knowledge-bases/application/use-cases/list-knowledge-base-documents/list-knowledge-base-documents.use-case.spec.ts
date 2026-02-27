import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { ListKnowledgeBaseDocumentsUseCase } from './list-knowledge-base-documents.use-case';
import { ListKnowledgeBaseDocumentsQuery } from './list-knowledge-base-documents.query';
import { KnowledgeBaseRepository } from '../../ports/knowledge-base.repository';
import { UrlSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { TextType } from 'src/domain/sources/domain/source-type.enum';

describe('ListKnowledgeBaseDocumentsUseCase', () => {
  let useCase: ListKnowledgeBaseDocumentsUseCase;
  let mockRepository: jest.Mocked<KnowledgeBaseRepository>;

  const knowledgeBaseId = '33333333-3333-3333-3333-333333333333' as UUID;

  beforeEach(async () => {
    mockRepository = {
      findById: jest.fn(),
      findAllByUserId: jest.fn(),
      findByIds: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      assignSourceToKnowledgeBase: jest.fn(),
      findSourcesByKnowledgeBaseId: jest.fn(),
      findSourceByIdAndKnowledgeBaseId: jest.fn(),
    } as jest.Mocked<KnowledgeBaseRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListKnowledgeBaseDocumentsUseCase,
        { provide: KnowledgeBaseRepository, useValue: mockRepository },
      ],
    }).compile();

    useCase = module.get(ListKnowledgeBaseDocumentsUseCase);
  });

  it('should return all documents for a knowledge base', async () => {
    const source = new UrlSource({
      url: 'https://stadt.de/protokoll',
      name: 'Protokoll März 2025',
      type: TextType.WEB,
      text: 'Inhalt',
      contentChunks: [],
    });
    mockRepository.findSourcesByKnowledgeBaseId.mockResolvedValue([source]);

    const query = new ListKnowledgeBaseDocumentsQuery(knowledgeBaseId);

    const result = await useCase.execute(query);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Protokoll März 2025');
    expect(mockRepository.findSourcesByKnowledgeBaseId).toHaveBeenCalledWith(
      knowledgeBaseId,
    );
  });

  it('should return an empty array when knowledge base has no documents', async () => {
    mockRepository.findSourcesByKnowledgeBaseId.mockResolvedValue([]);

    const query = new ListKnowledgeBaseDocumentsQuery(knowledgeBaseId);

    const result = await useCase.execute(query);

    expect(result).toHaveLength(0);
  });
});
