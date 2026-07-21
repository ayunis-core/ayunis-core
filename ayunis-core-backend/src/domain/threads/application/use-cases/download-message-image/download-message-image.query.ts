import type { UUID } from 'crypto';

export class DownloadMessageImageQuery {
  constructor(
    public readonly threadId: UUID,
    public readonly messageId: UUID,
    public readonly index: number,
    public readonly userId: UUID,
  ) {}
}
