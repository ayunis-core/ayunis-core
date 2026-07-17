import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, Not, Repository } from 'typeorm';
import type { UUID } from 'crypto';
import { PasswordSetTokensRepository } from '../../../application/ports/password-set-tokens.repository';
import { PasswordSetToken } from '../../../domain/password-set-token.entity';
import type { PasswordSetTokenPurpose } from '../../../domain/value-objects/password-set-token-purpose.enum';
import { PasswordSetTokenRecord } from './schema/password-set-token.record';
import { PasswordSetTokenMapper } from './mappers/password-set-token.mapper';

@Injectable()
export class LocalPasswordSetTokensRepository extends PasswordSetTokensRepository {
  constructor(
    @InjectRepository(PasswordSetTokenRecord)
    private readonly repository: Repository<PasswordSetTokenRecord>,
  ) {
    super();
  }

  async replaceForUser(
    userId: UUID,
    purpose: PasswordSetTokenPurpose,
    token: PasswordSetToken,
  ): Promise<void> {
    await this.repository.manager.transaction(async (manager) => {
      await manager.delete(PasswordSetTokenRecord, { userId, purpose });
      await manager.save(PasswordSetTokenMapper.toRecord(token));
    });
  }

  async findByTokenHash(tokenHash: string): Promise<PasswordSetToken | null> {
    const record = await this.repository.findOne({ where: { tokenHash } });
    return record ? PasswordSetTokenMapper.toDomain(record) : null;
  }

  async consume(id: UUID, usedAt: Date): Promise<boolean> {
    // Conditional update keeps consumption single-use under concurrency.
    const result = await this.repository.update(
      { id, usedAt: IsNull() },
      { usedAt },
    );
    return result.affected === 1;
  }

  async deleteExpiredOrUsed(now: Date): Promise<number> {
    const expired = await this.repository.delete({
      expiresAt: LessThanOrEqual(now),
    });
    const used = await this.repository.delete({ usedAt: Not(IsNull()) });
    return (expired.affected ?? 0) + (used.affected ?? 0);
  }
}
