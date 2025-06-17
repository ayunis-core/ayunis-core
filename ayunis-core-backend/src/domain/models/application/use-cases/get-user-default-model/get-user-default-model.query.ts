import { UUID } from 'crypto';

export class GetUserDefaultModelQuery {
  constructor(public readonly userId: UUID) {}
}
