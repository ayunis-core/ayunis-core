import type { UUID } from 'crypto';
import { EmbeddingModelPermittedEvent } from 'src/domain/models/application/events/embedding-model-permitted.event';
import type { FlagStaleSourcesUseCase } from 'src/domain/sources/application/use-cases/flag-stale-sources/flag-stale-sources.use-case';
import { EmbeddingModelPermittedListener } from './embedding-model-permitted.listener';

const ORG_ID = '11111111-1111-1111-1111-111111111111' as UUID;
const MODEL_ID = '22222222-2222-2222-2222-222222222222' as UUID;
const SOURCE_ID = '33333333-3333-3333-3333-333333333333' as UUID;

describe('EmbeddingModelPermittedListener', () => {
  it('queues the flagged sources only once the permit has committed', async () => {
    const flagStaleSources = {
      execute: jest.fn().mockResolvedValue([SOURCE_ID]),
    };
    const reindexQueue = { enqueue: jest.fn().mockResolvedValue(undefined) };
    const listener = new EmbeddingModelPermittedListener(
      flagStaleSources as unknown as FlagStaleSourcesUseCase,
      reindexQueue,
    );
    const event = new EmbeddingModelPermittedEvent(ORG_ID, MODEL_ID);

    await listener.handle(event);
    expect(reindexQueue.enqueue).not.toHaveBeenCalled();

    for (const task of event.takeAfterCommitTasks()) await task();
    expect(reindexQueue.enqueue).toHaveBeenCalledWith(ORG_ID, [SOURCE_ID]);
  });
});
