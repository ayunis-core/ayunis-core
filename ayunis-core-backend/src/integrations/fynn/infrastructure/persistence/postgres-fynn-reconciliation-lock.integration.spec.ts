import 'src/config/env';
import { DataSource } from 'typeorm';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { PostgresFynnReconciliationLock } from './postgres-fynn-reconciliation-lock';

describe('Fynn reconciliation replica lock', () => {
  const db = new DataSource({
    ...typeormConfigRaw,
    entities: [],
    migrations: [],
    migrationsRun: false,
    logging: false,
  });
  beforeAll(async () => {
    await db.initialize();
  });
  afterAll(async () => {
    if (db.isInitialized) await db.destroy();
  });
  it('skips a second replica and releases the connection lock after a failed job', async () => {
    const first = new PostgresFynnReconciliationLock(db);
    const second = new PostgresFynnReconciliationLock(db);
    let secondRan = false;
    await expect(
      first.runIfAvailable(async () => {
        expect(
          await second.runIfAvailable(async () => {
            secondRan = true;
          }),
        ).toBe(false);
        throw new Error('job failed');
      }),
    ).rejects.toThrow('job failed');
    expect(secondRan).toBe(false);
    expect(
      await second.runIfAvailable(async () => {
        secondRan = true;
      }),
    ).toBe(true);
    expect(secondRan).toBe(true);
  });
});
