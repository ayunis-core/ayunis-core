import { Test, TestingModule } from '@nestjs/testing';

// Mock the Transactional decorator
jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (target: any, propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { DeleteSourceUseCase } from './delete-source.use-case';
import { DeleteSourceCommand } from './delete-source.command';
import { DeleteContentUseCase } from 'src/domain/rag/indexers/application/use-cases/delete-content/delete-content.use-case';
import { SourceRepository } from '../../ports/source.repository';
import { randomUUID } from 'crypto';
import { TextType } from 'src/domain/sources/domain/source-type.enum';
import { UrlSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { UnexpectedSourceError } from '../../sources.errors';

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
          provide: SourceRepository,
          useValue: mockSourceRepository,
        },
        {
          provide: DeleteContentUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get<DeleteSourceUseCase>(DeleteSourceUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should wrap repository errors into UnexpectedSourceError', async () => {
    const mockSource = new UrlSource({
      id: randomUUID(),
      url: 'https://example.com',
      name: 'Example URL',
      type: TextType.WEB,
      text: 'Example text',
      contentChunks: [],
    });

    const error = new Error('Repository error');

    (mockSourceRepository.delete as jest.Mock).mockRejectedValue(error);

    await expect(
      useCase.execute(new DeleteSourceCommand(mockSource)),
    ).rejects.toBeInstanceOf(UnexpectedSourceError);

    expect(mockSourceRepository.delete).toHaveBeenCalledWith(mockSource);
  });
});
