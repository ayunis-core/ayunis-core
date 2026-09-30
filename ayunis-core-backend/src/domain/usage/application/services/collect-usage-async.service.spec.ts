import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { ContextService } from 'src/common/context/services/context.service';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { RunUsageCollectionEvent } from 'src/domain/usage/application/events/run-usage-collection.event';
import { TokensConsumedEvent } from 'src/domain/usage/application/events/tokens-consumed.event';
import type { CollectUsageUseCase } from 'src/domain/usage/application/use-cases/collect-usage/collect-usage.use-case';
import { CollectUsageAsyncService } from './collect-usage-async.service';

const model = {
  name: 'Municipal Assistant',
  provider: 'openai',
} as LanguageModel;

async function settleAsyncCollection(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

describe('CollectUsageAsyncService', () => {
  let collectUsageUseCase: jest.Mocked<CollectUsageUseCase>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let service: CollectUsageAsyncService;

  beforeEach(() => {
    collectUsageUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CollectUsageUseCase>;
    eventEmitter = {
      emitAsync: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<EventEmitter2>;
    service = new CollectUsageAsyncService(
      collectUsageUseCase,
      { get: jest.fn() } as unknown as ContextService,
      eventEmitter,
    );
  });

  it('keeps ordinary collection fire-and-forget', async () => {
    let resolvePersistence: (() => void) | undefined;
    collectUsageUseCase.execute.mockReturnValue(
      new Promise((resolve) => {
        resolvePersistence = resolve;
      }),
    );

    const result = service.collect(model, 120, 35, undefined, 'legacy');

    expect(result).toBeUndefined();
    expect(eventEmitter.emitAsync).not.toHaveBeenCalled();

    resolvePersistence?.();
    await settleAsyncCollection();
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      RunUsageCollectionEvent.EVENT_NAME,
      new RunUsageCollectionEvent('legacy', 'success'),
    );
  });

  it('awaits critical persistence before resolving', async () => {
    let resolvePersistence: (() => void) | undefined;
    collectUsageUseCase.execute.mockReturnValue(
      new Promise((resolve) => {
        resolvePersistence = resolve;
      }),
    );
    let settled = false;

    const collection = service
      .collectCritical(model, 120, 35, undefined, 'agent_runtime')
      .then(() => {
        settled = true;
      });
    await Promise.resolve();

    expect(settled).toBe(false);

    resolvePersistence?.();
    await collection;
    expect(settled).toBe(true);
  });

  it('emits token and run-usage events after successful critical persistence', async () => {
    await service.collectCritical(model, 120, 35, undefined, 'agent_runtime');

    expect(eventEmitter.emitAsync).toHaveBeenNthCalledWith(
      1,
      TokensConsumedEvent.EVENT_NAME,
      expect.any(TokensConsumedEvent),
    );
    expect(eventEmitter.emitAsync).toHaveBeenNthCalledWith(
      2,
      RunUsageCollectionEvent.EVENT_NAME,
      new RunUsageCollectionEvent('agent_runtime', 'success'),
    );
  });

  it('propagates critical persistence failures after emitting failure telemetry', async () => {
    const persistenceError = new Error('Usage database unavailable');
    collectUsageUseCase.execute.mockRejectedValue(persistenceError);

    await expect(
      service.collectCritical(model, 120, 35, undefined, 'agent_runtime'),
    ).rejects.toBe(persistenceError);

    expect(eventEmitter.emitAsync).not.toHaveBeenCalledWith(
      TokensConsumedEvent.EVENT_NAME,
      expect.any(TokensConsumedEvent),
    );
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      RunUsageCollectionEvent.EVENT_NAME,
      new RunUsageCollectionEvent('agent_runtime', 'error'),
    );
  });

  it('keeps event-emission failures best-effort for critical collection', async () => {
    eventEmitter.emitAsync.mockRejectedValue(
      new Error('Telemetry listener unavailable'),
    );

    await expect(
      service.collectCritical(model, 120, 35, undefined, 'agent_runtime'),
    ).resolves.toBeUndefined();
  });

  it('swallows persistence failures for ordinary collection', async () => {
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
