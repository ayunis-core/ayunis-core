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
        {
          provide:
            require('src/domain/rag/indexers/application/use-cases/delete-content/delete-content.use-case')
              .DeleteContentUseCase,
          useValue: { execute: jest.fn() },
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

    (mockSourceRepository.delete as jest.Mock).mockResolvedValue(undefined);

    await useCase.execute(new DeleteSourceCommand({ id: sourceId } as any));

    expect(mockSourceRepository.delete).toHaveBeenCalledWith({
      id: sourceId,
    } as any);
  });

  it('should handle repository errors', async () => {
    const sourceId = randomUUID();
    const error = new Error('Repository error');

    (mockSourceRepository.delete as jest.Mock).mockRejectedValue(error);

    await expect(
      useCase.execute(new DeleteSourceCommand({ id: sourceId } as any)),
    ).rejects.toThrow('Repository error');
    expect(mockSourceRepository.delete).toHaveBeenCalledWith({
      id: sourceId,
    } as any);
  });
});
