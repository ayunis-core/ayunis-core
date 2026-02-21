import type { UUID } from 'crypto';

export class SetUserMcpConfigCommand {
  constructor(
    public readonly integrationId: UUID,
    public readonly configValues: Record<string, string>,
  ) {}
}
