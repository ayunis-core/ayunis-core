import { Test, TestingModule } from '@nestjs/testing';
import { CompareHashUseCase } from './compare-hash.use-case';
import { CompareHashCommand } from './compare-hash.command';
import { HashingHandler } from '../../ports/hashing.handler';
import { ComparisonFailedError } from '../../hashing.errors';

describe('CompareHashUseCase', () => {
  let useCase: CompareHashUseCase;
  let mockHashingHandler: Partial<HashingHandler>;

  beforeEach(async () => {
    mockHashingHandler = {
      compare: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompareHashUseCase,
        {
          provide: HashingHandler,
          useValue: mockHashingHandler,
        },
      ],
    }).compile();

    useCase = module.get<CompareHashUseCase>(CompareHashUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should compare hash successfully and return true for matching', async () => {
    const command = new CompareHashCommand(
      'plaintext123',
      '$2b$10$hashedvalue123',
    );

    jest.spyOn(mockHashingHandler, 'compare').mockResolvedValue(true);

    const result = await useCase.execute(command);

    expect(result).toBe(true);
    expect(mockHashingHandler.compare).toHaveBeenCalledWith(
      'plaintext123',
      '$2b$10$hashedvalue123',
    );
  });

  it('should compare hash successfully and return false for non-matching', async () => {
    const command = new CompareHashCommand(
      'plaintext123',
      '$2b$10$differenthash',
    );

    jest.spyOn(mockHashingHandler, 'compare').mockResolvedValue(false);

    const result = await useCase.execute(command);

    expect(result).toBe(false);
    expect(mockHashingHandler.compare).toHaveBeenCalledWith(
      'plaintext123',
      '$2b$10$differenthash',
    );
  });

  it('should throw ComparisonFailedError for unexpected errors', async () => {
    const command = new CompareHashCommand(
      'plaintext123',
      '$2b$10$hashedvalue123',
    );

    jest
      .spyOn(mockHashingHandler, 'compare')
      .mockRejectedValue(new Error('Unexpected error'));

    await expect(useCase.execute(command)).rejects.toThrow(
      ComparisonFailedError,
    );
  });
});
