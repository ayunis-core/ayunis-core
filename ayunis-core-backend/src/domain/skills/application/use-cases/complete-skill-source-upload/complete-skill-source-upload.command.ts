import type { UUID } from 'crypto';

export class CompleteSkillSourceUploadCommand {
  constructor(
    public readonly skillId: UUID,
    public readonly uploadId: UUID,
  ) {}
}
