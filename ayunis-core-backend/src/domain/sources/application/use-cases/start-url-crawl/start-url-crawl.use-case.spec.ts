import type { UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import type { CreateProcessingUrlSourceUseCase } from 'src/domain/sources/application/use-cases/create-processing-url-source/create-processing-url-source.use-case';
import type { CreateProcessingUrlSourceCommand } from 'src/domain/sources/application/use-cases/create-processing-url-source/create-processing-url-source.command';
import type { EnqueueUrlCrawlUseCase } from 'src/domain/sources/application/use-cases/enqueue-url-crawl/enqueue-url-crawl.use-case';
import type { MarkSourceFailedUseCase } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.use-case';
import {
  ReindexInterval,
  ReindexIntervalUnit,
} from 'src/domain/sources/domain/reindex-interval';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { TextType } from 'src/domain/sources/domain/source-type.enum';
import { UrlSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { StartUrlCrawlCommand } from './start-url-crawl.command';
import { StartUrlCrawlUseCase } from './start-url-crawl.use-case';

const ORG_ID = '00000000-0000-0000-0000-000000000010' as UUID;
const USER_ID = '00000000-0000-0000-0000-000000000020' as UUID;

describe('StartUrlCrawlUseCase', () => {
  const createdSource = new UrlSource({
    name: 'www.stadt.example',
    type: TextType.WEB,
    url: 'https://www.stadt.example/abfall',
    status: SourceStatus.PROCESSING,
  });
  let createProcessingUrlSource: {
    execute: jest.Mock<Promise<UrlSource>, [CreateProcessingUrlSourceCommand]>;
  };
  let useCase: StartUrlCrawlUseCase;

  beforeEach(() => {
    createProcessingUrlSource = {
      execute: jest.fn().mockResolvedValue(createdSource),
    };
    const context = new Map<string, UUID>([
      ['orgId', ORG_ID],
      ['userId', USER_ID],
    ]);
    useCase = new StartUrlCrawlUseCase(
      createProcessingUrlSource as unknown as CreateProcessingUrlSourceUseCase,
      { execute: jest.fn() } as unknown as MarkSourceFailedUseCase,
      { execute: jest.fn() } as unknown as EnqueueUrlCrawlUseCase,
      { get: (key: string) => context.get(key) } as unknown as ContextService,
    );
  });

  it('creates the source with the requested re-index interval', async () => {
    const interval = new ReindexInterval(2, ReindexIntervalUnit.WEEKS);

    await useCase.execute(
      new StartUrlCrawlCommand({
        url: 'https://www.stadt.example/abfall',
        maxDepth: 1,
        reindexInterval: interval,
      }),
    );

    expect(createProcessingUrlSource.execute).toHaveBeenCalledWith(
      expect.objectContaining({ reindexInterval: interval }),
    );
  });

  it('creates an unscheduled source when no interval is requested', async () => {
    await useCase.execute(
      new StartUrlCrawlCommand({
        url: 'https://www.stadt.example/abfall',
        maxDepth: 1,
      }),
    );

    expect(createProcessingUrlSource.execute).toHaveBeenCalledWith(
      expect.objectContaining({ reindexInterval: null }),
    );
  });
});
