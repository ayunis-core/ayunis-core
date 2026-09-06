import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { IsNull, Repository } from 'typeorm';
import type { UUID } from 'crypto';
import { MfaRecoveryCodesRepository } from 'src/iam/mfa/application/ports/mfa-recovery-codes.repository';
import { MfaRecoveryCode } from 'src/iam/mfa/domain/mfa-recovery-code.entity';
import { MfaRecoveryCodeRecord } from './schema/mfa-recovery-code.record';
import { MfaRecoveryCodeMapper } from './mappers/mfa-recovery-code.mapper';

@Injectable()
export class LocalMfaRecoveryCodesRepository extends MfaRecoveryCodesRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  private get records(): Repository<MfaRecoveryCodeRecord> {
    return this.txHost.tx.getRepository(MfaRecoveryCodeRecord);
  }

  async replaceForUser(userId: UUID, codes: MfaRecoveryCode[]): Promise<void> {
    await this.txHost.withTransaction(async () => {
      await this.records.delete({ userId });
      await this.records.save(
        codes.map((code) => MfaRecoveryCodeMapper.toRecord(code)),
      );
    });
  }

  async findUnusedByUserId(userId: UUID): Promise<MfaRecoveryCode[]> {
    const records = await this.records.find({
      where: { userId, usedAt: IsNull() },
    });
    return records.map((record) => MfaRecoveryCodeMapper.toDomain(record));
  }

  async countUnusedByUserId(userId: UUID): Promise<number> {
    return this.records.count({ where: { userId, usedAt: IsNull() } });
  }

  async consume(id: UUID, usedAt: Date): Promise<boolean> {
    // Conditional update keeps consumption single-use under concurrency.
    const result = await this.records.update(
      { id, usedAt: IsNull() },
      { usedAt },
    );
    return result.affected === 1;
  }

  async deleteByUserId(userId: UUID): Promise<void> {
    await this.records.delete({ userId });
  }
}
