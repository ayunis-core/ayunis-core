import type { UUID } from 'crypto';

export class FindRecordingQuery {
  constructor(public readonly id: UUID) {}
}
