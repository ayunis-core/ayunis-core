import { UUID } from 'crypto';

export class GetPromptQuery {
  constructor(
    public readonly id: UUID,
    public readonly userId: UUID,
  ) {}
}
