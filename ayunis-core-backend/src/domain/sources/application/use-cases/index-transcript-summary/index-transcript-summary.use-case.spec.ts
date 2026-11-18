jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: unknown, _propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import type { UUID } from 'crypto';
import { PermittedEmbeddingModelNotFoundForOrgError } from 'src/domain/models/application/models.errors';
import type { IngestBulkContentUseCase } from 'src/domain/rag/indexers/application/use-cases/ingest-bulk-content/ingest-bulk-content.use-case';
import type { SplitTextUseCase } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.use-case';
import {
  SplitResult,
  TextChunk,
} from 'src/domain/rag/splitters/domain/split-result.entity';
import type { SourceTranscriptRepository } from 'src/domain/sources/application/ports/source-transcript.repository';
import { createMockSourceReindexRepository } from 'src/domain/sources/application/testing/source.fixtures';
import { IndexTranscriptSummaryCommand } from './index-transcript-summary.command';
import { IndexTranscriptSummaryUseCase } from './index-transcript-summary.use-case';

const SOURCE_ID = '11111111-1111-1111-1111-111111111111' as UUID;
const ORG_ID = '22222222-2222-2222-2222-222222222222' as UUID;

describe('IndexTranscriptSummaryUseCase', () => {
  it('keeps a summary written while the org has no embedding model, for the next model to index', async () => {
    const transcripts = {
      addSummaryChunks: jest.fn().mockResolvedValue('added'),
    };
    const splitText = {
      execute: jest
        .fn()
        .mockReturnValue(new SplitResult([new TextChunk('## Beschlüsse')], {})),
    };
    const ingest = {
      execute: jest
        .fn()
        .mockRejectedValue(
          new PermittedEmbeddingModelNotFoundForOrgError(ORG_ID),
        ),
    };
    const reindexRepository = createMockSourceReindexRepository();
    const useCase = new IndexTranscriptSummaryUseCase(
      transcripts as unknown as SourceTranscriptRepository,
      splitText as unknown as SplitTextUseCase,
      ingest as unknown as IngestBulkContentUseCase,
      reindexRepository,
    );

    await expect(
      useCase.execute(
        new IndexTranscriptSummaryCommand(SOURCE_ID, ORG_ID, '## Beschlüsse'),
      ),
    ).resolves.toBe(true);
    expect(reindexRepository.recordEmbeddingModel).toHaveBeenCalledWith(
      SOURCE_ID,
      null,
    );
  });
});
