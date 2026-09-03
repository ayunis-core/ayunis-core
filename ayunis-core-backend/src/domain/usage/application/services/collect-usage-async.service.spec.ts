import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { ContextService } from 'src/common/context/services/context.service';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import type { CollectUsageUseCase } from 'src/domain/usage/application/use-cases/collect-usage/collect-usage.use-case';
import { RunUsageCollectionEvent } from 'src/domain/usage/application/events/run-usage-collection.event';
import { CollectUsageAsyncService } from './collect-usage-async.service';

const model = {
  name: 'Municipal Assistant',
  provider: 'openai',
} as LanguageModel;

async function settleAsyncCollection(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

describe('CollectUsageAsyncService run telemetry', () => {
  const collectUsageUseCase = {
    execute: jest.fn(),
  } as unknown as jest.Mocked<CollectUsageUseCase>;
  const eventEmitter = {
    emitAsync: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<EventEmitter2>;
  const service = new CollectUsageAsyncService(
    collectUsageUseCase,
    { get: jest.fn() } as unknown as ContextService,
    eventEmitter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    eventEmitter.emitAsync.mockResolvedValue([]);
  });

  it('records successful legacy usage persistence', async () => {
    collectUsageUseCase.execute.mockResolvedValue({} as never);

    service.collect(model, 120, 35, undefined, 'legacy');
    await settleAsyncCollection();

    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      RunUsageCollectionEvent.EVENT_NAME,
      new RunUsageCollectionEvent('legacy', 'success'),
    );
  });

  it('records failed agent-runtime usage persistence', async () => {
    collectUsageUseCase.execute.mockRejectedValue(
      new Error('Usage database unavailable'),
    );

    service.collect(model, 120, 35, undefined, 'agent_runtime');
    await settleAsyncCollection();

    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      RunUsageCollectionEvent.EVENT_NAME,
      new RunUsageCollectionEvent('agent_runtime', 'error'),
    );
  });
});
