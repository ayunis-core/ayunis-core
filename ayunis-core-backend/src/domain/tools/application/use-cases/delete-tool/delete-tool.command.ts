import { UUID } from 'crypto';

export class DeleteToolCommand {
  constructor(
    public readonly id: UUID,
    public readonly ownerId: UUID,
  ) {}
}
