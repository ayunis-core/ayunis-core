import type { UUID } from 'crypto';

export class ToggleThreadPinnedCommand {
  readonly threadId: UUID;

  constructor(params: { threadId: UUID }) {
    this.threadId = params.threadId;
  }
}
