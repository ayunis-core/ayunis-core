import { UUID } from 'crypto';

export class UpdateTeamCommand {
  constructor(
    public readonly teamId: UUID,
    public readonly name: string,
  ) {}
}
