import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { MarkSourceFailedUseCase } from './mark-source-failed.use-case';
import { MarkSourceFailedCommand } from './mark-source-failed.command';
import { SourceRepository } from '../../ports/source.repository';
import { SourceNotFoundError } from '../../sources.errors';
import { SourceStatus } from '../../../domain/source-status.enum';
import { FileSource } from '../../../domain/sources/text-source.entity';
import { FileType, TextType } from '../../../domain/source-type.enum';

describe('MarkSourceFailedUseCase', () => {
  let useCase: MarkSourceFailedUseCase;
  let mockSourceRepository: jest.Mocked<SourceRepository>;

  const sourceId = '44444444-4444-4444-4444-444444444444' as UUID;

  beforeEach(async () => {
    mockSourceRepository = {
      findById: jest.fn(),
      findByIds: jest.fn(),
      findByKnowledgeBaseId: jest.fn(),
      findStaleProcessingSources: jest.fn(),
      save: jest.fn().mockImplementation(async (source) => source),
      saveTextSource: jest.fn(),
      extractTextLines: jest.fn(),
      findContentChunksByIds: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      updateStatusConditionally: jest.fn(),
      findUnreferencedIds: jest.fn(),
    } as jest.Mocked<SourceRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarkSourceFailedUseCase,
        { provide: SourceRepository, useValue: mockSourceRepository },
      ],
    }).compile();

    useCase = module.get(MarkSourceFailedUseCase);
  });

  it('should mark an existing source as FAILED with error message', async () => {
    const source = new FileSource({
      id: sourceId,
      fileType: FileType.PDF,
      name: 'Protokoll_2025.pdf',
      type: TextType.FILE,
      status: SourceStatus.PROCESSING,
      processingStartedAt: new Date(),
    });
    mockSourceRepository.findById.mockResolvedValue(source);

    await useCase.execute(
      new MarkSourceFailedCommand({
        sourceId,
        errorMessage: 'Failed to upload file to storage',
      }),
    );

    expect(mockSourceRepository.save).toHaveBeenCalledTimes(1);
    const savedSource = mockSourceRepository.save.mock.calls[0][0];
    expect(savedSource.status).toBe(SourceStatus.FAILED);
    expect(savedSource.processingError).toBe(
      'Failed to upload file to storage',
    );
  });

  it('should throw SourceNotFoundError when source does not exist', async () => {
    mockSourceRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(
        new MarkSourceFailedCommand({
          sourceId,
          errorMessage: 'Some error',
        }),
      ),
    ).rejects.toThrow(SourceNotFoundError);
  });
});
