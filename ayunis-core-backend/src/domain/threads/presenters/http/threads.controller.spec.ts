import { Test, TestingModule } from '@nestjs/testing';
import { ThreadsController } from './threads.controller';
import { CreateFileSourceUseCase } from '../../../sources/application/use-cases/create-file-source/create-file-source.use-case';
import { DeleteSourceUseCase } from '../../../sources/application/use-cases/delete-source/delete-source.use-case';
import { SourceDtoMapper } from './mappers/source.mapper';
import { GetThreadDtoMapper } from './mappers/get-thread.mapper';
import { CreateThreadUseCase } from '../../application/use-cases/create-thread/create-thread.use-case';
import { FindThreadUseCase } from '../../application/use-cases/find-thread/find-thread.use-case';
import { FindAllThreadsUseCase } from '../../application/use-cases/find-all-threads/find-all-threads.use-case';
import { DeleteThreadUseCase } from '../../application/use-cases/delete-thread/delete-thread.use-case';
import { AddSourceToThreadUseCase } from '../../application/use-cases/add-source-to-thread/add-source-to-thread.use-case';
import { RemoveSourceFromThreadUseCase } from '../../application/use-cases/remove-source-from-thread/remove-source-from-thread.use-case';
import { GetThreadSourcesUseCase } from '../../application/use-cases/get-thread-sources/get-thread-sources.use-case';
import { UpdateThreadInstructionUseCase } from '../../application/use-cases/update-thread-instruction/update-thread-instruction.use-case';
import { UpdateThreadModelUseCase } from '../../application/use-cases/update-thread-model/update-thread-model.use-case';
import { UpdateThreadInternetSearchUseCase } from '../../application/use-cases/update-thread-internet-search/update-thread-internet-search.use-case';
import { UpdateThreadModelCommand } from '../../application/use-cases/update-thread-model/update-thread-model.command';
import { PotentialModel } from '../../../models/domain/potential-model';
import { ModelProvider } from '../../../models/domain/value-objects/model-provider.enum';
import { randomUUID } from 'crypto';

describe('ThreadsController', () => {
  let controller: ThreadsController;
  let updateThreadModelUseCase: jest.Mocked<UpdateThreadModelUseCase>;

  beforeEach(async () => {
    const mockCreateThreadUseCase = {
      execute: jest.fn(),
    };

    const mockFindThreadUseCase = {
      execute: jest.fn(),
    };

    const mockFindAllThreadsUseCase = {
      execute: jest.fn(),
    };

    const mockDeleteThreadUseCase = {
      execute: jest.fn(),
    };

    const mockAddSourceToThreadUseCase = {
      execute: jest.fn(),
    };

    const mockRemoveSourceFromThreadUseCase = {
      execute: jest.fn(),
    };

    const mockGetThreadSourcesUseCase = {
      execute: jest.fn(),
    };

    const mockUpdateThreadInstructionUseCase = {
      execute: jest.fn(),
    };

    const mockUpdateThreadModelUseCase = {
      execute: jest.fn(),
    };

    const mockUpdateThreadInternetSearchUseCase = {
      execute: jest.fn(),
    };

    const mockCreateFileSourceUseCase = {
      execute: jest.fn(),
    };

    const mockDeleteSourceUseCase = {
      execute: jest.fn(),
    };

    const mockSourceDtoMapper = {
      toDto: jest.fn(),
    };

    const mockThreadDtoMapper = {
      toDto: jest.fn(),
      toDtoArray: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ThreadsController],
      providers: [
        {
          provide: CreateThreadUseCase,
          useValue: mockCreateThreadUseCase,
        },
        {
          provide: FindThreadUseCase,
          useValue: mockFindThreadUseCase,
        },
        {
          provide: FindAllThreadsUseCase,
          useValue: mockFindAllThreadsUseCase,
        },
        {
          provide: DeleteThreadUseCase,
          useValue: mockDeleteThreadUseCase,
        },
        {
          provide: AddSourceToThreadUseCase,
          useValue: mockAddSourceToThreadUseCase,
        },
        {
          provide: RemoveSourceFromThreadUseCase,
          useValue: mockRemoveSourceFromThreadUseCase,
        },
        {
          provide: GetThreadSourcesUseCase,
          useValue: mockGetThreadSourcesUseCase,
        },
        {
          provide: UpdateThreadInstructionUseCase,
          useValue: mockUpdateThreadInstructionUseCase,
        },
        {
          provide: UpdateThreadModelUseCase,
          useValue: mockUpdateThreadModelUseCase,
        },
        {
          provide: UpdateThreadInternetSearchUseCase,
          useValue: mockUpdateThreadInternetSearchUseCase,
        },
        {
          provide: CreateFileSourceUseCase,
          useValue: mockCreateFileSourceUseCase,
        },
        {
          provide: DeleteSourceUseCase,
          useValue: mockDeleteSourceUseCase,
        },
        {
          provide: SourceDtoMapper,
          useValue: mockSourceDtoMapper,
        },
        {
          provide: GetThreadDtoMapper,
          useValue: mockThreadDtoMapper,
        },
      ],
    }).compile();

    controller = module.get<ThreadsController>(ThreadsController);
    updateThreadModelUseCase = module.get<UpdateThreadModelUseCase>(
      UpdateThreadModelUseCase,
    ) as jest.Mocked<UpdateThreadModelUseCase>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('updateModel', () => {
    it('should update thread model with valid data', async () => {
      const userId = randomUUID();
      const threadId = randomUUID();
      const updateModelDto = {
        modelName: 'gpt-4',
        modelProvider: ModelProvider.OPENAI,
      };

      updateThreadModelUseCase.execute.mockResolvedValue(undefined);

      await controller.updateModel(userId, threadId, updateModelDto);

      expect(updateThreadModelUseCase.execute).toHaveBeenCalledWith(
        expect.any(UpdateThreadModelCommand),
      );

      const calledCommand = updateThreadModelUseCase.execute.mock.calls[0][0];
      expect(calledCommand.threadId).toBe(threadId);
      expect(calledCommand.userId).toBe(userId);
      expect(calledCommand.modelName).toBe('gpt-4');
      expect(calledCommand.modelProvider).toBe(ModelProvider.OPENAI);
    });

    it('should create correct Model instance', async () => {
      const userId = randomUUID();
      const threadId = randomUUID();
      const updateModelDto = {
        modelName: 'claude-3',
        modelProvider: ModelProvider.ANTHROPIC,
      };

      updateThreadModelUseCase.execute.mockResolvedValue(undefined);

      await controller.updateModel(userId, threadId, updateModelDto);

      const calledCommand = updateThreadModelUseCase.execute.mock.calls[0][0];
      expect(calledCommand.modelName).toBe('claude-3');
      expect(calledCommand.modelProvider).toBe(ModelProvider.ANTHROPIC);
    });

    it('should handle different model providers', async () => {
      const userId = randomUUID();
      const threadId = randomUUID();
      const updateModelDto = {
        modelName: 'llama-2',
        modelProvider: ModelProvider.OLLAMA,
      };

      updateThreadModelUseCase.execute.mockResolvedValue(undefined);

      await controller.updateModel(userId, threadId, updateModelDto);

      const calledCommand = updateThreadModelUseCase.execute.mock.calls[0][0];
      expect(calledCommand.modelProvider).toBe(ModelProvider.OLLAMA);
    });

    it('should propagate service errors', async () => {
      const userId = randomUUID();
      const threadId = randomUUID();
      const updateModelDto = {
        modelName: 'gpt-4',
        modelProvider: ModelProvider.OPENAI,
      };

      const serviceError = new Error('Service error');
      updateThreadModelUseCase.execute.mockRejectedValue(serviceError);

      await expect(
        controller.updateModel(userId, threadId, updateModelDto),
      ).rejects.toThrow('Service error');
    });
  });
});
