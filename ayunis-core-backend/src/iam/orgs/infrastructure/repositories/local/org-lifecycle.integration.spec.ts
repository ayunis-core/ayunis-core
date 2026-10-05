import 'src/config/env';
import { randomUUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { QueryRunner } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { LocalOrgsRepository } from './local-orgs.repository';
import { OrgRecord } from './schema/org.record';
import { AddOrgArchiveAndSessionVersion1790868371162 } from 'src/db/migrations/1790868371162-AddOrgArchiveAndSessionVersion';

it('preserves archive data, invalidates generations, rolls back failure, and serializes lifecycle admission with deletion', async () => {
  const schema = `ayc35_${randomUUID().replaceAll('-', '')}`;
  const orgId = randomUUID();
  const db = new DataSource({
    ...(typeormConfigRaw as PostgresConnectionOptions),
    entities: [
      new EntitySchema<OrgRecord>({
        name: 'OrgRecord',
        target: OrgRecord,
        tableName: 'orgs',
        schema,
        columns: {
          id: { type: 'uuid', primary: true },
          name: { type: String },
          archived: { type: Boolean, default: false },
          sessionVersion: { type: Number, default: 0 },
          createdAt: { type: Date, createDate: true },
          updatedAt: { type: Date, updateDate: true },
        },
      }),
    ],
    migrations: [],
    migrationsRun: false,
    logging: false,
  });
  await db.initialize();
  const runner = db.createQueryRunner();
  const admission = db.createQueryRunner();
  await runner.connect();
  await admission.connect();
  const repository = (connection: QueryRunner) =>
    new LocalOrgsRepository({ tx: connection.manager } as never);
  try {
    await runner.createSchema(schema, true);
    await runner.query(`SET search_path TO "${schema}"`);
    await runner.query(
      'CREATE TABLE orgs (id uuid PRIMARY KEY, name varchar NOT NULL, "createdAt" timestamp NOT NULL DEFAULT NOW(), "updatedAt" timestamp NOT NULL DEFAULT NOW())',
    );
    await runner.query(
      'CREATE TABLE members (id uuid PRIMARY KEY, "orgId" uuid REFERENCES orgs(id) ON DELETE CASCADE)',
    );
    await runner.query('INSERT INTO orgs(id,name) VALUES ($1,$2)', [
      orgId,
      'Archive regression',
    ]);
    await runner.query('INSERT INTO members VALUES ($1,$2)', [
      randomUUID(),
      orgId,
    ]);
    const migration = new AddOrgArchiveAndSessionVersion1790868371162();
    await migration.up(runner);
    expect(await repository(runner).findById(orgId)).toMatchObject({
      archived: false,
      sessionVersion: 0,
    });
    await runner.startTransaction();
    await repository(runner).updateArchived(orgId, true);
    await runner.rollbackTransaction();
    expect(await repository(runner).findById(orgId)).toMatchObject({
      archived: false,
      sessionVersion: 0,
    });
    await repository(runner).updateArchived(orgId, true);
    await repository(runner).updateArchived(orgId, true);
    expect(await repository(runner).findById(orgId)).toMatchObject({
      archived: true,
      sessionVersion: 1,
    });
    await repository(runner).updateArchived(orgId, false);
    expect(await repository(runner).findById(orgId)).toMatchObject({
      archived: false,
      sessionVersion: 1,
    });
    expect(
      await runner.query('SELECT count(*)::int AS count FROM members'),
    ).toEqual([{ count: 1 }]);
    await admission.startTransaction();
    await repository(admission).findById(orgId, true);
    let removed = false;
    const deletion = repository(runner)
      .delete(orgId, 'Archive regression')
      .then(() => {
        removed = true;
      });
    await runner.query('SELECT pg_sleep(0.05)');
    expect(removed).toBe(false);
    await admission.commitTransaction();
    await deletion;
    expect(
      await runner.query('SELECT count(*)::int AS count FROM members'),
    ).toEqual([{ count: 0 }]);
    await expect(repository(admission).findById(orgId)).rejects.toMatchObject({
      code: 'ORG_NOT_FOUND',
    });
    await migration.down(runner);
    await migration.up(runner);
    const lateJobOrgId = randomUUID();
    await runner.query('INSERT INTO orgs(id,name) VALUES ($1,$2)', [
      lateJobOrgId,
      'Late job regression',
    ]);
    expect(
      await runner.query('SELECT archived, "sessionVersion" FROM orgs'),
    ).toEqual([{ archived: false, sessionVersion: 0 }]);

    await runner.startTransaction();
    await repository(runner).lockForLifecycleMutation(lateJobOrgId);
    await admission.startTransaction();
    let admitted = false;
    const lateAdmission = repository(admission)
      .findById(lateJobOrgId, true)
      .then(() => {
        admitted = true;
      });
    await runner.query('SELECT pg_sleep(0.05)');
    expect(admitted).toBe(false);
    await repository(runner).delete(lateJobOrgId);
    await runner.commitTransaction();
    await expect(lateAdmission).rejects.toMatchObject({
      code: 'ORG_NOT_FOUND',
    });
    await admission.rollbackTransaction();
  } finally {
    if (admission.isTransactionActive) await admission.rollbackTransaction();
    await runner.query('SET search_path TO public');
    await runner.dropSchema(schema, true, true);
    await admission.release();
    await runner.release();
    await db.destroy();
  }
}, 30_000);
