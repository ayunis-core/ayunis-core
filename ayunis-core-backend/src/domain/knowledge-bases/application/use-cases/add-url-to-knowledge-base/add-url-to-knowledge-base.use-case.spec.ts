jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: unknown, _propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { AddUrlToKnowledgeBaseUseCase } from './add-url-to-knowledge-base.use-case';
import { AddUrlToKnowledgeBaseCommand } from './add-url-to-knowledge-base.command';
import { KnowledgeBaseRepository } from '../../ports/knowledge-base.repository';
import { KnowledgeBase } from '../../../domain/knowledge-base.entity';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from '../../knowledge-bases.errors';
import { CreateTextSourceUseCase } from 'src/domain/sources/application/use-cases/create-text-source/create-text-source.use-case';
import { UrlSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { TextType } from 'src/domain/sources/domain/source-type.enum';

describe('AddUrlToKnowledgeBaseUseCase', () => {
  let useCase: AddUrlToKnowledgeBaseUseCase;
  let mockRepository: jest.Mocked<KnowledgeBaseRepository>;
  let mockCreateTextSourceUseCase: jest.Mocked<CreateTextSourceUseCase>;

  const userId = '11111111-1111-1111-1111-111111111111' as UUID;
  const orgId = '22222222-2222-2222-2222-222222222222' as UUID;
  const knowledgeBaseId = '33333333-3333-3333-3333-333333333333' as UUID;

  beforeEach(async () => {
    mockRepository = {
      findById: jest.fn(),
      findAllByUserId: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      assignSourceToKnowledgeBase: jest.fn(),
      findSourcesByKnowledgeBaseId: jest.fn(),
      findSourceByIdAndKnowledgeBaseId: jest.fn(),
    } as jest.Mocked<KnowledgeBaseRepository>;

    mockCreateTextSourceUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateTextSourceUseCase>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddUrlToKnowledgeBaseUseCase,
        { provide: KnowledgeBaseRepository, useValue: mockRepository },
        {
          provide: CreateTextSourceUseCase,
          useValue: mockCreateTextSourceUseCase,
        },
      ],
    }).compile();

    useCase = module.get(AddUrlToKnowledgeBaseUseCase);
  });

  it('should create a URL source and assign it to the knowledge base', async () => {
    const knowledgeBase = new KnowledgeBase({
      id: knowledgeBaseId,
      name: 'Stadtratsprotokolle 2025',
      orgId,
      userId,
    });
    mockRepository.findById.mockResolvedValue(knowledgeBase);

    const createdSource = new UrlSource({
      url: 'https://example.com/stadtrat',
      name: 'example.com/stadtrat',
      type: TextType.WEB,
      text: 'Webseite Inhalt...',
      contentChunks: [],
    });
    mockCreateTextSourceUseCase.execute.mockResolvedValue(
      createdSource as never,
    );
    mockRepository.assignSourceToKnowledgeBase.mockResolvedValue(undefined);

    const command = new AddUrlToKnowledgeBaseCommand({
      knowledgeBaseId,
      userId,
      url: 'https://example.com/stadtrat',
    });

    const result = await useCase.execute(command);

    expect(result).toBe(createdSource);
    expect(mockCreateTextSourceUseCase.execute).toHaveBeenCalledTimes(1);
    expect(mockRepository.assignSourceToKnowledgeBase).toHaveBeenCalledWith(
      createdSource.id,
      knowledgeBaseId,
    );
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

    const command = new AddUrlToKnowledgeBaseCommand({
      knowledgeBaseId,
      userId,
      url: 'https://example.com/stadtrat',
    });

    await expect(useCase.execute(command)).rejects.toThrow(
      KnowledgeBaseNotFoundError,
    );
    expect(mockCreateTextSourceUseCase.execute).not.toHaveBeenCalled();
  });

  it('should throw KnowledgeBaseNotFoundError when KB does not exist', async () => {
    mockRepository.findById.mockResolvedValue(null);

    const command = new AddUrlToKnowledgeBaseCommand({
      knowledgeBaseId,
      userId,
      url: 'https://example.com/stadtrat',
    });

    await expect(useCase.execute(command)).rejects.toThrow(
      KnowledgeBaseNotFoundError,
    );
  });

  it('should re-throw ApplicationErrors without wrapping', async () => {
    const knowledgeBase = new KnowledgeBase({
      id: knowledgeBaseId,
      name: 'Stadtratsprotokolle 2025',
      orgId,
      userId,
    });
    mockRepository.findById.mockResolvedValue(knowledgeBase);

    const applicationError = new KnowledgeBaseNotFoundError('some-id');
    mockCreateTextSourceUseCase.execute.mockRejectedValue(applicationError);

    const command = new AddUrlToKnowledgeBaseCommand({
      knowledgeBaseId,
      userId,
      url: 'https://example.com/stadtrat',
    });

    await expect(useCase.execute(command)).rejects.toThrow(applicationError);
  });

  it('should wrap non-ApplicationErrors in UnexpectedKnowledgeBaseError', async () => {
    const knowledgeBase = new KnowledgeBase({
      id: knowledgeBaseId,
      name: 'Stadtratsprotokolle 2025',
      orgId,
      userId,
    });
    mockRepository.findById.mockResolvedValue(knowledgeBase);

    mockCreateTextSourceUseCase.execute.mockRejectedValue(
      new Error('connection timeout'),
    );

    const command = new AddUrlToKnowledgeBaseCommand({
      knowledgeBaseId,
      userId,
      url: 'https://example.com/stadtrat',
    });

    await expect(useCase.execute(command)).rejects.toThrow(
      UnexpectedKnowledgeBaseError,
    );
  });
});
