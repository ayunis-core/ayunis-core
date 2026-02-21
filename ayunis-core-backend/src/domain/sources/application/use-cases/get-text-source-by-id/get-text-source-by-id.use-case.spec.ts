import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { GetTextSourceByIdUseCase } from './get-text-source-by-id.use-case';
import { GetTextSourceByIdQuery } from './get-text-source-by-id.query';
import { SourceRepository } from '../../ports/source.repository';
import type { Source } from '../../../domain/source.entity';
import { randomUUID } from 'crypto';
import { SourceNotFoundError } from '../../sources.errors';

describe('GetSourceByIdUseCase', () => {
  let useCase: GetTextSourceByIdUseCase;
  let mockSourceRepository: Partial<SourceRepository>;

  beforeAll(async () => {
    mockSourceRepository = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetTextSourceByIdUseCase,
        {
          provide: SourceRepository,
          useValue: mockSourceRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetTextSourceByIdUseCase>(GetTextSourceByIdUseCase);
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should return a source when found', async () => {
    const sourceId = randomUUID();
    const mockSource = { id: sourceId } as Source;

    (mockSourceRepository.findById as jest.Mock).mockResolvedValue(mockSource);

    const result = await useCase.execute(new GetTextSourceByIdQuery(sourceId));

    expect(result).toBe(mockSource);
    expect(mockSourceRepository.findById).toHaveBeenCalledWith(sourceId);
  });

  it('should throw SourceNotFoundError when source not found', async () => {
    const sourceId = randomUUID();

    (mockSourceRepository.findById as jest.Mock).mockResolvedValue(undefined);

    await expect(
      useCase.execute(new GetTextSourceByIdQuery(sourceId)),
    ).rejects.toThrow(SourceNotFoundError);

    expect(mockSourceRepository.findById).toHaveBeenCalledWith(sourceId);
  });
});
