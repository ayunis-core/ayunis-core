import { UUID } from 'crypto';

export class ExecuteMcpToolCommand {
  constructor(
    public readonly integrationId: UUID,
    public readonly toolName: string,
    public readonly parameters: Record<string, unknown>,
  ) {}
}
