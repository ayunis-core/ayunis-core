import type { UUID } from 'crypto';

export class GetAcademyCompletionsQuery {
  public readonly userIds: UUID[];

  constructor(params: { userIds: UUID[] }) {
    this.userIds = params.userIds;
  }
}
