import { randomUUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { UsageRecord } from 'src/domain/usage/infrastructure/persistence/local-usage/schema/usage.record';
import { UserCreditLimitRecord } from 'src/iam/credit-limits/infrastructure/persistence/local/schema/credit-limit.record';
import { PersonalCreditReservationRecord } from 'src/iam/credit-limits/infrastructure/persistence/local/schema/personal-credit-reservation.record';
import { LocalPersonalCreditReservationRepository } from './local-personal-credit-reservation.repository';

const creditLimitSchema = new EntitySchema<UserCreditLimitRecord>({
  name: 'UserCreditLimitRecord',
  target: UserCreditLimitRecord,
  tableName: 'credit_limits',
  columns: {
    id: { type: 'uuid', primary: true },
    createdAt: { type: 'timestamptz', createDate: true },
    updatedAt: { type: 'timestamptz', updateDate: true },
    orgId: { type: 'uuid' },
    userId: { type: 'uuid', nullable: true },
    monthlyCredits: { type: 'decimal', precision: 16, scale: 2 },
  },
});

const reservationSchema = new EntitySchema<PersonalCreditReservationRecord>({
  name: 'PersonalCreditReservationRecord',
  target: PersonalCreditReservationRecord,
  tableName: 'personal_credit_reservations',
  columns: {
    id: { type: 'uuid', primary: true },
    createdAt: { type: 'timestamptz', createDate: true },
    updatedAt: { type: 'timestamptz', updateDate: true },
    orgId: { type: 'uuid' },
    userId: { type: 'uuid' },
    credits: { type: 'decimal', precision: 16, scale: 6 },
    expiresAt: { type: 'timestamptz' },
  },
});

const usageSchema = new EntitySchema<UsageRecord>({
  name: 'UsageRecord',
  target: UsageRecord,
  tableName: 'usage',
  columns: {
    id: { type: 'uuid', primary: true },
    createdAt: { type: 'timestamptz', createDate: true },
    updatedAt: { type: 'timestamptz', updateDate: true },
    organizationId: { type: 'uuid' },
    userId: { type: 'uuid', nullable: true },
    creditsConsumed: { type: 'decimal', precision: 16, scale: 6 },
  },
});

describe('personal credit reservation locking', () => {
  let dataSource: DataSource;
  let schemaName: string;

  beforeAll(async () => {
    schemaName = `ayc_973_${randomUUID().replaceAll('-', '')}`;
    dataSource = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema: schemaName,
      entities: [creditLimitSchema, reservationSchema, usageSchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await dataSource.initialize();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.createSchema(schemaName, true);
    await queryRunner.release();
    await dataSource.synchronize();
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) return;
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.dropSchema(schemaName, true, true);
    await queryRunner.release();
    await dataSource.destroy();
  });

  it('serializes release with a concurrent admission on the personal limit row', async () => {
    const orgId = randomUUID();
    const userId = randomUUID();
    const reservationId = randomUUID();
    await seedCreditState(dataSource, schemaName, {
      orgId,
      userId,
      reservationId,
    });
    await installDeleteBlocker(dataSource, schemaName);
    const blocker = dataSource.createQueryRunner();
    await blocker.connect();
    await blocker.startTransaction();
    await blocker.query('SELECT pg_advisory_xact_lock(973973)');
    const repository = new LocalPersonalCreditReservationRepository(dataSource);
    let admissionSettled = false;

    const release = repository.release({ reservationId, orgId, userId });
    await waitForAdvisoryWait(dataSource);
    const admission = repository
      .reserve({
        orgId,
        userId,
        requestedCredits: 50,
        minimumCredits: 1,
        monthStart: new Date('2026-09-01T00:00:00.000Z'),
        now: new Date('2026-09-17T10:00:00.000Z'),
        expiresAt: new Date('2026-09-17T11:00:00.000Z'),
      })
      .finally(() => {
        admissionSettled = true;
      });
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(admissionSettled).toBe(false);

    await blocker.commitTransaction();
    await blocker.release();
    await release;
    await expect(admission).resolves.toMatchObject({
      status: 'reserved',
      reservation: { credits: 20 },
    });
  });
});

async function seedCreditState(
  dataSource: DataSource,
  schemaName: string,
  ids: { orgId: string; userId: string; reservationId: string },
): Promise<void> {
  await dataSource.query(
    `INSERT INTO "${schemaName}"."credit_limits"
      ("id", "orgId", "userId", "monthlyCredits")
     VALUES ($1, $2, $3, 100)`,
    [randomUUID(), ids.orgId, ids.userId],
  );
  await dataSource.query(
    `INSERT INTO "${schemaName}"."usage"
      ("id", "organizationId", "userId", "creditsConsumed")
     VALUES ($1, $2, $3, 80)`,
    [randomUUID(), ids.orgId, ids.userId],
  );
  await dataSource.query(
    `INSERT INTO "${schemaName}"."personal_credit_reservations"
      ("id", "orgId", "userId", "credits", "expiresAt")
     VALUES ($1, $2, $3, 80, '2026-09-17T11:00:00.000Z')`,
    [ids.reservationId, ids.orgId, ids.userId],
  );
}

async function installDeleteBlocker(
  dataSource: DataSource,
  schemaName: string,
): Promise<void> {
  await dataSource.query(`
    CREATE FUNCTION "${schemaName}".wait_before_reservation_delete()
    RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      PERFORM pg_advisory_xact_lock(973973);
      RETURN OLD;
    END $$;
    CREATE TRIGGER wait_before_reservation_delete
    BEFORE DELETE ON "${schemaName}"."personal_credit_reservations"
    FOR EACH ROW EXECUTE FUNCTION "${schemaName}".wait_before_reservation_delete();
  `);
}

async function waitForAdvisoryWait(dataSource: DataSource): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const rows = await dataSource.query<{ waiting: boolean }[]>(`
      SELECT EXISTS (
        SELECT 1 FROM pg_stat_activity
        WHERE wait_event = 'advisory'
          AND query LIKE '%personal_credit_reservations%'
      ) AS waiting
    `);
    if (rows[0]?.waiting) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error('release did not reach the blocked delete');
}
