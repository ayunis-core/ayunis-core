import type { DataSource, QueryRunner } from 'typeorm';
import { PostgresCreditReconciliationLock } from './postgres-credit-reconciliation-lock';

function fixture(acquired: boolean) {
  const queryRunner = {
    connect: jest.fn().mockResolvedValue(undefined),
    query: jest
      .fn()
      .mockResolvedValueOnce([{ acquired }])
      .mockResolvedValueOnce([{ released: true }]),
    release: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<QueryRunner>;
  const dataSource = {
    createQueryRunner: jest.fn().mockReturnValue(queryRunner),
  } as unknown as jest.Mocked<DataSource>;
  return { queryRunner, dataSource };
}

describe('PostgresCreditReconciliationLock', () => {
  it('holds one session lock while the reconciliation callback runs', async () => {
    const { queryRunner, dataSource } = fixture(true);
    const callback = jest.fn().mockResolvedValue(undefined);
    const lock = new PostgresCreditReconciliationLock(dataSource);

    await expect(lock.runExclusive(callback)).resolves.toBe(true);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(queryRunner.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('pg_try_advisory_lock'),
    );
    expect(queryRunner.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('pg_advisory_unlock'),
    );
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
  });

  it('does not run when another process holds the lock', async () => {
    const { queryRunner, dataSource } = fixture(false);
    const callback = jest.fn();
    const lock = new PostgresCreditReconciliationLock(dataSource);

    await expect(lock.runExclusive(callback)).resolves.toBe(false);

    expect(callback).not.toHaveBeenCalled();
    expect(queryRunner.query).toHaveBeenCalledTimes(1);
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
  });
});
