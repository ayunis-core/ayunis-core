import type { UUID } from 'crypto';

export class MarkSourceFailedCommand {
  readonly sourceId: UUID;
  readonly errorMessage: string;

  constructor(params: { sourceId: UUID; errorMessage: string }) {
    this.sourceId = params.sourceId;
    this.errorMessage = params.errorMessage;
  }
}
