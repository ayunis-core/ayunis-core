import { getLoggerToken } from 'nestjs-pino';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Mock the Transactional decorator
jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: unknown, _propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { UpdateKnowledgeBaseUseCase } from './update-knowledge-base.use-case';
import { UpdateKnowledgeBaseCommand } from './update-knowledge-base.command';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import type { UUID } from 'crypto';

describe('UpdateKnowledgeBaseUseCase', () => {
  let useCase: UpdateKnowledgeBaseUseCase;
  let mockRepository: jest.Mocked<KnowledgeBaseRepository>;

  const userId = '11111111-1111-1111-1111-111111111111' as UUID;
  const orgId = '22222222-2222-2222-2222-222222222222' as UUID;
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
      countSourcesByKnowledgeBaseId: jest.fn(),
      countSourcesByKnowledgeBaseIds: jest.fn(),
      activate: jest.fn(),
      deactivate: jest.fn(),
      isActive: jest.fn(),
      getActiveIds: jest.fn(),
      findActiveAccessible: jest.fn(),
      findPaginatedAccessible: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateKnowledgeBaseUseCase,
        {
          provide: getLoggerToken(UpdateKnowledgeBaseUseCase.name),
          useValue: createPinoLoggerMock(),
        },
        { provide: KnowledgeBaseRepository, useValue: mockRepository },
      ],
    }).compile();

    useCase = module.get(UpdateKnowledgeBaseUseCase);
  });

  it('should update name and description of an existing knowledge base', async () => {
    const existing = new KnowledgeBase({
      id: knowledgeBaseId,
      name: 'Alte Bezeichnung',
      description: 'Alte Beschreibung',
      orgId,
      userId,
      createdAt: new Date('2025-01-01T00:00:00Z'),
    });

    mockRepository.findById.mockResolvedValue(existing);
    mockRepository.save.mockImplementation(async (kb) => kb);

    const command = new UpdateKnowledgeBaseCommand({
      knowledgeBaseId,
      userId,
      name: 'Neue Bezeichnung',
      description: 'Neue Beschreibung',
    });

    const result = await useCase.execute(command);

    expect(result.name).toBe('Neue Bezeichnung');
    expect(result.description).toBe('Neue Beschreibung');
    expect(result.id).toBe(knowledgeBaseId);
    expect(result.createdAt).toEqual(new Date('2025-01-01T00:00:00Z'));
    expect(result.orgId).toBe(orgId);
    expect(result.userId).toBe(userId);
  });

  it('preserves workspace ownership and advances its version', async () => {
    const workspaceId = '55555555-5555-5555-5555-555555555555' as UUID;
    const originKnowledgeBaseId =
      '66666666-6666-6666-6666-666666666666' as UUID;
    const existing = new KnowledgeBase({
      id: knowledgeBaseId,
      name: 'Procurement rules',
      orgId,
      userId,
      workspaceId,
      originKnowledgeBaseId,
      version: 3,
      importedOriginVersion: 2,
      dismissedOriginVersion: 4,
    });
    mockRepository.findById.mockResolvedValue(existing);
    mockRepository.save.mockImplementation(
      async (knowledgeBase) => knowledgeBase,
    );

    const result = await useCase.execute(
      new UpdateKnowledgeBaseCommand({
        knowledgeBaseId,
        userId,
        description: 'Updated procurement rules.',
      }),
    );

    expect(result).toMatchObject({
      workspaceId,
      originKnowledgeBaseId,
      version: 4,
      importedOriginVersion: 2,
      dismissedOriginVersion: 4,
    });
  });

  it('should throw KnowledgeBaseNotFoundError when knowledge base does not exist', async () => {
    mockRepository.findById.mockResolvedValue(null);

    const command = new UpdateKnowledgeBaseCommand({
      knowledgeBaseId,
      userId,
      name: 'Neue Bezeichnung',
      description: 'Neue Beschreibung',
    });

    await expect(useCase.execute(command)).rejects.toThrow(
      KnowledgeBaseNotFoundError,
    );
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('should throw KnowledgeBaseNotFoundError when knowledge base belongs to another user', async () => {
    const otherUserId = '44444444-4444-4444-4444-444444444444' as UUID;
    const existing = new KnowledgeBase({
      id: knowledgeBaseId,
      name: 'Fremde Wissenssammlung',
      orgId,
      userId: otherUserId,
    });

    mockRepository.findById.mockResolvedValue(existing);

    const command = new UpdateKnowledgeBaseCommand({
      knowledgeBaseId,
      userId,
      name: 'Versuch zu ändern',
      description: '',
    });

    await expect(useCase.execute(command)).rejects.toThrow(
      KnowledgeBaseNotFoundError,
    );
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('should only update name when description is not provided', async () => {
    const existing = new KnowledgeBase({
      id: knowledgeBaseId,
      name: 'Alte Bezeichnung',
      description: 'Bestehende Beschreibung',
      orgId,
      userId,
      createdAt: new Date('2025-01-01T00:00:00Z'),
    });

    mockRepository.findById.mockResolvedValue(existing);
    mockRepository.save.mockImplementation(async (kb) => kb);

    const command = new UpdateKnowledgeBaseCommand({
      knowledgeBaseId,
      userId,
      name: 'Neue Bezeichnung',
    });

    const result = await useCase.execute(command);

    expect(result.name).toBe('Neue Bezeichnung');
    expect(result.description).toBe('Bestehende Beschreibung');
  });

  it('should only update description when name is not provided', async () => {
    const existing = new KnowledgeBase({
      id: knowledgeBaseId,
      name: 'Bestehender Name',
      description: 'Alte Beschreibung',
      orgId,
      userId,
      createdAt: new Date('2025-01-01T00:00:00Z'),
    });

    mockRepository.findById.mockResolvedValue(existing);
    mockRepository.save.mockImplementation(async (kb) => kb);

    const command = new UpdateKnowledgeBaseCommand({
      knowledgeBaseId,
      userId,
      description: 'Neue Beschreibung',
    });

    const result = await useCase.execute(command);

    expect(result.name).toBe('Bestehender Name');
    expect(result.description).toBe('Neue Beschreibung');
  });

  it('should wrap unexpected repository errors into UnexpectedKnowledgeBaseError', async () => {
    mockRepository.findById.mockRejectedValue(new Error('Connection refused'));

    const command = new UpdateKnowledgeBaseCommand({
      knowledgeBaseId,
      userId,
      name: 'Neuer Name',
    });

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      UnexpectedKnowledgeBaseError,
    );
  });
});
