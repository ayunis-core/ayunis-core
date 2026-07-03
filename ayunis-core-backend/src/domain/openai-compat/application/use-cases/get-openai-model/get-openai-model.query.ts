import type { UUID } from 'crypto';

export class GetOpenAIModelQuery {
  constructor(
    public readonly orgId: UUID,
    public readonly modelName: string,
  ) {}
}
