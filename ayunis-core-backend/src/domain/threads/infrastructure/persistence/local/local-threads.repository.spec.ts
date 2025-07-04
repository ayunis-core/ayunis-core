import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, UpdateResult } from 'typeorm';
import { LocalThreadsRepository } from './local-threads.repository';
import { ThreadRecord } from './schema/thread.record';
import { ThreadMapper } from './mappers/thread.mapper';
import { PotentialModel } from 'src/domain/models/domain/potential-model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ThreadNotFoundError } from 'src/domain/threads/application/threads.errors';
import { randomUUID } from 'crypto';

describe('LocalThreadsRepository', () => {
  let repository: LocalThreadsRepository;
  let threadRepository: jest.Mocked<Repository<ThreadRecord>>;
  let threadMapper: jest.Mocked<ThreadMapper>;

  beforeEach(async () => {
    const mockThreadRepository = {
      save: jest.fn(),
      findOne: jest.fn(),
      findBy: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const mockThreadMapper = {
      toEntity: jest.fn(),
      toDomain: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalThreadsRepository,
        {
          provide: getRepositoryToken(ThreadRecord),
          useValue: mockThreadRepository,
        },
        {
          provide: ThreadMapper,
          useValue: mockThreadMapper,
        },
      ],
    }).compile();

    repository = module.get<LocalThreadsRepository>(LocalThreadsRepository);
    threadRepository = module.get<Repository<ThreadRecord>>(
      getRepositoryToken(ThreadRecord),
    ) as jest.Mocked<Repository<ThreadRecord>>;
    threadMapper = module.get<ThreadMapper>(
      ThreadMapper,
    ) as jest.Mocked<ThreadMapper>;
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('updateModel', () => {
    const threadId = randomUUID();
    const userId = randomUUID();
    const model = new PotentialModel({
      name: 'gpt-4',
      provider: ModelProvider.OPENAI,
      displayName: 'GPT-4',
      canStream: true,
      isReasoning: false,
      isArchived: false,
      isProviderDefault: true,
    });

    it('should successfully update thread model', async () => {
      const updateResult: UpdateResult = {
        affected: 1,
        raw: {},
        generatedMaps: [],
      };
      threadRepository.update.mockResolvedValue(updateResult);

      await repository.updateModel(threadId, userId, model);

      expect(threadRepository.update).toHaveBeenCalledWith(
        { id: threadId, userId },
        { modelName: model.name, modelProvider: model.provider },
      );
      expect(threadRepository.update).toHaveBeenCalledTimes(1);
    });

    it('should throw ThreadNotFoundError when no rows are affected', async () => {
      const updateResult: UpdateResult = {
        affected: 0,
        raw: {},
        generatedMaps: [],
      };
      threadRepository.update.mockResolvedValue(updateResult);

      await expect(
        repository.updateModel(threadId, userId, model),
      ).rejects.toThrow(ThreadNotFoundError);
    });

    it('should throw ThreadNotFoundError when affected is undefined', async () => {
      const updateResult: UpdateResult = {
        affected: undefined,
        raw: {},
        generatedMaps: [],
      };
      threadRepository.update.mockResolvedValue(updateResult);

      await expect(
        repository.updateModel(threadId, userId, model),
      ).rejects.toThrow(ThreadNotFoundError);
    });

    it('should handle different model providers', async () => {
      const anthropicModel = new PotentialModel({
        name: 'claude-3',
        provider: ModelProvider.ANTHROPIC,
        displayName: 'Claude 3',
        canStream: true,
        isReasoning: false,
        isArchived: false,
        isProviderDefault: true,
      });
      const updateResult: UpdateResult = {
        affected: 1,
        raw: {},
        generatedMaps: [],
      };
      threadRepository.update.mockResolvedValue(updateResult);

      await repository.updateModel(threadId, userId, anthropicModel);

      expect(threadRepository.update).toHaveBeenCalledWith(
        { id: threadId, userId },
        { modelName: 'claude-3', modelProvider: ModelProvider.ANTHROPIC },
      );
    });

    it('should log correct information when updating model', async () => {
      const loggerSpy = jest.spyOn(repository['logger'], 'log');
      const updateResult: UpdateResult = {
        affected: 1,
        raw: {},
        generatedMaps: [],
      };
      threadRepository.update.mockResolvedValue(updateResult);

      await repository.updateModel(threadId, userId, model);

      expect(loggerSpy).toHaveBeenCalledWith('updateModel', {
        id: threadId,
        userId,
        modelName: model.name,
        modelProvider: model.provider,
      });
    });

    it('should propagate database errors', async () => {
      const dbError = new Error('Database connection failed');
      threadRepository.update.mockRejectedValue(dbError);

      await expect(
        repository.updateModel(threadId, userId, model),
      ).rejects.toThrow('Database connection failed');
    });
  });
});
