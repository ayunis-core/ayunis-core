import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import type { UUID } from 'crypto';
import { MfaRecoveryCodesRepository } from '../../../application/ports/mfa-recovery-codes.repository';
import { MfaRecoveryCode } from '../../../domain/mfa-recovery-code.entity';
import { MfaRecoveryCodeRecord } from './schema/mfa-recovery-code.record';
import { MfaRecoveryCodeMapper } from './mappers/mfa-recovery-code.mapper';

@Injectable()
export class LocalMfaRecoveryCodesRepository extends MfaRecoveryCodesRepository {
  constructor(
    @InjectRepository(MfaRecoveryCodeRecord)
    private readonly repository: Repository<MfaRecoveryCodeRecord>,
  ) {
    super();
  }

  async replaceForUser(userId: UUID, codes: MfaRecoveryCode[]): Promise<void> {
    await this.repository.manager.transaction(async (manager) => {
      await manager.delete(MfaRecoveryCodeRecord, { userId });
      await manager.save(
        codes.map((code) => MfaRecoveryCodeMapper.toRecord(code)),
      );
    });
  }

  async findUnusedByUserId(userId: UUID): Promise<MfaRecoveryCode[]> {
    const records = await this.repository.find({
      where: { userId, usedAt: IsNull() },
    });
    return records.map((record) => MfaRecoveryCodeMapper.toDomain(record));
  }

  async countUnusedByUserId(userId: UUID): Promise<number> {
    return this.repository.count({ where: { userId, usedAt: IsNull() } });
  }

  async consume(id: UUID, usedAt: Date): Promise<boolean> {
    // Conditional update keeps consumption single-use under concurrency.
    const result = await this.repository.update(
      { id, usedAt: IsNull() },
      { usedAt },
    );
    return result.affected === 1;
  }

  async deleteByUserId(userId: UUID): Promise<void> {
    await this.repository.delete({ userId });
  }
}
