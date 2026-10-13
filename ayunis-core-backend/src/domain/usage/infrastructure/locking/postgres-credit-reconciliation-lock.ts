import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreditReconciliationLock } from 'src/domain/usage/application/ports/credit-reconciliation-lock.port';

const TRY_LOCK_SQL =
  "SELECT pg_try_advisory_lock(hashtext('ayunis-credit-reconciliation')) AS acquired";
const UNLOCK_SQL =
  "SELECT pg_advisory_unlock(hashtext('ayunis-credit-reconciliation')) AS released";

@Injectable()
export class PostgresCreditReconciliationLock extends CreditReconciliationLock {
  constructor(private readonly dataSource: DataSource) {
    super();
  }

  async runExclusive(callback: () => Promise<void>): Promise<boolean> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const rows = (await queryRunner.query(TRY_LOCK_SQL)) as Array<{
        acquired: boolean;
      }>;
      if (rows[0]?.acquired !== true) return false;
      try {
        await callback();
        return true;
      } finally {
        await queryRunner.query(UNLOCK_SQL);
      }
    } finally {
      await queryRunner.release();
    }
  }
}
