import type { UUID } from 'crypto';

export class ResolveThreadFileQuery {
  constructor(
    public readonly threadId: UUID,
    /** Untrusted: the model names the file, so it need not be a UUID. */
    public readonly sourceId: string,
  ) {}
}
