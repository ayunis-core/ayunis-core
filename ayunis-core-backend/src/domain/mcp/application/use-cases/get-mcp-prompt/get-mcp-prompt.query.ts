import { UUID } from 'crypto';

export class GetMcpPromptQuery {
  constructor(
    public readonly integrationId: UUID,
    public readonly promptName: string,
    public readonly args?: Record<string, string>,
  ) {}
}
