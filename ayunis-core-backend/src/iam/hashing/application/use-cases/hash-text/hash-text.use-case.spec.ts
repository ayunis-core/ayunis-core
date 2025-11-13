import { Test, TestingModule } from '@nestjs/testing';
import { HashTextUseCase } from './hash-text.use-case';
import { HashTextCommand } from './hash-text.command';
import { HashingHandler } from '../../ports/hashing.handler';
import { HashingFailedError } from '../../hashing.errors';

describe('HashTextUseCase', () => {
  let useCase: HashTextUseCase;
  let mockHashingHandler: Partial<HashingHandler>;

  beforeEach(async () => {
    mockHashingHandler = {
      hash: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HashTextUseCase,
        {
          provide: HashingHandler,
          useValue: mockHashingHandler,
        },
      ],
    }).compile();

    useCase = module.get<HashTextUseCase>(HashTextUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should hash text successfully', async () => {
    const command = new HashTextCommand('plaintext123');
    const expectedHash = '$2b$10$hashedvalue123';

    jest.spyOn(mockHashingHandler, 'hash').mockResolvedValue(expectedHash);

    const result = await useCase.execute(command);

    expect(result).toBe(expectedHash);
    expect(mockHashingHandler.hash).toHaveBeenCalledWith('plaintext123');
  });

  it('should throw HashingFailedError for unexpected errors', async () => {
    const command = new HashTextCommand('plaintext123');

    jest
      .spyOn(mockHashingHandler, 'hash')
      .mockRejectedValue(new Error('Unexpected error'));

    await expect(useCase.execute(command)).rejects.toThrow(HashingFailedError);
  });
});
