import type { UUID } from 'crypto';

export class EvaluateAcademyAccessQuery {
  constructor(
    public readonly userId: UUID,
    public readonly orgId: UUID,
  ) {}
}
