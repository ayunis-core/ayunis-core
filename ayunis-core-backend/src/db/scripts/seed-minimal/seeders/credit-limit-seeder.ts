import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { TeamRecord } from 'src/iam/teams/infrastructure/repositories/local/schema/team.record';
import {
  UserCreditLimitRecord,
  TeamCreditLimitRecord,
} from 'src/iam/credit-limits/infrastructure/persistence/local/schema/credit-limit.record';
import { OrgSeeder } from './base-seeder';
import type { SeedState } from '../seed-state';
import type { OrgFixture } from '../seed-types';

export class CreditLimitSeeder extends OrgSeeder {
  async seedForOrg(ctx: SeedState, org: OrgFixture): Promise<void> {
    const orgId = ctx.getOrg(org.key).id;
    await this.seedUserLimits(orgId, org);
    await this.seedTeamLimits(orgId, org.teamLimits ?? {});
  }

  private async seedUserLimits(orgId: UUID, org: OrgFixture): Promise<void> {
    for (const member of org.members) {
      if (member.creditLimit === undefined) continue;

      const user = await this.repo(UserRecord).findOne({
        where: { email: member.email },
      });
      if (!user) {
        continue;
      }

      // Persisted via the USER subtype repository, which sets the `scope`
      // discriminator automatically (single-table inheritance).
      await this.findOrCreate(
        this.repo(UserCreditLimitRecord),
        { orgId, userId: user.id },
        () => ({
          id: randomUUID(),
          orgId,
          userId: user.id,
          monthlyCredits: member.creditLimit,
        }),
        {
          entity: 'Credit limit',
          name: `user ${member.email}=${member.creditLimit}`,
        },
      );
    }
  }

  private async seedTeamLimits(
    orgId: UUID,
    teamLimits: Readonly<Record<string, number>>,
  ): Promise<void> {
    for (const [teamName, monthlyCredits] of Object.entries(teamLimits)) {
      const team = await this.repo(TeamRecord).findOne({
        where: { orgId, name: teamName },
      });
      if (!team) {
        continue;
      }

      await this.findOrCreate(
        this.repo(TeamCreditLimitRecord),
        { orgId, teamId: team.id },
        () => ({
          id: randomUUID(),
          orgId,
          teamId: team.id,
          monthlyCredits,
        }),
        { entity: 'Credit limit', name: `team ${teamName}=${monthlyCredits}` },
      );
    }
  }
}
