import type { UUID } from 'crypto';

export class DownloadGeneratedImageQuery {
  constructor(
    public readonly threadId: UUID,
    public readonly imageId: UUID,
    public readonly userId: UUID,
  ) {}
}
