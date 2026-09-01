import type { UUID } from 'crypto';

export class CreateWorkspaceSkillCommand {
  constructor(
    public readonly workspaceId: UUID,
    public readonly name: string,
    public readonly shortDescription: string,
    public readonly instructions: string,
  ) {}
}
