import { Injectable } from '@nestjs/common';
import { randomUUID, type UUID } from 'crypto';
import type { EntityManager } from 'typeorm';
import { DataSource, LessThanOrEqual, MoreThan } from 'typeorm';
import {
  PersonalCreditReservationRepository,
  type PersonalCreditReservationResult,
  type ReservePersonalCreditsParams,
} from 'src/iam/credit-limits/application/ports/personal-credit-reservation.repository';
import { UserCreditLimitRecord } from 'src/iam/credit-limits/infrastructure/persistence/local/schema/credit-limit.record';
import { PersonalCreditReservationRecord } from 'src/iam/credit-limits/infrastructure/persistence/local/schema/personal-credit-reservation.record';
import { UsageRecord } from 'src/domain/usage/infrastructure/persistence/local-usage/schema/usage.record';

@Injectable()
export class LocalPersonalCreditReservationRepository extends PersonalCreditReservationRepository {
  constructor(private readonly dataSource: DataSource) {
    super();
  }

  async reserve(
    params: ReservePersonalCreditsParams,
  ): Promise<PersonalCreditReservationResult> {
    return this.dataSource.transaction((manager) =>
      this.reserveInTransaction(manager, params),
    );
  }

  async release(params: {
    reservationId: UUID;
    orgId: UUID;
    userId: UUID;
  }): Promise<void> {
    await this.dataSource.transaction((manager) =>
      this.releaseInTransaction(manager, params),
    );
  }

  private async releaseInTransaction(
    manager: EntityManager,
    params: { reservationId: UUID; orgId: UUID; userId: UUID },
  ): Promise<void> {
    const reservationRepository = manager.getRepository(
      PersonalCreditReservationRecord,
    );
    const reservation = await reservationRepository.findOne({
      where: {
        id: params.reservationId,
        orgId: params.orgId,
        userId: params.userId,
      },
    });
    if (!reservation) return;

    await manager
      .getRepository(UserCreditLimitRecord)
      .createQueryBuilder('creditLimit')
      .setLock('pessimistic_write')
      .where('creditLimit.orgId = :orgId', { orgId: params.orgId })
      .andWhere('creditLimit.userId = :userId', { userId: params.userId })
      .getOne();

    await reservationRepository.delete({
      id: params.reservationId,
      orgId: params.orgId,
      userId: params.userId,
    });
  }

  private async reserveInTransaction(
    manager: EntityManager,
    params: ReservePersonalCreditsParams,
  ): Promise<PersonalCreditReservationResult> {
    const limit = await manager
      .getRepository(UserCreditLimitRecord)
      .createQueryBuilder('creditLimit')
      .setLock('pessimistic_write')
      .where('creditLimit.orgId = :orgId', { orgId: params.orgId })
      .andWhere('creditLimit.userId = :userId', { userId: params.userId })
      .getOne();
    if (!limit) return { status: 'unlimited' };

    await this.removeExpired(manager, params);
    const creditsUsed = await this.sumUsage(manager, params);
    const reservedCredits = await this.sumReservations(manager, params);
    const available = limit.monthlyCredits - creditsUsed - reservedCredits;
    if (available < params.minimumCredits) {
      return {
        status: 'insufficient',
        creditsUsed,
        reservedCredits,
        limit: limit.monthlyCredits,
      };
    }
    const credits = Math.min(params.requestedCredits, available);
    const reservationId = randomUUID();
    await manager.getRepository(PersonalCreditReservationRecord).insert({
      id: reservationId,
      orgId: params.orgId,
      userId: params.userId,
      credits,
      expiresAt: params.expiresAt,
    });
    return {
      status: 'reserved',
      reservation: { id: reservationId, credits },
    };
  }

  private async removeExpired(
    manager: EntityManager,
    params: ReservePersonalCreditsParams,
  ): Promise<void> {
    await manager.getRepository(PersonalCreditReservationRecord).delete({
      orgId: params.orgId,
      userId: params.userId,
      expiresAt: LessThanOrEqual(params.now),
    });
  }

  private async sumUsage(
    manager: EntityManager,
    params: ReservePersonalCreditsParams,
  ): Promise<number> {
    const row = await manager
      .getRepository(UsageRecord)
      .createQueryBuilder('usage')
      .select('COALESCE(SUM(usage.creditsConsumed), 0)', 'total')
      .where('usage.organizationId = :orgId', { orgId: params.orgId })
      .andWhere('usage.userId = :userId', { userId: params.userId })
      .andWhere('usage.createdAt >= :monthStart', {
        monthStart: params.monthStart,
      })
      .getRawOne<{ total: string }>();
    return Number(row?.total ?? 0);
  }

  private async sumReservations(
    manager: EntityManager,
    params: ReservePersonalCreditsParams,
  ): Promise<number> {
    const row = await manager
      .getRepository(PersonalCreditReservationRecord)
      .createQueryBuilder('reservation')
      .select('COALESCE(SUM(reservation.credits), 0)', 'total')
      .where('reservation.orgId = :orgId', { orgId: params.orgId })
      .andWhere('reservation.userId = :userId', { userId: params.userId })
      .andWhere({ expiresAt: MoreThan(params.now) })
      .getRawOne<{ total: string }>();
    return Number(row?.total ?? 0);
  }
}
