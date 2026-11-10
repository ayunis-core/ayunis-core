import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import type { UUID } from 'crypto';
import { RefreshTokensRepository } from 'src/iam/sessions/application/ports/refresh-tokens.repository';
import { RefreshToken } from 'src/iam/sessions/domain/refresh-token.entity';
import { RefreshTokenRecord } from './schema/refresh-token.record';
import { RefreshTokenMapper } from './mappers/refresh-token.mapper';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';

/** Internal control flow: aborts the rotation transaction to roll it back. */
class RotationLostError extends Error {}

// Each deleted row also fires the self-referencing FK's SET NULL lookup, so a
// bounded batch keeps every DELETE inside the statement timeout no matter how
// large the expired backlog has grown (AYC-1237).
export const EXPIRED_TOKEN_DELETE_BATCH_SIZE = 1000;
const SESSION_USER_LOCK_NAMESPACE = 'session-user:';

@Injectable()
export class LocalRefreshTokensRepository extends RefreshTokensRepository {
  constructor(
    @InjectRepository(RefreshTokenRecord)
    private readonly repository: Repository<RefreshTokenRecord>,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  async insert(token: RefreshToken): Promise<void> {
    await this.txHost.tx
      .getRepository(RefreshTokenRecord)
      .save(RefreshTokenMapper.toRecord(token));
  }

  async insertForkIfSourceValid(
    sourceId: UUID,
    token: RefreshToken,
    graceSeconds: number,
  ): Promise<boolean> {
    return this.withUserLocks([token.userId], async (manager) => {
      const sourceIsValid = await manager
        .getRepository(RefreshTokenRecord)
        .createQueryBuilder('token')
        .where('token.id = :sourceId', { sourceId })
        .andWhere('token.userId = :userId', { userId: token.userId })
        .andWhere('token.revokedAt IS NULL')
        .andWhere('token.expiresAt > NOW()')
        .andWhere(
          '(token.usedAt IS NULL OR token.usedAt > NOW() - make_interval(secs => :graceSeconds))',
          { graceSeconds },
        )
        .getExists();
      if (!sourceIsValid) return false;
      await manager.save(RefreshTokenMapper.toRecord(token));
      return true;
    });
  }

  async insertSuccessorWithinGrace(
    sourceId: UUID,
    token: RefreshToken,
    graceSeconds: number,
  ): Promise<boolean> {
    return this.withUserLocks([token.userId], async (manager) => {
      const sourceIsWithinGrace = await manager
        .getRepository(RefreshTokenRecord)
        .createQueryBuilder('token')
        .where('token.id = :sourceId', { sourceId })
        .andWhere('token.userId = :userId', { userId: token.userId })
        .andWhere('token.revokedAt IS NULL')
        .andWhere('token.expiresAt > NOW()')
        .andWhere('token.usedAt IS NOT NULL')
        .andWhere(
          'token.usedAt > NOW() - make_interval(secs => :graceSeconds)',
          { graceSeconds },
        )
        .getExists();
      if (!sourceIsWithinGrace) return false;
      await manager.save(RefreshTokenMapper.toRecord(token));
      return true;
    });
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const record = await this.txHost.tx
      .getRepository(RefreshTokenRecord)
      .findOne({ where: { tokenHash } });
    return record ? RefreshTokenMapper.toDomain(record) : null;
  }

  async markUsedAndInsertSuccessor(
    currentId: UUID,
    successor: RefreshToken,
  ): Promise<boolean> {
    try {
      await this.txHost.tx.transaction(async (manager) => {
        await this.lockUsers(manager, [successor.userId]);
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
    const count = await this.txHost.tx
      .getRepository(RefreshTokenRecord)
      .createQueryBuilder('t')
      .where('t.id = :id', { id })
      .andWhere('t.revokedAt IS NULL')
      .andWhere('t.expiresAt > NOW()')
      .andWhere('t.usedAt IS NOT NULL')
      .andWhere('t.usedAt > NOW() - make_interval(secs => :graceSeconds)', {
        graceSeconds,
      })
      .getCount();
    return count > 0;
  }

  // Reuse handling calls this after the refresh transaction rolls back, so
  // the theft-response revocation commits independently.
  async revokeFamily(familyId: UUID): Promise<void> {
    await this.revokeMatchingUsers((query) =>
      query.where('token.familyId = :familyId', { familyId }),
    );
  }

  async revokeAllForUser(userId: UUID): Promise<void> {
    await this.revokeMatchingUsers(
      (query) => query.where('token.userId = :userId', { userId }),
      [userId],
    );
  }

  async revokeByZitadelSessionId(zitadelSessionId: string): Promise<void> {
    await this.revokeMatchingUsers((query) =>
      query
        .where('token.zitadelSessionId = :zitadelSessionId', {
          zitadelSessionId,
        })
        .andWhere('token.authenticationMethod = :authenticationMethod', {
          authenticationMethod: SessionAuthenticationMethod.SSO,
        }),
    );
  }

  async revokeSsoForUser(userId: UUID): Promise<void> {
    await this.revokeMatchingUsers(
      (query) =>
        query
          .where('token.userId = :userId', { userId })
          .andWhere('token.authenticationMethod = :method', {
            method: SessionAuthenticationMethod.SSO,
          }),
      [userId],
    );
  }

  async revokeAllForOrg(orgId: UUID): Promise<void> {
    await this.revokeMatchingUsers((query) => this.scopeToOrg(query, orgId));
  }

  async revokePasswordSessionsForOrg(orgId: UUID): Promise<void> {
    await this.revokeMatchingUsers((query) =>
      this.scopeToOrg(query, orgId).andWhere(
        'token.authenticationMethod = :method',
        { method: SessionAuthenticationMethod.PASSWORD },
      ),
    );
  }

  async revokeAllForUserExceptFamily(
    userId: UUID,
    keepFamilyId: UUID,
  ): Promise<void> {
    await this.revokeMatchingUsers(
      (query) =>
        query
          .where('token.userId = :userId', { userId })
          .andWhere('token.familyId != :keepFamilyId', { keepFamilyId }),
      [userId],
    );
  }

  private async revokeMatchingUsers(
    scope: (
      query: SelectQueryBuilder<RefreshTokenRecord>,
    ) => SelectQueryBuilder<RefreshTokenRecord>,
    knownUserIds: UUID[] = [],
  ): Promise<void> {
    await this.txHost.tx.transaction(async (manager) => {
      const query = scope(
        manager.getRepository(RefreshTokenRecord).createQueryBuilder('token'),
      );
      await this.lockUsers(manager, knownUserIds);
      await this.lockSelectedUsers(manager, query);
      const ids = query.select('token.id').getQuery();
      await manager
        .getRepository(RefreshTokenRecord)
        .createQueryBuilder()
        .update(RefreshTokenRecord)
        .set({ revokedAt: () => 'NOW()' })
        .where(`id IN (${ids})`, query.getParameters())
        .andWhere('revokedAt IS NULL')
        .execute();
    });
  }

  private async lockSelectedUsers(
    manager: EntityManager,
    selection: SelectQueryBuilder<RefreshTokenRecord>,
  ): Promise<void> {
    const users = selection.clone().select('DISTINCT token.userId', 'userId');
    const [sql, parameters] = users.getQueryAndParameters();
    await manager.query(
      `SELECT count(*)
       FROM (
         SELECT pg_advisory_xact_lock(
           hashtextextended(
             '${SESSION_USER_LOCK_NAMESPACE}' || scoped."userId"::text,
             0
           )
         )
         FROM (${sql}) scoped
         ORDER BY scoped."userId"
       ) locked_users`,
      parameters,
    );
  }

  private scopeToOrg(
    query: SelectQueryBuilder<RefreshTokenRecord>,
    orgId: UUID,
  ): SelectQueryBuilder<RefreshTokenRecord> {
    const users = query
      .subQuery()
      .select('user.id')
      .from(UserRecord, 'user')
      .where('user.orgId = :orgId')
      .getQuery();
    return query.where(`token.userId IN ${users}`, { orgId });
  }

  private async withUserLocks<T>(
    userIds: UUID[],
    action: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return this.txHost.tx.transaction(async (manager) => {
      await this.lockUsers(manager, userIds);
      return action(manager);
    });
  }

  private async lockUsers(
    manager: EntityManager,
    userIds: UUID[],
  ): Promise<void> {
    if (userIds.length === 0) return;
    const sortedUserIds = [...new Set(userIds)].sort((left, right) =>
      left.localeCompare(right),
    );
    await manager.query(
      `SELECT pg_advisory_xact_lock(
         hashtextextended(
           '${SESSION_USER_LOCK_NAMESPACE}' || "userId"::text,
           0
         )
       )
       FROM unnest($1::uuid[]) AS locked("userId")
       ORDER BY "userId"`,
      [sortedUserIds],
    );
  }

  async deleteExpired(now: Date): Promise<number> {
    let deleted = 0;
    let batch: number;
    do {
      batch = await this.deleteExpiredBatch(now);
      deleted += batch;
    } while (batch === EXPIRED_TOKEN_DELETE_BATCH_SIZE);
    return deleted;
  }

  private async deleteExpiredBatch(now: Date): Promise<number> {
    const expiredIds = this.repository
      .createQueryBuilder('token')
      .select('token.id')
      .where('token.expiresAt < :now')
      .limit(EXPIRED_TOKEN_DELETE_BATCH_SIZE)
      .getQuery();
    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .from(RefreshTokenRecord)
      .where(`id IN (${expiredIds})`, { now })
      .execute();
    return result.affected ?? 0;
  }
}
