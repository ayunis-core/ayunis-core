import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { FindUsersByIdsUseCase } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.use-case';
import { FindUsersByIdsQuery } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.query';

@Injectable()
export class SkillCreatorNameService {
  private readonly logger = new Logger(SkillCreatorNameService.name);

  constructor(private readonly findUsersByIdsUseCase: FindUsersByIdsUseCase) {}

  async resolveOne(userId: UUID): Promise<string | null> {
    const byId = await this.resolveMany([userId]);
    return byId.get(userId) ?? null;
  }

  async resolveMany(userIds: UUID[]): Promise<Map<UUID, string>> {
    const result = new Map<UUID, string>();

    if (userIds.length === 0) {
      return result;
    }

    const uniqueIds = Array.from(new Set(userIds));
    this.logger.log('resolveMany', { idCount: uniqueIds.length });

    const users = await this.findUsersByIdsUseCase.execute(
      new FindUsersByIdsQuery(uniqueIds),
    );

    for (const user of users) {
      result.set(user.id, user.name);
    }

    return result;
  }
}
