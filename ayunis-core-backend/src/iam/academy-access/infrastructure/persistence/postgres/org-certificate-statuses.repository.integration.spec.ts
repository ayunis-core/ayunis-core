import { Logger } from '@nestjs/common';
import { CertificateValidityStatus } from 'src/iam/academy-access/domain/value-objects/certificate-validity-status.enum';
import 'src/config/env';
import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { AcademyCompletionRecord } from 'src/domain/academy/infrastructure/persistence/local/schema/academy-completion.record';
import { certificateExpiresAt } from 'src/domain/academy/application/util/certificate-validity';
import {
  CERTIFICATE_STATUS_URGENCY,
  resolveCertificateValidityStatus,
} from 'src/iam/academy-access/application/util/certificate-validity-status';
import type { OrgCertificateStatusesCriteria } from 'src/iam/academy-access/application/ports/org-certificate-statuses.repository';
import { PostgresOrgCertificateStatusesRepository } from './org-certificate-statuses.repository';
import { AcademyCertificateMemberView } from './schema/academy-certificate-member-view.record';

const NOW = new Date('2025-03-30T12:00:00Z');
const userSchema = new EntitySchema<UserRecord>({
  name: 'UserRecord',
  target: UserRecord,
  tableName: 'users',
  indices: [{ columns: ['orgId'] }],
  columns: {
    id: { type: String, primary: true },
    orgId: { type: String },
    name: { type: String },
    email: { type: String },
  },
});
const completionSchema = new EntitySchema<AcademyCompletionRecord>({
  name: 'AcademyCompletionRecord',
  target: AcademyCompletionRecord,
  tableName: 'academy_completion',
  columns: {
    id: { type: String, primary: true },
    userId: { type: String, unique: true },
    completedAt: { type: 'timestamp' },
  },
});

const orgId = randomUUID();
const persistedDates = new Map<UUID, Date>();
const members = [
  { id: randomUUID(), name: 'Anna Leap', date: '2024-02-29T12:00:00Z' },
  { id: randomUUID(), name: 'Anna Midnight', date: '2024-02-29T23:30:00Z' },
  { id: randomUUID(), name: 'Anna Berlin Fold', date: '2024-10-27T00:30:00Z' },
  {
    id: randomUUID(),
    name: 'Anna New York Fold',
    date: '2024-11-03T05:30:00Z',
  },
  {
    id: randomUUID(),
    name: 'Anna Half Hour Fold',
    date: '2024-04-06T14:45:00Z',
  },
  { id: randomUUID(), name: 'Anna DST', date: '2024-03-30T12:00:00Z' },
  { id: randomUUID(), name: 'Anna Soon', date: '2024-03-30T12:00:00.001Z' },
  { id: randomUUID(), name: 'Anna Boundary', date: '2024-04-29T12:00:00Z' },
  { id: randomUUID(), name: 'Anna Valid', date: '2024-04-29T12:00:00.001Z' },
  {
    id: '00000000-0000-4000-8000-000000000002' as UUID,
    name: 'Anna Meier',
    date: null,
  },
  {
    id: '00000000-0000-4000-8000-000000000001' as UUID,
    name: 'Anna Meier',
    date: null,
  },
  { id: randomUUID(), name: 'Änne Müller', date: null },
  { id: randomUUID(), name: 'anna meier', date: null },
];

function criteria(
  overrides: Partial<OrgCertificateStatusesCriteria> = {},
): OrgCertificateStatusesCriteria {
  return {
    orgId,
    renewalRequired: true,
    validityMonths: 12,
    now: NOW,
    expiringSoonUntil: new Date(NOW.getTime() + 30 * 86400000),
    ...overrides,
  };
}

function expected(renewalRequired = true) {
  return members
    .map((member) => {
      const completedAt = persistedDates.get(member.id) ?? null;
      const expiresAt =
        renewalRequired && completedAt
          ? certificateExpiresAt(completedAt)
          : null;
      return {
        userId: member.id,
        name: member.name,
        email: `${member.id}@example.com`,
        completedAt,
        expiresAt,
        status: resolveCertificateValidityStatus({
          completedAt,
          expiresAt,
          now: NOW,
        }),
      };
    })
    .sort(
      (a, b) =>
        CERTIFICATE_STATUS_URGENCY[a.status] -
          CERTIFICATE_STATUS_URGENCY[b.status] ||
        a.name.localeCompare(b.name) ||
        a.userId.localeCompare(b.userId),
    );
}

describe('PostgresOrgCertificateStatusesRepository', () => {
  let db: DataSource;
  let repository: PostgresOrgCertificateStatusesRepository;
  const schema = `academy_reporting_${randomUUID().replaceAll('-', '')}`;

  beforeAll(async () => {
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [userSchema, completionSchema, AcademyCertificateMemberView],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await db.initialize();
    const runner = db.createQueryRunner();
    await runner.createSchema(schema, true);
    await runner.release();
    await db.synchronize();
    repository = new PostgresOrgCertificateStatusesRepository(db);
    await db.getRepository(UserRecord).insert(
      members.map((member) => ({
        id: member.id,
        orgId,
        name: member.name,
        email: `${member.id}@example.com`,
      })),
    );
    for (const member of members) {
      if (member.date)
        await db.getRepository(AcademyCompletionRecord).insert({
          id: randomUUID(),
          userId: member.id,
          completedAt: new Date(member.date),
        });
    }
    for (const row of await db.getRepository(AcademyCompletionRecord).find()) {
      persistedDates.set(row.userId, row.completedAt);
    }
    await db.getRepository(UserRecord).insert({
      id: randomUUID(),
      orgId: randomUUID(),
      name: 'Anna Foreign',
      email: 'foreign@example.com',
    });
  });

  afterAll(async () => {
    if (!db?.isInitialized) return;
    const runner = db.createQueryRunner();
    await runner.dropSchema(schema, true, true);
    await runner.release();
    await db.destroy();
  });

  it('reads current completion data through the mapped view without a refresh', async () => {
    const member = {
      id: randomUUID(),
      orgId: randomUUID(),
      name: 'Lena Müller',
      email: 'lena.mueller@example.com',
    };
    await db.getRepository(UserRecord).insert(member);
    const view = db.getRepository(AcademyCertificateMemberView);
    expect(await view.findOneByOrFail({ userId: member.id })).toEqual({
      userId: member.id,
      orgId: member.orgId,
      name: member.name,
      email: member.email,
      completedAt: null,
    });
    const completedAt = new Date('2025-01-15T12:00:00Z');
    await db.getRepository(AcademyCompletionRecord).insert({
      id: randomUUID(),
      userId: member.id,
      completedAt,
    });
    expect(await view.findOneByOrFail({ userId: member.id })).toEqual(
      expect.objectContaining({ completedAt }),
    );
    const report = await repository.findAll(criteria({ orgId: member.orgId }));
    expect(report).toHaveLength(1);
    expect(report[0]).toEqual(
      expect.objectContaining({
        userId: member.id,
        completedAt,
        status: CertificateValidityStatus.VALID,
      }),
    );
  });

  it('matches TypeScript validity, UTC month clamping, urgency and name ordering', async () => {
    expect(await repository.findAll(criteria())).toEqual(expected());
  });

  it('applies combined search/status filters before database pagination and count', async () => {
    const matching = expected().filter(
      (member) =>
        member.name.toLowerCase().includes('anna') &&
        member.status === CertificateValidityStatus.NOT_PASSED,
    );
    const result = await repository.findPage(
      criteria({
        search: ' ANNA ',
        status: CertificateValidityStatus.NOT_PASSED,
      }),
      { limit: 1, offset: 1 },
    );
    expect(result.total).toBe(matching.length);
    expect(result.data).toEqual(matching.slice(1, 2));
  });

  it('retains the filtered count when the requested page is empty', async () => {
    const result = await repository.findPage(criteria(), {
      limit: 25,
      offset: 1000,
    });
    expect(result.data).toEqual([]);
    expect(result.total).toBe(members.length);
  });

  it.each([false, true])(
    'returns the full export in exactly the page order (annual=%s)',
    async (renewalRequired) => {
      const filter = criteria({ renewalRequired });
      const all = await repository.findAll(filter);
      const first = await repository.findPage(filter, { limit: 4, offset: 0 });
      const second = await repository.findPage(filter, {
        limit: 20,
        offset: 4,
      });
      expect([...first.data, ...second.data]).toEqual(all);
      expect(all).toEqual(expected(renewalRequired));
    },
  );

  it('returns no members or count for a different organization', async () => {
    const result = await repository.findPage(
      criteria({ orgId: randomUUID() }),
      { limit: 25, offset: 0 },
    );
    expect(result.total).toBe(0);
    expect(result.data).toEqual([]);
  });

  it('binds hostile search text as data', async () => {
    expect(
      await repository.findAll(criteria({ search: "' OR 1=1 --" })),
    ).toEqual([]);
  });

  it('uses the supplied Academy validity period rather than hardcoding one year', async () => {
    const rows = await repository.findAll(criteria({ validityMonths: 24 }));
    expect(rows.find((row) => row.name === 'Anna Leap')?.expiresAt).toEqual(
      new Date('2026-02-28T12:00:00Z'),
    );
    expect(
      rows
        .filter((row) => row.completedAt)
        .every((row) => row.status === CertificateValidityStatus.VALID),
    ).toBe(true);
  });

  it('returns only one page for a 10,000-member organization', async () => {
    const largeOrgId = randomUUID();
    await db.query(
      `INSERT INTO "${schema}".users (id, "orgId", name, email)
      SELECT gen_random_uuid()::text, $1, 'Member ' || n, 'member-' || n || '@example.com'
      FROM generate_series(1, 10000) n`,
      [largeOrgId],
    );
    await db.query(
      `INSERT INTO "${schema}".academy_completion (id, "userId", "completedAt")
      SELECT gen_random_uuid()::text, id, CASE WHEN name LIKE '%0' THEN '2023-01-15'::timestamp ELSE '2025-01-15'::timestamp END
      FROM "${schema}".users WHERE "orgId" = $1`,
      [largeOrgId],
    );
    await db.query(`ANALYZE "${schema}".users`);
    await db.query(`ANALYZE "${schema}".academy_completion`);
    const log = jest.spyOn(db.logger, 'logQuery');
    const page = await repository.findPage(criteria({ orgId: largeOrgId }), {
      limit: 25,
      offset: 500,
    });
    expect(log).toHaveBeenCalledTimes(1);
    const [sql, parameters] = log.mock.calls.at(-1)!;
    log.mockRestore();
    expect(page.data).toHaveLength(25);
    expect(page.total).toBe(10000);
    const plan = await db.query<
      Array<{
        'QUERY PLAN': Array<{
          'Execution Time': number;
          'Planning Time': number;
        }>;
      }>
    >(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`, parameters);
    new Logger('CertificateReportingBenchmark').log(
      {
        members: page.total,
        returnedRows: page.data.length,
        executionMs: plan[0]['QUERY PLAN'][0]['Execution Time'],
        planningMs: plan[0]['QUERY PLAN'][0]['Planning Time'],
      },
      'PostgreSQL page query',
    );
  });
});
