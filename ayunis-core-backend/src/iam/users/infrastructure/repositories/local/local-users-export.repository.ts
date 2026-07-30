import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  UserExportRow,
  UsersExportRepository,
} from 'src/iam/users/application/ports/users-export.repository';
import { SubscriptionRecord } from 'src/iam/subscriptions/infrastructure/persistence/local/schema/subscription.record';
import { TeamMemberRecord } from 'src/iam/teams/infrastructure/repositories/local/schema/team-member.record';
import { TeamRecord } from 'src/iam/teams/infrastructure/repositories/local/schema/team.record';
import { UserRecord } from './schema/user.record';

@Injectable()
export class LocalUsersExportRepository implements UsersExportRepository {
  constructor(private readonly dataSource: DataSource) {}

  findSubscribedOrgUsers(): Promise<UserExportRow[]> {
    return this.dataSource
      .createQueryBuilder()
      .select('user.id', 'id')
      .addSelect('user.name', 'name')
      .addSelect('user.email', 'email')
      .addSelect('user.role', 'role')
      .addSelect('org.name', 'orgName')
      .addSelect('subscription.type', 'subscriptionType')
      .addSelect('subscription.startsAt', 'subscriptionStartsAt')
      .addSelect(
        "COALESCE(STRING_AGG(DISTINCT team.name, ', ' ORDER BY team.name), '')",
        'teams',
      )
      .from(UserRecord, 'user')
      .innerJoin('user.org', 'org')
      .innerJoin(
        SubscriptionRecord,
        'subscription',
        'subscription.orgId = user.orgId AND subscription.cancelledAt IS NULL',
      )
      .leftJoin(TeamMemberRecord, 'teamMember', 'teamMember.userId = user.id')
      .leftJoin(TeamRecord, 'team', 'team.id = teamMember.teamId')
      .groupBy('user.id')
      .addGroupBy('user.name')
      .addGroupBy('user.email')
      .addGroupBy('user.role')
      .addGroupBy('org.name')
      .addGroupBy('subscription.type')
      .addGroupBy('subscription.startsAt')
      .orderBy('org.name', 'ASC')
      .addOrderBy('user.name', 'ASC')
      .addOrderBy('user.email', 'ASC')
      .getRawMany<UserExportRow>();
  }
}
