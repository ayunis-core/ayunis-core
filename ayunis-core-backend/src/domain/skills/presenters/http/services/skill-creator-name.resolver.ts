import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import { FindUserByIdQuery } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.query';
import { FindUsersByIdsUseCase } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.use-case';
import { FindUsersByIdsQuery } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.query';
import { UserNotFoundError } from 'src/iam/users/application/users.errors';

@Injectable()
export class SkillCreatorNameResolver {
  constructor(
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly findUsersByIdsUseCase: FindUsersByIdsUseCase,
  ) {}

  async resolveOne(userId: UUID): Promise<string | null> {
    try {
      const user = await this.findUserByIdUseCase.execute(
        new FindUserByIdQuery(userId),
      );
      return user.name;
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        return null;
      }
      throw error;
    }
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
