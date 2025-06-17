import { Test, TestingModule } from '@nestjs/testing';
import { GetSourceByIdUseCase } from './get-source-by-id.use-case';
import { GetSourceByIdQuery } from './get-source-by-id.query';
import {
  SourceRepository,
  SOURCE_REPOSITORY,
} from '../../ports/source.repository';
import { Source } from '../../../domain/source.entity';
import { randomUUID } from 'crypto';

describe('GetSourceByIdUseCase', () => {
  let useCase: GetSourceByIdUseCase;
  let mockSourceRepository: Partial<SourceRepository>;

  beforeEach(async () => {
    mockSourceRepository = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetSourceByIdUseCase,
        {
          provide: SOURCE_REPOSITORY,
          useValue: mockSourceRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetSourceByIdUseCase>(GetSourceByIdUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should return a source when found', async () => {
    const sourceId = randomUUID();
    const mockSource = { id: sourceId } as Source;

    (mockSourceRepository.findById as jest.Mock).mockResolvedValue(mockSource);

    const result = await useCase.execute(new GetSourceByIdQuery(sourceId));

    expect(result).toBe(mockSource);
    expect(mockSourceRepository.findById).toHaveBeenCalledWith(sourceId);
  });

  it('should return null when source not found', async () => {
    const sourceId = randomUUID();

    (mockSourceRepository.findById as jest.Mock).mockResolvedValue(null);

    const result = await useCase.execute(new GetSourceByIdQuery(sourceId));

    expect(result).toBeNull();
    expect(mockSourceRepository.findById).toHaveBeenCalledWith(sourceId);
  });
});
