import type { UUID } from 'crypto';

export class GetAllPromptsByUserQuery {
  constructor(public readonly userId: UUID) {}
}
