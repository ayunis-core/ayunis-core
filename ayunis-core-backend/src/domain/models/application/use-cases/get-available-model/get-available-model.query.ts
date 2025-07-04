import { UUID } from 'crypto';

export class GetAvailableModelQuery {
  constructor(public readonly modelId: UUID) {}
}
