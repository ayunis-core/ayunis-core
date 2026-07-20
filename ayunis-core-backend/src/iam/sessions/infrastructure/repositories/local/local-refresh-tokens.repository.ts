import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import type { UUID } from 'crypto';
import { RefreshTokensRepository } from 'src/iam/sessions/application/ports/refresh-tokens.repository';
import { RefreshToken } from 'src/iam/sessions/domain/refresh-token.entity';
import { RefreshTokenRecord } from './schema/refresh-token.record';
import { RefreshTokenMapper } from './mappers/refresh-token.mapper';

/** Internal control flow: aborts the rotation transaction to roll it back. */
class RotationLostError extends Error {}

@Injectable()
export class LocalRefreshTokensRepository extends RefreshTokensRepository {
  constructor(
    @InjectRepository(RefreshTokenRecord)
    private readonly repository: Repository<RefreshTokenRecord>,
  ) {
    super();
  }

  async insert(token: RefreshToken): Promise<void> {
    await this.repository.save(RefreshTokenMapper.toRecord(token));
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const record = await this.repository.findOne({ where: { tokenHash } });
    return record ? RefreshTokenMapper.toDomain(record) : null;
  }

  async markUsedAndInsertSuccessor(
    currentId: UUID,
    successor: RefreshToken,
  ): Promise<boolean> {
    try {
      await this.repository.manager.transaction(async (manager) => {
        // Successor goes in first so the FK behind replacedByTokenId holds;
        // losing the conditional update rolls the insert back. The conditional
        // update on DB time keeps rotation single-winner under concurrency and
        // independent of app-clock skew.
        await manager.save(RefreshTokenMapper.toRecord(successor));
        const result = await manager
          .createQueryBuilder()
          .update(RefreshTokenRecord)
          .set({ usedAt: () => 'NOW()', replacedByTokenId: successor.id })
          .where('id = :id', { id: currentId })
          .andWhere('usedAt IS NULL')
          .andWhere('revokedAt IS NULL')
          .andWhere('expiresAt > NOW()')
          .execute();
        if (result.affected !== 1) {
          throw new RotationLostError();
        }
      });
    } catch (error) {
      if (error instanceof RotationLostError) {
        return false;
      }
      throw error;
    }
    return true;
  }

  async wasUsedWithinGrace(id: UUID, graceSeconds: number): Promise<boolean> {
    const count = await this.repository
      .createQueryBuilder('t')
      .where('t.id = :id', { id })
      .andWhere('t.usedAt IS NOT NULL')
      .andWhere('t.usedAt > NOW() - make_interval(secs => :graceSeconds)', {
        graceSeconds,
      })
      .getCount();
    return count > 0;
  }

  async revokeFamily(familyId: UUID): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(RefreshTokenRecord)
      .set({ revokedAt: () => 'NOW()' })
      .where('familyId = :familyId', { familyId })
      .andWhere('revokedAt IS NULL')
      .execute();
  }

  async revokeAllForUser(userId: UUID): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(RefreshTokenRecord)
      .set({ revokedAt: () => 'NOW()' })
      .where('userId = :userId', { userId })
      .andWhere('revokedAt IS NULL')
      .execute();
  }

  async revokeAllForUserExceptFamily(
    userId: UUID,
    keepFamilyId: UUID,
  ): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(RefreshTokenRecord)
      .set({ revokedAt: () => 'NOW()' })
      .where('userId = :userId', { userId })
      .andWhere('familyId != :keepFamilyId', { keepFamilyId })
      .andWhere('revokedAt IS NULL')
      .execute();
  }

  async deleteExpired(now: Date): Promise<number> {
    const result = await this.repository.delete({ expiresAt: LessThan(now) });
    return result.affected ?? 0;
  }
}
