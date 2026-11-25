import type { UUID } from 'crypto';

export class SyncOparlSystemNowCommand {
  constructor(readonly systemId: UUID) {}
}
