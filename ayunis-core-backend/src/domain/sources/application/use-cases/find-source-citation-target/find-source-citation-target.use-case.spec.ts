import { randomUUID } from 'crypto';
import type { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { UnexpectedSourceError } from 'src/domain/sources/application/sources.errors';
import { FindSourceCitationTargetQuery } from './find-source-citation-target.query';
import { FindSourceCitationTargetUseCase } from './find-source-citation-target.use-case';

describe('FindSourceCitationTargetUseCase', () => {
  const chunkId = randomUUID();
  const target = {
    chunk: new TextSourceContentChunk({
      id: chunkId,
      content: 'The municipal budget was approved.',
      meta: { startLine: 12, endLine: 14 },
    }),
    source: {
      id: randomUUID(),
      name: 'Budget 2026.pdf',
      createdBy: SourceCreator.USER,
      status: SourceStatus.READY,
      knowledgeBaseId: null,
      url: null,
    },
  };
  let repository: jest.Mocked<SourceRepository>;
  let useCase: FindSourceCitationTargetUseCase;

  beforeEach(() => {
    repository = {
      findCitationTarget: jest.fn(),
    } as unknown as jest.Mocked<SourceRepository>;
    useCase = new FindSourceCitationTargetUseCase(repository);
  });

  it('returns the citation target from the repository', async () => {
    repository.findCitationTarget.mockResolvedValue(target);

    await expect(
      useCase.execute(new FindSourceCitationTargetQuery(chunkId)),
    ).resolves.toEqual(target);
  });

  it('returns null when the chunk does not exist', async () => {
    repository.findCitationTarget.mockResolvedValue(null);

    await expect(
      useCase.execute(new FindSourceCitationTargetQuery(chunkId)),
    ).resolves.toBeNull();
  });

  it('wraps unexpected repository failures', async () => {
    repository.findCitationTarget.mockRejectedValue(
      new Error('citation lookup failed'),
    );

    await expect(
      useCase.execute(new FindSourceCitationTargetQuery(chunkId)),
    ).rejects.toThrow(UnexpectedSourceError);
  });
});
