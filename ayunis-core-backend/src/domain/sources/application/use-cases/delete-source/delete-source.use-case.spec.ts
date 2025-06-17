import { Test, TestingModule } from '@nestjs/testing';
import { DeleteSourceUseCase } from './delete-source.use-case';
import { DeleteSourceCommand } from './delete-source.command';
import {
  SourceRepository,
  SOURCE_REPOSITORY,
} from '../../ports/source.repository';
import { randomUUID } from 'crypto';

describe('DeleteSourceUseCase', () => {
  let useCase: DeleteSourceUseCase;
  let mockSourceRepository: Partial<SourceRepository>;

  beforeEach(async () => {
    mockSourceRepository = {
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteSourceUseCase,
        {
          provide: SOURCE_REPOSITORY,
          useValue: mockSourceRepository,
        },
      ],
    }).compile();

    useCase = module.get<DeleteSourceUseCase>(DeleteSourceUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should delete a source successfully', async () => {
    const sourceId = randomUUID();
    const userId = randomUUID();

    (mockSourceRepository.delete as jest.Mock).mockResolvedValue(undefined);

    await useCase.execute(new DeleteSourceCommand(sourceId, userId));

    expect(mockSourceRepository.delete).toHaveBeenCalledWith(sourceId);
  });

  it('should handle repository errors', async () => {
    const sourceId = randomUUID();
    const error = new Error('Repository error');
    const userId = randomUUID();

    (mockSourceRepository.delete as jest.Mock).mockRejectedValue(error);

    await expect(
      useCase.execute(new DeleteSourceCommand(sourceId, userId)),
    ).rejects.toThrow('Repository error');
    expect(mockSourceRepository.delete).toHaveBeenCalledWith(sourceId);
  });
});
