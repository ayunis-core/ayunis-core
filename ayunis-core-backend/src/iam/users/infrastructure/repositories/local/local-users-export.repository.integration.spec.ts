import { randomUUID, type UUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { SubscriptionRecord } from 'src/iam/subscriptions/infrastructure/persistence/local/schema/subscription.record';
import { TeamMemberRecord } from 'src/iam/teams/infrastructure/repositories/local/schema/team-member.record';
import { TeamRecord } from 'src/iam/teams/infrastructure/repositories/local/schema/team.record';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { LocalUsersExportRepository } from './local-users-export.repository';

const orgSchema = new EntitySchema<OrgRecord>({
  name: 'OrgRecord',
  target: OrgRecord,
  tableName: 'orgs',
  columns: {
    id: { type: String, primary: true },
    name: { type: String },
  },
});

const userSchema = new EntitySchema<UserRecord>({
  name: 'UserRecord',
  target: UserRecord,
  tableName: 'users',
  columns: {
    id: { type: String, primary: true },
    name: { type: String },
    email: { type: String },
    role: { type: String },
    orgId: { type: String },
  },
  relations: {
    org: {
      type: 'many-to-one',
      target: 'OrgRecord',
      joinColumn: { name: 'orgId' },
    },
  },
});

const subscriptionSchema = new EntitySchema<
  SubscriptionRecord & { type: string }
>({
  name: 'SubscriptionRecord',
  target: SubscriptionRecord,
  tableName: 'subscriptions',
  columns: {
    id: { type: String, primary: true },
    orgId: { type: String },
    type: { type: String },
    startsAt: { type: 'timestamp' },
    cancelledAt: { type: 'timestamp', nullable: true },
    endsAt: { type: 'timestamp', nullable: true },
  },
});

const teamSchema = new EntitySchema<TeamRecord>({
  name: 'TeamRecord',
  target: TeamRecord,
  tableName: 'teams',
  columns: {
    id: { type: String, primary: true },
    name: { type: String },
    orgId: { type: String, name: 'org_id' },
  },
});

const teamMemberSchema = new EntitySchema<TeamMemberRecord>({
  name: 'TeamMemberRecord',
  target: TeamMemberRecord,
  tableName: 'team_members',
  columns: {
    id: { type: String, primary: true },
    teamId: { type: String, name: 'team_id' },
    userId: { type: String, name: 'user_id' },
  },
});

interface SubscriptionFixture {
  type?: string;
  startsAt: string;
  cancelledAt?: string | null;
  endsAt?: string | null;
}

describe('LocalUsersExportRepository subscribed users', () => {
  const now = new Date('2026-10-27T12:00:00.000Z');
  let dataSource: DataSource;
  let schemaName: string;
  let repository: LocalUsersExportRepository;

  beforeAll(async () => {
    schemaName = `ayc1429_export_${randomUUID().replaceAll('-', '')}`;
    dataSource = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema: schemaName,
      entities: [
        orgSchema,
        userSchema,
        subscriptionSchema,
        teamSchema,
        teamMemberSchema,
      ],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await dataSource.initialize();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.createSchema(schemaName, true);
    await queryRunner.release();
    await dataSource.synchronize();
    repository = new LocalUsersExportRepository(dataSource);
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) return;
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.dropSchema(schemaName, true, true);
    await queryRunner.release();
    await dataSource.destroy();
  });

  async function insertOrgWithUser(
    orgName: string,
    subscriptions: SubscriptionFixture[],
  ): Promise<UUID> {
    const orgId = randomUUID();
    await dataSource
      .getRepository(OrgRecord)
      .insert({ id: orgId, name: orgName });
    await dataSource.getRepository(UserRecord).insert({
      id: randomUUID(),
      name: `Member of ${orgName}`,
      email: `${orgId}@example.com`,
      role: UserRole.USER,
      orgId,
    });
    for (const subscription of subscriptions) {
      await dataSource.getRepository(SubscriptionRecord).insert({
        id: randomUUID(),
        orgId,
        type: subscription.type ?? 'SEAT_BASED',
        startsAt: new Date(subscription.startsAt),
        cancelledAt: subscription.cancelledAt
          ? new Date(subscription.cancelledAt)
          : null,
        endsAt: subscription.endsAt ? new Date(subscription.endsAt) : null,
      } as Partial<SubscriptionRecord>);
    }
    return orgId;
  }

  async function exportedRowsOf(orgName: string) {
    const rows = await repository.findSubscribedOrgUsers(now);
    return rows
      .filter((row) => row.orgName === orgName)
      .map((row) => ({
        type: row.subscriptionType,
        startsAt: new Date(row.subscriptionStartsAt).toISOString(),
      }));
  }

  it('keeps users whose fixed term is still running', async () => {
    const orgName = `running-term-${randomUUID()}`;
    await insertOrgWithUser(orgName, [
      {
        startsAt: '2026-10-01T00:00:00.000Z',
        endsAt: '2026-12-01T00:00:00.000Z',
      },
    ]);

    await expect(exportedRowsOf(orgName)).resolves.toEqual([
      { type: 'SEAT_BASED', startsAt: '2026-10-01T00:00:00.000Z' },
    ]);
  });

  it('drops users whose only subscription is an elapsed fixed term', async () => {
    const orgName = `elapsed-term-${randomUUID()}`;
    await insertOrgWithUser(orgName, [
      {
        startsAt: '2026-08-01T00:00:00.000Z',
        endsAt: '2026-10-01T00:00:00.000Z',
      },
    ]);

    await expect(exportedRowsOf(orgName)).resolves.toEqual([]);
  });

  it('reports the follow-on subscription once after a fixed term elapsed', async () => {
    const orgName = `follow-on-${randomUUID()}`;
    await insertOrgWithUser(orgName, [
      {
        startsAt: '2026-08-01T00:00:00.000Z',
        endsAt: '2026-10-01T00:00:00.000Z',
      },
      { type: 'USAGE_BASED', startsAt: '2026-10-01T00:00:00.000Z' },
    ]);

    await expect(exportedRowsOf(orgName)).resolves.toEqual([
      { type: 'USAGE_BASED', startsAt: '2026-10-01T00:00:00.000Z' },
    ]);
  });

  it('reports the running term once when a successor is already scheduled', async () => {
    const orgName = `scheduled-successor-${randomUUID()}`;
    await insertOrgWithUser(orgName, [
      { type: 'USAGE_BASED', startsAt: '2027-01-01T00:00:00.000Z' },
      {
        startsAt: '2026-10-01T00:00:00.000Z',
        endsAt: '2027-01-01T00:00:00.000Z',
      },
    ]);

    await expect(exportedRowsOf(orgName)).resolves.toEqual([
      { type: 'SEAT_BASED', startsAt: '2026-10-01T00:00:00.000Z' },
    ]);
  });

  it('still drops cancelled subscriptions even while their access lasts', async () => {
    const orgName = `cancelled-${randomUUID()}`;
    await insertOrgWithUser(orgName, [
      {
        startsAt: '2026-09-01T00:00:00.000Z',
        cancelledAt: '2026-10-15T00:00:00.000Z',
        endsAt: '2026-11-01T00:00:00.000Z',
      },
    ]);

    await expect(exportedRowsOf(orgName)).resolves.toEqual([]);
  });

  it('still keeps users of a subscription that starts in the future', async () => {
    const orgName = `scheduled-only-${randomUUID()}`;
    await insertOrgWithUser(orgName, [
      { startsAt: '2027-01-01T00:00:00.000Z' },
    ]);

    await expect(exportedRowsOf(orgName)).resolves.toEqual([
      { type: 'SEAT_BASED', startsAt: '2027-01-01T00:00:00.000Z' },
    ]);
  });
});
