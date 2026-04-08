import type { Usage } from '../../domain/usage.entity';

/**
 * Domain event emitted by {@link CollectUsageUseCase} after a {@link Usage}
 * row has been successfully persisted. Carries the persisted entity and
 * the human-readable model name so downstream listeners (e.g. webhook
 * dispatchers, metrics, sync services) do not need to re-resolve the
 * model.
 */
export class UsageCollectedEvent {
  static readonly EVENT_NAME = 'usage.collected';

  constructor(
    public readonly usage: Usage,
    public readonly modelName: string,
  ) {}
}
