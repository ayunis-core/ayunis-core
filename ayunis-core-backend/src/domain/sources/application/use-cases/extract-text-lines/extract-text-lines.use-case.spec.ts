import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ExtractTextLinesUseCase } from './extract-text-lines.use-case';
import { ExtractTextLinesQuery } from './extract-text-lines.query';
import { SourceRepository } from '../../ports/source.repository';
import { randomUUID } from 'crypto';
import { UnexpectedSourceError } from '../../sources.errors';

describe('ExtractTextLinesUseCase', () => {
  let useCase: ExtractTextLinesUseCase;
  let mockSourceRepository: Partial<SourceRepository>;

  beforeAll(async () => {
    mockSourceRepository = {
      extractTextLines: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExtractTextLinesUseCase,
        {
          provide: SourceRepository,
          useValue: mockSourceRepository,
        },
      ],
    }).compile();

    useCase = module.get<ExtractTextLinesUseCase>(ExtractTextLinesUseCase);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return extracted text lines with total line count', async () => {
    const sourceId = randomUUID();
    const expected = {
      totalLines: 150,
      text: 'Article 1: General Provisions\nArticle 2: Definitions',
    };

    (mockSourceRepository.extractTextLines as jest.Mock).mockResolvedValue(
      expected,
    );

    const result = await useCase.execute(
      new ExtractTextLinesQuery({ sourceId, startLine: 1, endLine: 50 }),
    );

    expect(result).toEqual(expected);
    expect(mockSourceRepository.extractTextLines).toHaveBeenCalledWith(
      sourceId,
      1,
      50,
    );
  });

  it('should return null when source text is not found', async () => {
    const sourceId = randomUUID();

    (mockSourceRepository.extractTextLines as jest.Mock).mockResolvedValue(
      null,
    );

    const result = await useCase.execute(
      new ExtractTextLinesQuery({ sourceId, startLine: 1, endLine: 100 }),
    );

    expect(result).toBeNull();
  });

  it('should wrap unexpected errors in UnexpectedSourceError', async () => {
    const sourceId = randomUUID();

    (mockSourceRepository.extractTextLines as jest.Mock).mockRejectedValue(
      new Error('Database connection lost'),
    );

    await expect(
      useCase.execute(
        new ExtractTextLinesQuery({ sourceId, startLine: 1, endLine: 50 }),
      ),
    ).rejects.toThrow(UnexpectedSourceError);
  });
});
