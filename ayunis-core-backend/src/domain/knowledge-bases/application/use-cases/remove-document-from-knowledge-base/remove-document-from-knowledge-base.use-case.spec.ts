jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: unknown, _propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { RemoveDocumentFromKnowledgeBaseUseCase } from './remove-document-from-knowledge-base.use-case';
import { RemoveDocumentFromKnowledgeBaseCommand } from './remove-document-from-knowledge-base.command';
import { KnowledgeBaseRepository } from '../../ports/knowledge-base.repository';
import { KnowledgeBase } from '../../../domain/knowledge-base.entity';
import {
  KnowledgeBaseNotFoundError,
  DocumentNotInKnowledgeBaseError,
} from '../../knowledge-bases.errors';
import { DeleteSourceUseCase } from 'src/domain/sources/application/use-cases/delete-source/delete-source.use-case';
import { UrlSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { TextType } from 'src/domain/sources/domain/source-type.enum';

describe('RemoveDocumentFromKnowledgeBaseUseCase', () => {
  let useCase: RemoveDocumentFromKnowledgeBaseUseCase;
  let mockRepository: jest.Mocked<KnowledgeBaseRepository>;
  let mockDeleteSourceUseCase: jest.Mocked<DeleteSourceUseCase>;

  const userId = '11111111-1111-1111-1111-111111111111' as UUID;
  const orgId = '22222222-2222-2222-2222-222222222222' as UUID;
  const knowledgeBaseId = '33333333-3333-3333-3333-333333333333' as UUID;
  const documentId = '44444444-4444-4444-4444-444444444444' as UUID;

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

    mockDeleteSourceUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<DeleteSourceUseCase>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemoveDocumentFromKnowledgeBaseUseCase,
        { provide: KnowledgeBaseRepository, useValue: mockRepository },
        {
          provide: DeleteSourceUseCase,
          useValue: mockDeleteSourceUseCase,
        },
      ],
    }).compile();

    useCase = module.get(RemoveDocumentFromKnowledgeBaseUseCase);
  });

  it('should delete the source when it belongs to the knowledge base', async () => {
    const knowledgeBase = new KnowledgeBase({
      id: knowledgeBaseId,
      name: 'Stadtratsprotokolle 2025',
      orgId,
      userId,
    });
    mockRepository.findById.mockResolvedValue(knowledgeBase);

    const source = new UrlSource({
      id: documentId,
      url: 'https://stadt.de/protokoll',
      name: 'Protokoll März 2025',
      type: TextType.WEB,
      text: 'Protokoll Inhalt',
      contentChunks: [],
    });
    mockRepository.findSourceByIdAndKnowledgeBaseId.mockResolvedValue(source);
    mockDeleteSourceUseCase.execute.mockResolvedValue(undefined);

    const command = new RemoveDocumentFromKnowledgeBaseCommand({
      knowledgeBaseId,
      documentId,
      userId,
    });

    await useCase.execute(command);

    expect(mockDeleteSourceUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('should throw DocumentNotInKnowledgeBaseError when document is not in the KB', async () => {
    const knowledgeBase = new KnowledgeBase({
      id: knowledgeBaseId,
      name: 'Stadtratsprotokolle 2025',
      orgId,
      userId,
    });
    mockRepository.findById.mockResolvedValue(knowledgeBase);
    mockRepository.findSourceByIdAndKnowledgeBaseId.mockResolvedValue(null);

    const command = new RemoveDocumentFromKnowledgeBaseCommand({
      knowledgeBaseId,
      documentId,
      userId,
    });

    await expect(useCase.execute(command)).rejects.toThrow(
      DocumentNotInKnowledgeBaseError,
    );
    expect(mockDeleteSourceUseCase.execute).not.toHaveBeenCalled();
  });

  it('should throw KnowledgeBaseNotFoundError when KB does not belong to user', async () => {
    const otherUserId = '99999999-9999-9999-9999-999999999999' as UUID;
    const knowledgeBase = new KnowledgeBase({
      id: knowledgeBaseId,
      name: 'Anderer Benutzer KB',
      orgId,
      userId: otherUserId,
    });
    mockRepository.findById.mockResolvedValue(knowledgeBase);

    const command = new RemoveDocumentFromKnowledgeBaseCommand({
      knowledgeBaseId,
      documentId,
      userId,
    });

    await expect(useCase.execute(command)).rejects.toThrow(
      KnowledgeBaseNotFoundError,
    );
  });
});
