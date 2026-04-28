import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { FindUsersByIdsUseCase } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.use-case';
import { FindUsersByIdsQuery } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.query';

@Injectable()
export class SkillCreatorNameResolver {
  constructor(private readonly findUsersByIdsUseCase: FindUsersByIdsUseCase) {}

  async resolveOne(userId: UUID): Promise<string | null> {
    const usersById = await this.resolveMany([userId]);
    return usersById.get(userId) ?? null;
  }

  async resolveMany(userIds: UUID[]): Promise<Map<UUID, string>> {
    const uniqueIds = Array.from(new Set(userIds));
    if (uniqueIds.length === 0) {
      return new Map();
    }
    const users = await this.findUsersByIdsUseCase.execute(
      new FindUsersByIdsQuery(uniqueIds),
    );
    return new Map(users.map((u) => [u.id, u.name]));
  }
}
