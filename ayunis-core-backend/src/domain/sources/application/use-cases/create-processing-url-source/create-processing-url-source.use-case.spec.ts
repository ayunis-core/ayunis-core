import { createMockSourceRepository } from 'src/domain/sources/application/testing/source.fixtures';
import type { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import {
  ReindexInterval,
  ReindexIntervalUnit,
} from 'src/domain/sources/domain/reindex-interval';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { UrlSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { CreateProcessingUrlSourceCommand } from './create-processing-url-source.command';
import { CreateProcessingUrlSourceUseCase } from './create-processing-url-source.use-case';

describe('CreateProcessingUrlSourceUseCase', () => {
  let sourceRepository: jest.Mocked<SourceRepository>;
  let useCase: CreateProcessingUrlSourceUseCase;

  beforeEach(() => {
    sourceRepository = createMockSourceRepository();
    useCase = new CreateProcessingUrlSourceUseCase(sourceRepository);
  });

  it('creates an unscheduled processing source when no interval is given', async () => {
    const source = await useCase.execute(
      new CreateProcessingUrlSourceCommand({
        url: 'https://www.stadt.example/abfall',
        maxDepth: 1,
      }),
    );

    expect(source).toBeInstanceOf(UrlSource);
    expect(source).toMatchObject({
      status: SourceStatus.PROCESSING,
      reindexInterval: null,
      nextReindexAt: null,
    });
  });

  it('schedules the first re-index one interval after creation', async () => {
    const interval = new ReindexInterval(1, ReindexIntervalUnit.MONTHS);
    const before = new Date();

    const source = await useCase.execute(
      new CreateProcessingUrlSourceCommand({
        url: 'https://www.stadt.example/abfall',
        maxDepth: 1,
        reindexInterval: interval,
      }),
    );
    const after = new Date();

    expect(source.reindexInterval).toBe(interval);
    expect(source.nextReindexAt!.getTime()).toBeGreaterThanOrEqual(
      interval.addTo(before).getTime(),
    );
    expect(source.nextReindexAt!.getTime()).toBeLessThanOrEqual(
      interval.addTo(after).getTime(),
    );
    expect(sourceRepository.save).toHaveBeenCalledWith(source);
  });
});
