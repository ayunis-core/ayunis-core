import { UUID } from 'crypto';

export class DeleteThreadCommand {
  constructor(
    public readonly id: UUID,
    public readonly userId: UUID,
  ) {}
}
