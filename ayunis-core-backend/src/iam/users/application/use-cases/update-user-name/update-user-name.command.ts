import { UUID } from 'crypto';

export class UpdateUserNameCommand {
  constructor(
    public readonly userId: UUID,
    public readonly newName: string,
  ) {}
}
