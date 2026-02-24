import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Mock the Transactional decorator
jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: unknown, _propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { DeleteKnowledgeBaseUseCase } from './delete-knowledge-base.use-case';
import { DeleteKnowledgeBaseCommand } from './delete-knowledge-base.command';
import { KnowledgeBaseRepository } from '../../ports/knowledge-base.repository';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { DeleteSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.use-case';
import { DeleteSourcesCommand } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.command';
import { KnowledgeBase } from '../../../domain/knowledge-base.entity';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from '../../knowledge-bases.errors';
import { UrlSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { TextType } from 'src/domain/sources/domain/source-type.enum';
import type { UUID } from 'crypto';

describe('DeleteKnowledgeBaseUseCase', () => {
  let useCase: DeleteKnowledgeBaseUseCase;
  let mockKbRepository: jest.Mocked<KnowledgeBaseRepository>;
  let mockSourceRepository: jest.Mocked<
    Pick<SourceRepository, 'findByKnowledgeBaseId'>
  >;
  let mockDeleteSourcesUseCase: jest.Mocked<
    Pick<DeleteSourcesUseCase, 'execute'>
  >;

  const userId = '11111111-1111-1111-1111-111111111111' as UUID;
  const orgId = '22222222-2222-2222-2222-222222222222' as UUID;
  const knowledgeBaseId = '33333333-3333-3333-3333-333333333333' as UUID;

  beforeEach(async () => {
    mockKbRepository = {
      findById: jest.fn(),
      findAllByUserId: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      assignSourceToKnowledgeBase: jest.fn(),
      findSourcesByKnowledgeBaseId: jest.fn(),
      findSourceByIdAndKnowledgeBaseId: jest.fn(),
    } as jest.Mocked<KnowledgeBaseRepository>;

    mockSourceRepository = {
      findByKnowledgeBaseId: jest.fn(),
    };

    mockDeleteSourcesUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteKnowledgeBaseUseCase,
        { provide: KnowledgeBaseRepository, useValue: mockKbRepository },
        { provide: SourceRepository, useValue: mockSourceRepository },
        { provide: DeleteSourcesUseCase, useValue: mockDeleteSourcesUseCase },
      ],
    }).compile();

    useCase = module.get(DeleteKnowledgeBaseUseCase);
  });

  it('should delete associated sources and then the knowledge base', async () => {
    const existing = new KnowledgeBase({
      id: knowledgeBaseId,
      name: 'Stadtratsprotokolle 2025',
      orgId,
      userId,
    });

    const sources = [
      new UrlSource({
        id: '44444444-4444-4444-4444-444444444444' as UUID,
        url: 'https://gemeinde-musterstadt.de/protokoll-01.pdf',
        name: 'Protokoll Januar',
        type: TextType.WEB,
        text: 'Protokoll-Inhalt',
        contentChunks: [],
      }),
      new UrlSource({
        id: '55555555-5555-5555-5555-555555555555' as UUID,
        url: 'https://gemeinde-musterstadt.de/protokoll-02.pdf',
        name: 'Protokoll Februar',
        type: TextType.WEB,
        text: 'Protokoll-Inhalt',
        contentChunks: [],
      }),
    ];

    mockKbRepository.findById.mockResolvedValue(existing);
    mockSourceRepository.findByKnowledgeBaseId.mockResolvedValue(sources);
    mockDeleteSourcesUseCase.execute.mockResolvedValue(undefined);
    mockKbRepository.delete.mockResolvedValue(undefined);

    await useCase.execute(
      new DeleteKnowledgeBaseCommand({ knowledgeBaseId, userId }),
    );

    expect(mockSourceRepository.findByKnowledgeBaseId).toHaveBeenCalledWith(
      knowledgeBaseId,
    );
    expect(mockDeleteSourcesUseCase.execute).toHaveBeenCalledWith(
      new DeleteSourcesCommand(sources),
    );
    expect(mockKbRepository.delete).toHaveBeenCalledWith(existing);
  });

  it('should delete knowledge base when no sources exist', async () => {
    const existing = new KnowledgeBase({
      id: knowledgeBaseId,
      name: 'Leere Wissensdatenbank',
      orgId,
      userId,
    });

    mockKbRepository.findById.mockResolvedValue(existing);
    mockSourceRepository.findByKnowledgeBaseId.mockResolvedValue([]);
    mockDeleteSourcesUseCase.execute.mockResolvedValue(undefined);
    mockKbRepository.delete.mockResolvedValue(undefined);

    await useCase.execute(
      new DeleteKnowledgeBaseCommand({ knowledgeBaseId, userId }),
    );

    expect(mockDeleteSourcesUseCase.execute).toHaveBeenCalledWith(
      new DeleteSourcesCommand([]),
    );
    expect(mockKbRepository.delete).toHaveBeenCalledWith(existing);
  });

  it('should throw KnowledgeBaseNotFoundError when knowledge base does not exist', async () => {
    mockKbRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(
        new DeleteKnowledgeBaseCommand({ knowledgeBaseId, userId }),
      ),
    ).rejects.toThrow(KnowledgeBaseNotFoundError);

    expect(mockSourceRepository.findByKnowledgeBaseId).not.toHaveBeenCalled();
    expect(mockDeleteSourcesUseCase.execute).not.toHaveBeenCalled();
    expect(mockKbRepository.delete).not.toHaveBeenCalled();
  });

  it('should throw KnowledgeBaseNotFoundError when knowledge base belongs to another user', async () => {
    const otherUserId = '66666666-6666-6666-6666-666666666666' as UUID;
    const existing = new KnowledgeBase({
      id: knowledgeBaseId,
      name: 'Fremde Wissensbasis',
      orgId,
      userId: otherUserId,
    });

    mockKbRepository.findById.mockResolvedValue(existing);

    await expect(
      useCase.execute(
        new DeleteKnowledgeBaseCommand({ knowledgeBaseId, userId }),
      ),
    ).rejects.toThrow(KnowledgeBaseNotFoundError);

    expect(mockSourceRepository.findByKnowledgeBaseId).not.toHaveBeenCalled();
    expect(mockDeleteSourcesUseCase.execute).not.toHaveBeenCalled();
    expect(mockKbRepository.delete).not.toHaveBeenCalled();
  });

  it('should delete sources before deleting the knowledge base', async () => {
    const existing = new KnowledgeBase({
      id: knowledgeBaseId,
      name: 'Verordnungen',
      orgId,
      userId,
    });

    mockKbRepository.findById.mockResolvedValue(existing);
    mockSourceRepository.findByKnowledgeBaseId.mockResolvedValue([]);

    const callOrder: string[] = [];
    mockDeleteSourcesUseCase.execute.mockImplementation(async () => {
      callOrder.push('deleteSources');
    });
    mockKbRepository.delete.mockImplementation(async () => {
      callOrder.push('deleteKnowledgeBase');
    });

    await useCase.execute(
      new DeleteKnowledgeBaseCommand({ knowledgeBaseId, userId }),
    );

    expect(callOrder).toEqual(['deleteSources', 'deleteKnowledgeBase']);
  });

  it('should wrap unexpected repository errors into UnexpectedKnowledgeBaseError', async () => {
    mockKbRepository.findById.mockRejectedValue(
      new Error('Connection refused'),
    );

    await expect(
      useCase.execute(
        new DeleteKnowledgeBaseCommand({ knowledgeBaseId, userId }),
      ),
    ).rejects.toBeInstanceOf(UnexpectedKnowledgeBaseError);
  });
});
