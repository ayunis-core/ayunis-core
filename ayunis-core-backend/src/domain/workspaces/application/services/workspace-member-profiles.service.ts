import { Injectable } from '@nestjs/common';
import type { WorkspaceMemberProfile } from 'src/domain/workspaces/application/models/workspace-member-profile.model';
import type { WorkspaceMember } from 'src/domain/workspaces/domain/workspace-member.entity';
import { FindUsersByIdsQuery } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.query';
import { FindUsersByIdsUseCase } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.use-case';

/** Adds each member's name and email, read from the caller's organization. */
@Injectable()
export class WorkspaceMemberProfilesService {
  constructor(private readonly findUsersByIds: FindUsersByIdsUseCase) {}

  async load(members: WorkspaceMember[]): Promise<WorkspaceMemberProfile[]> {
    if (members.length === 0) return [];
    const users = await this.findUsersByIds.execute(
      new FindUsersByIdsQuery(members.map((member) => member.userId)),
    );
    const usersById = new Map(users.map((user) => [user.id, user]));
    return members.flatMap((member) => {
      const user = usersById.get(member.userId);
      return user ? [{ member, name: user.name, email: user.email }] : [];
    });
  }
}
