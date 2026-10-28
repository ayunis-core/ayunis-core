import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, MoreThan, type Repository } from 'typeorm';
import { SsoLoginTransactionsRepository } from 'src/iam/sso/application/ports/sso-login-transactions.repository';
import type { SsoLoginTransaction } from 'src/iam/sso/domain/sso-login-transaction.entity';
import { SsoLoginTransactionMapper } from 'src/iam/sso/infrastructure/persistence/postgres/mappers/sso-login-transaction.mapper';
import { SsoLoginTransactionRecord } from 'src/iam/sso/infrastructure/persistence/postgres/schema/sso-login-transaction.record';

@Injectable()
export class PostgresSsoLoginTransactionsRepository extends SsoLoginTransactionsRepository {
  constructor(
    @InjectRepository(SsoLoginTransactionRecord)
    private readonly repository: Repository<SsoLoginTransactionRecord>,
  ) {
    super();
  }

  async save(transaction: SsoLoginTransaction): Promise<SsoLoginTransaction> {
    const saved = await this.repository.save(
      SsoLoginTransactionMapper.toRecord(transaction),
    );
    return SsoLoginTransactionMapper.toDomain(saved);
  }

  async consume(
    stateHash: string,
    browserBindingHash: string,
    consumedAt: Date,
  ): Promise<SsoLoginTransaction | null> {
    return this.repository.manager.transaction(async (manager) => {
      const repository = manager.getRepository(SsoLoginTransactionRecord);
      const record = await repository.findOne({
        where: {
          stateHash,
          browserBindingHash,
          consumedAt: IsNull(),
          expiresAt: MoreThan(consumedAt),
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (!record) {
        return null;
      }
      record.consumedAt = consumedAt;
      return SsoLoginTransactionMapper.toDomain(await repository.save(record));
    });
  }

  async deleteExpired(now: Date): Promise<number> {
    const result = await this.repository.delete({
      expiresAt: LessThanOrEqual(now),
    });
    return result.affected ?? 0;
  }
}
