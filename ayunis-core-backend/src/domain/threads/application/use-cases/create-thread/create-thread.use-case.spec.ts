import { Test, TestingModule } from '@nestjs/testing';
import { CreateThreadUseCase } from './create-thread.use-case';
import { ThreadsRepository } from '../../ports/threads.repository';
import { CreateThreadCommand } from './create-thread.command';
import { Thread } from '../../../domain/thread.entity';
import { Model } from '../../../../models/domain/model.entity';
import { ModelProvider } from '../../../../models/domain/value-objects/model-provider.object';
import { ThreadCreationError } from '../../threads.errors';
import { GetModelUseCase } from 'src/domain/models/application/use-cases/get-model/get-model.use-case';
import { randomUUID } from 'crypto';

describe('CreateThreadUseCase', () => {
  let useCase: CreateThreadUseCase;
  let mockThreadsRepository: jest.Mocked<ThreadsRepository>;
  let mockGetModelUseCase: Partial<GetModelUseCase>;

  beforeEach(async () => {
    mockThreadsRepository = {
      create: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      updateTitle: jest.fn(),
      updateInstruction: jest.fn(),
      updateModel: jest.fn(),
      updateInternetSearch: jest.fn(),
      delete: jest.fn(),
    };

    mockGetModelUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateThreadUseCase,
        {
          provide: ThreadsRepository,
          useValue: mockThreadsRepository,
        },
        {
          provide: GetModelUseCase,
          useValue: mockGetModelUseCase,
        },
      ],
    }).compile();

    useCase = module.get<CreateThreadUseCase>(CreateThreadUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should create a thread successfully', async () => {
    const userId = randomUUID();
    const model = new Model({
      name: 'gpt-4',
      provider: ModelProvider.OPENAI,
      displayName: 'GPT-4',
      canStream: true,
      isReasoning: false,
      isArchived: false,
      isProviderDefault: true,
    });
    const command = new CreateThreadCommand(
      userId,
      'gpt-4',
      ModelProvider.OPENAI,
    );

    const expectedThread = new Thread({
      userId,
      model,
      messages: [],
    });

    jest.spyOn(mockGetModelUseCase, 'execute').mockReturnValue(model);
    mockThreadsRepository.create.mockResolvedValue(expectedThread);

    const result = await useCase.execute(command);

    expect(mockGetModelUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        modelName: 'gpt-4',
        modelProvider: ModelProvider.OPENAI,
      }),
    );
    expect(mockThreadsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        model,
        messages: [],
      }),
    );
    expect(result).toBe(expectedThread);
  });

  it('should throw ThreadCreationError when repository throws', async () => {
    const userId = randomUUID();
    const model = new Model({
      name: 'gpt-4',
      provider: ModelProvider.OPENAI,
      displayName: 'GPT-4',
      canStream: true,
      isReasoning: false,
      isArchived: false,
      isProviderDefault: true,
    });
    const command = new CreateThreadCommand(
      userId,
      'gpt-4',
      ModelProvider.OPENAI,
    );

    const error = new Error('Database error');
    jest.spyOn(mockGetModelUseCase, 'execute').mockReturnValue(model);
    mockThreadsRepository.create.mockRejectedValue(error);

    await expect(useCase.execute(command)).rejects.toThrow(ThreadCreationError);
  });
});
