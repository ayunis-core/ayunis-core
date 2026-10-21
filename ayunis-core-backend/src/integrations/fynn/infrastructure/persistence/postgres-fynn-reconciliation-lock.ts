import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FynnReconciliationLock } from 'src/integrations/fynn/application/ports/fynn-reconciliation-lock';

@Injectable()
export class PostgresFynnReconciliationLock extends FynnReconciliationLock {
  constructor(private readonly db: DataSource) {
    super();
  }
  async runIfAvailable(work: () => Promise<void>): Promise<boolean> {
    const connection = this.db.createQueryRunner();
    await connection.connect();
    try {
      const [row] = (await connection.query(
        "SELECT pg_try_advisory_lock(hashtextextended('fynn-reconciliation', 0)) AS locked",
      )) as Array<{ locked: boolean }>;
      if (!row.locked) return false;
      try {
        await work();
      } finally {
        await connection.query(
          "SELECT pg_advisory_unlock(hashtextextended('fynn-reconciliation', 0))",
        );
      }
      return true;
    } finally {
      await connection.release();
    }
  }
}
