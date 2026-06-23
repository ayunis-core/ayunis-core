import 'src/config/env';
import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { MoreThanOrEqual } from 'typeorm';
import dataSource from 'src/db/datasource';
import { SeedRunner } from './utils/seed-runner';
import { demoFixture } from '../fixtures/demo.fixture';
import { minimalFixture } from '../fixtures/minimal.fixture';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { TeamRecord } from 'src/iam/teams/infrastructure/repositories/local/schema/team.record';
import { TeamMemberRecord } from 'src/iam/teams/infrastructure/repositories/local/schema/team-member.record';
import { UsageRecord } from 'src/domain/usage/infrastructure/persistence/local-usage/schema/usage.record';
import { LanguageModelRecord } from 'src/domain/models/infrastructure/persistence/local-models/schema/model.record';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

/* eslint-disable no-console */
function log(entity: string, name: string, created: boolean): void {
  console.log(`${created ? '✅ Created' : '↺ Exists '}: ${entity} (${name})`);
}

class MissingPrerequisiteError extends Error {}

async function findOrgOrFail(name: string): Promise<OrgRecord> {
  const org = await dataSource
    .getRepository(OrgRecord)
    .findOne({ where: { name } });
  if (!org) {
    throw new MissingPrerequisiteError(
      `Org "${name}" not found. Run "pnpm run seed:minimal:ts" first.`,
    );
  }
  return org;
}

async function findModelOrFail(name: string): Promise<LanguageModelRecord> {
  const model = await dataSource
    .getRepository(LanguageModelRecord)
    .findOne({ where: { name } });
  if (!model) {
    throw new MissingPrerequisiteError(
      `Model "${name}" not found. Run "pnpm run seed:minimal:ts" first.`,
    );
  }
  return model;
}

async function seedUser(
  orgId: UUID,
  runner: SeedRunner,
  user: (typeof demoFixture.users)[number],
): Promise<UserRecord> {
  const repo = dataSource.getRepository(UserRecord);
  const existing = await repo.findOne({ where: { email: user.email } });
  if (existing) {
    if (existing.orgId !== orgId) {
      throw new MissingPrerequisiteError(
        `User "${user.email}" exists in a different org; delete it or use a different email.`,
      );
    }
    log('User', existing.email, false);
    return existing;
  }
  const record = repo.create({
    id: randomUUID(),
    email: user.email,
    passwordHash: await runner.hashPassword(demoFixture.defaultPassword),
    orgId,
    name: user.name,
    role: UserRole.USER,
    systemRole: SystemRole.CUSTOMER,
    emailVerified: true,
    hasAcceptedMarketing: false,
  } as Partial<UserRecord>);
  await repo.save(record);
  log('User', record.email, true);
  return record;
}

async function seedTeam(orgId: UUID, name: string): Promise<TeamRecord> {
  const repo = dataSource.getRepository(TeamRecord);
  const existing = await repo.findOne({ where: { orgId, name } });
  if (existing) {
    log('Team', name, false);
    return existing;
  }
  const record = repo.create({
    id: randomUUID(),
    name,
    orgId,
    modelOverrideEnabled: false,
  });
  await repo.save(record);
  log('Team', name, true);
  return record;
}

async function seedMembership(teamId: UUID, userId: UUID): Promise<void> {
  const repo = dataSource.getRepository(TeamMemberRecord);
  const existing = await repo.findOne({ where: { teamId, userId } });
  if (existing) return;
  await repo.save(repo.create({ id: randomUUID(), teamId, userId }));
}

const USAGE_RECORDS_PER_USER = 5;

function buildUsageRow(
  orgId: UUID,
  userId: UUID,
  model: LanguageModelRecord,
  credits: number,
  createdAt: Date,
): Record<string, unknown> {
  const cost = credits / minimalFixture.platformConfig.creditsPerEuro;
  return {
    id: randomUUID(),
    userId,
    apiKeyId: null,
    organizationId: orgId,
    modelId: model.id,
    provider: model.provider,
    inputTokens: Math.round(cost * 100_000),
    outputTokens: Math.round(cost * 40_000),
    totalTokens: Math.round(cost * 140_000),
    cost,
    creditsConsumed: credits,
    requestId: randomUUID(),
    createdAt,
    updatedAt: createdAt,
  };
}

async function seedUserUsage(
  orgId: UUID,
  userId: UUID,
  model: LanguageModelRecord,
  targetCredits: number,
): Promise<void> {
  const repo = dataSource.getRepository(UsageRecord);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Per-user guard so this is independent of the admin's minimal-seed records.
  const existing = await repo.count({
    where: { userId, createdAt: MoreThanOrEqual(monthStart) },
  });
  if (existing > 0) {
    log('Usage', `user=${userId}`, false);
    return;
  }

  const perRecord = targetCredits / USAGE_RECORDS_PER_USER;
  const rows = Array.from({ length: USAGE_RECORDS_PER_USER }, (_, i) => {
    const createdAt = new Date(
      Math.max(now.getTime() - i * 86_400_000, monthStart.getTime()),
    );
    return buildUsageRow(orgId, userId, model, perRecord, createdAt);
  });

  await dataSource
    .createQueryBuilder()
    .insert()
    .into(UsageRecord)
    .values(rows)
    .execute();
  log('Usage', `user=${userId} (~${targetCredits} credits)`, true);
}

async function seedDemo(runner: SeedRunner): Promise<void> {
  console.log('🌱 Starting demo seed (additive, on top of seed:minimal)…\n');

  const org = await findOrgOrFail(demoFixture.targetOrgName);
  const model = await findModelOrFail(demoFixture.usageModelName);

  const usersByEmail = new Map<string, UserRecord>();
  for (const user of demoFixture.users) {
    usersByEmail.set(user.email, await seedUser(org.id, runner, user));
  }
  const admin = await dataSource
    .getRepository(UserRecord)
    .findOne({ where: { email: demoFixture.usageAdminEmail } });
  if (admin) {
    if (admin.orgId !== org.id) {
      throw new MissingPrerequisiteError(
        `Admin "${demoFixture.usageAdminEmail}" exists in a different org; delete it or adjust demo config.`,
      );
    }
    usersByEmail.set(admin.email, admin);
  }

  const teamsByName = new Map<string, TeamRecord>();
  for (const name of demoFixture.teams) {
    teamsByName.set(name, await seedTeam(org.id, name));
  }
  for (const [teamName, emails] of Object.entries(demoFixture.memberships)) {
    const team = teamsByName.get(teamName);
    if (!team) continue;
    for (const email of emails) {
      const member = usersByEmail.get(email);
      if (member) await seedMembership(team.id, member.id);
    }
  }
  log('Memberships', 'configured', true);

  for (const user of demoFixture.users) {
    const record = usersByEmail.get(user.email);
    if (record) {
      await seedUserUsage(org.id, record.id, model, user.targetCredits);
    }
  }

  console.log('\n🎉 Demo seed completed successfully!');
}

async function run(): Promise<void> {
  const runner = new SeedRunner();
  let exitCode = 0;
  try {
    runner.ensureNonProduction();
    await runner.initialize();
    await seedDemo(runner);
  } catch (error) {
    if (error instanceof MissingPrerequisiteError) {
      console.error(`\n❌ ${error.message}`);
    } else {
      console.error('\n❌ Demo seed failed:', error);
    }
    exitCode = 1;
  } finally {
    await runner.destroy();
  }
  process.exit(exitCode);
}

if (require.main === module) {
  void run();
}
