import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { MoreThanOrEqual } from 'typeorm';
import dataSource from 'src/db/datasource';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { TeamRecord } from 'src/iam/teams/infrastructure/repositories/local/schema/team.record';
import { TeamMemberRecord } from 'src/iam/teams/infrastructure/repositories/local/schema/team-member.record';
import { UsageRecord } from 'src/domain/usage/infrastructure/persistence/local-usage/schema/usage.record';
import { getEffectiveMonthStart } from 'src/domain/usage/application/util/get-effective-month-start';
import type { LanguageModelRecord } from 'src/domain/models/infrastructure/persistence/local-models/schema/model.record';
import type { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { OrgSeeder } from './base-seeder';
import { log } from 'src/db/scripts/utils/seed-log';
import type { SeedState } from '../seed-state';
import type { OrgFixture, MemberFixture, UsageSeedModel } from '../seed-types';

const USAGE_RECORDS_PER_USER = 5;

type MembershipMap = Record<string, readonly string[]>;

interface UsageRowParams {
  orgId: string;
  userId: string;
  model: { id: string; provider: ModelProvider };
  inputTokens: number;
  outputTokens: number;
  cost: number;
  creditsConsumed: number;
  createdAt: Date;
}

function makeUsageRow(params: UsageRowParams): Record<string, unknown> {
  return {
    id: randomUUID(),
    userId: params.userId,
    apiKeyId: null,
    organizationId: params.orgId,
    modelId: params.model.id,
    provider: params.model.provider,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    totalTokens: params.inputTokens + params.outputTokens,
    cost: params.cost,
    creditsConsumed: params.creditsConsumed,
    requestId: randomUUID(),
    createdAt: params.createdAt,
    updatedAt: params.createdAt,
  };
}

export class UsageSeeder extends OrgSeeder {
  async seedForOrg(ctx: SeedState, org: OrgFixture): Promise<void> {
    const models = ctx.getModels();
    const usageModels: UsageSeedModel[] = [
      models.languageModel,
      models.azureLanguageModel,
      models.imageGenerationModel,
    ];

    const orgId = ctx.getOrg(org.key).id;
    const adminId = ctx.getAdmin(org.key).id;
    await this.seedAdminUsage(ctx, orgId, adminId, usageModels);

    if (org.teams.length > 0 || org.members.length > 0) {
      await this.seedTeamsAndUsage(ctx, org, orgId);
    }
  }

  private async seedAdminUsage(
    ctx: SeedState,
    orgId: UUID,
    userId: UUID,
    usageModels: UsageSeedModel[],
  ): Promise<void> {
    const repo = this.repo(UsageRecord);
    const monthStart = getEffectiveMonthStart();

    const existing = await repo.count({
      where: { userId, createdAt: MoreThanOrEqual(monthStart) },
    });
    if (existing > 0) {
      log('Usage records', `org=${orgId}`, false);
      return;
    }

    const rows = this.buildMonthlyUsageRows(
      orgId,
      userId,
      usageModels,
      ctx.fixture.platformConfig.creditsPerEuro,
    );
    if (rows.length === 0) {
      log('Usage records', `org=${orgId} (none — day 1)`, true);
      return;
    }

    await this.insertUsageRows(rows);
    log('Usage records', `org=${orgId} (${rows.length})`, true);
  }

  private buildMonthlyUsageRows(
    orgId: UUID,
    userId: UUID,
    usageModels: UsageSeedModel[],
    creditsPerEuro: number,
  ): Record<string, unknown>[] {
    const now = new Date();
    const rows: Record<string, unknown>[] = [];

    let index = 0;
    for (let day = 1; day <= now.getUTCDate(); day += 2) {
      const model = usageModels[index % usageModels.length];
      const inputTokens = 40_000 + ((index * 7919) % 120_000);
      const outputTokens = 20_000 + ((index * 5003) % 80_000);
      const cost =
        (inputTokens / 1_000_000) * (model.inputTokenCost ?? 0) +
        (outputTokens / 1_000_000) * (model.outputTokenCost ?? 0);
      rows.push(
        makeUsageRow({
          orgId,
          userId,
          model,
          inputTokens,
          outputTokens,
          cost,
          creditsConsumed: cost * creditsPerEuro,
          createdAt: new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, 10, 0, 0),
          ),
        }),
      );
      index += 1;
    }
    return rows;
  }

  private async seedTeamsAndUsage(
    ctx: SeedState,
    org: OrgFixture,
    orgId: UUID,
  ): Promise<void> {
    const usersByEmail = await this.resolveMembers(org);
    await this.seedTeamsAndMemberships(
      orgId,
      org.teams,
      org.memberships,
      usersByEmail,
    );
    await this.seedUsageForUsers(
      ctx,
      orgId,
      ctx.getModels().languageModel,
      org.members,
      usersByEmail,
    );
  }

  private async resolveMembers(
    org: OrgFixture,
  ): Promise<Map<string, UserRecord>> {
    const repo = this.repo(UserRecord);
    const emails = [org.admin.email, ...org.members.map((m) => m.email)];
    const usersByEmail = new Map<string, UserRecord>();
    for (const email of emails) {
      const record = await repo.findOne({ where: { email } });
      if (record) usersByEmail.set(email, record);
    }
    return usersByEmail;
  }

  private async seedTeamsAndMemberships(
    orgId: UUID,
    teams: readonly string[],
    memberships: MembershipMap,
    usersByEmail: Map<string, UserRecord>,
  ): Promise<void> {
    const teamsByName = new Map<string, TeamRecord>();
    for (const name of teams) {
      teamsByName.set(name, await this.seedTeam(orgId, name));
    }
    for (const [teamName, emails] of Object.entries(memberships)) {
      const team = teamsByName.get(teamName);
      if (!team) continue;
      for (const email of emails) {
        const member = usersByEmail.get(email);
        if (member) await this.seedMembership(team.id, member.id);
      }
    }
    log('Memberships', 'configured', true);
  }

  private async seedTeam(orgId: UUID, name: string): Promise<TeamRecord> {
    return this.findOrCreate(
      this.repo(TeamRecord),
      { orgId, name },
      () => ({ id: randomUUID(), name, orgId, modelOverrideEnabled: false }),
      { entity: 'Team', name },
    );
  }

  private async seedMembership(teamId: UUID, userId: UUID): Promise<void> {
    const repo = this.repo(TeamMemberRecord);
    const existing = await repo.findOne({ where: { teamId, userId } });
    if (existing) return;
    await repo.save(repo.create({ id: randomUUID(), teamId, userId }));
  }

  private async seedUsageForUsers(
    ctx: SeedState,
    orgId: UUID,
    model: LanguageModelRecord,
    members: readonly MemberFixture[],
    usersByEmail: Map<string, UserRecord>,
  ): Promise<void> {
    for (const member of members) {
      const record = usersByEmail.get(member.email);
      if (record) {
        await this.seedUserUsage(
          ctx,
          orgId,
          record.id,
          model,
          member.consumedCredits,
        );
      }
    }
  }

  private async seedUserUsage(
    ctx: SeedState,
    orgId: UUID,
    userId: UUID,
    model: LanguageModelRecord,
    consumedCredits: number,
  ): Promise<void> {
    const repo = this.repo(UsageRecord);
    const now = new Date();
    const monthStart = getEffectiveMonthStart();

    const existing = await repo.count({
      where: { userId, createdAt: MoreThanOrEqual(monthStart) },
    });
    if (existing > 0) {
      log('Usage', `user=${userId}`, false);
      return;
    }

    const creditsPerEuro = ctx.fixture.platformConfig.creditsPerEuro;
    const perRecord = consumedCredits / USAGE_RECORDS_PER_USER;
    const rows = Array.from({ length: USAGE_RECORDS_PER_USER }, (_, i) => {
      const createdAt = new Date(
        Math.max(now.getTime() - i * 86_400_000, monthStart.getTime()),
      );
      return this.buildUserUsageRow({
        orgId,
        userId,
        model,
        credits: perRecord,
        createdAt,
        creditsPerEuro,
      });
    });

    await this.insertUsageRows(rows);
    log('Usage', `user=${userId} (~${consumedCredits} credits)`, true);
  }

  private buildUserUsageRow(params: {
    orgId: UUID;
    userId: UUID;
    model: LanguageModelRecord;
    credits: number;
    createdAt: Date;
    creditsPerEuro: number;
  }): Record<string, unknown> {
    const cost = params.credits / params.creditsPerEuro;
    return makeUsageRow({
      orgId: params.orgId,
      userId: params.userId,
      model: params.model,
      inputTokens: Math.round(cost * 100_000),
      outputTokens: Math.round(cost * 40_000),
      cost,
      creditsConsumed: params.credits,
      createdAt: params.createdAt,
    });
  }

  private async insertUsageRows(
    rows: Record<string, unknown>[],
  ): Promise<void> {
    await dataSource
      .createQueryBuilder()
      .insert()
      .into(UsageRecord)
      .values(rows)
      .execute();
  }
}
