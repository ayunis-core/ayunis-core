import type { UUID } from 'crypto';

export class RetrieveUrlCommand {
  constructor(
    public readonly url: string,
    public readonly orgId: UUID,
    public readonly options?: Record<string, unknown>,
  ) {}
}
