import { Injectable } from '@nestjs/common';
import { DataSource, SelectQueryBuilder } from 'typeorm';
import {
  UserExportRow,
  UsersExportRepository,
} from 'src/iam/users/application/ports/users-export.repository';
import { SubscriptionRecord } from 'src/iam/subscriptions/infrastructure/persistence/local/schema/subscription.record';
import { TeamMemberRecord } from 'src/iam/teams/infrastructure/repositories/local/schema/team-member.record';
import { TeamRecord } from 'src/iam/teams/infrastructure/repositories/local/schema/team.record';
import { UserRecord } from './schema/user.record';

// A cancellation removes the org from the export at once, as it always did; a
// fixed term removes it only once the bound has elapsed. The caller binds :now.
function grantsAccessNowOrLater(alias: string): string {
  return `${alias}.cancelledAt IS NULL AND (${alias}.endsAt IS NULL OR ${alias}.endsAt > :now)`;
}

// A running term and its scheduled successor both qualify; reporting only the
// earliest-starting one keeps each user on a single row.
function earlierQualifyingSubscriptionExists(
  queryBuilder: SelectQueryBuilder<UserRecord>,
): string {
  const subQuery = queryBuilder
    .subQuery()
    .select('1')
    .from(SubscriptionRecord, 'earlier')
    .where('earlier.orgId = subscription.orgId')
    .andWhere(grantsAccessNowOrLater('earlier'))
    .andWhere('earlier.startsAt < subscription.startsAt')
    .getQuery();
  return `EXISTS ${subQuery}`;
}

@Injectable()
export class LocalUsersExportRepository implements UsersExportRepository {
  constructor(private readonly dataSource: DataSource) {}

  findSubscribedOrgUsers(now: Date): Promise<UserExportRow[]> {
    const queryBuilder = this.dataSource.createQueryBuilder(UserRecord, 'user');
    return queryBuilder
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
      .innerJoin('user.org', 'org')
      .innerJoin(
        SubscriptionRecord,
        'subscription',
        `subscription.orgId = user.orgId AND ${grantsAccessNowOrLater('subscription')} AND NOT ${earlierQualifyingSubscriptionExists(queryBuilder)}`,
        { now },
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
