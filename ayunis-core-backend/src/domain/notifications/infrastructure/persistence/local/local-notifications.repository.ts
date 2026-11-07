import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { UUID } from 'crypto';
import type { EntityManager } from 'typeorm';
import { IsNull, LessThan, Repository } from 'typeorm';
import { Paginated } from 'src/common/pagination/paginated.entity';
import type { PaginatedQueryParams } from 'src/common/pagination/paginated.query';
import type { UnreadNotificationTypeCount } from 'src/domain/notifications/application/models/unread-notification-counts';
import type { NotificationsFilter } from 'src/domain/notifications/application/ports/notifications.repository';
import { NotificationsRepository } from 'src/domain/notifications/application/ports/notifications.repository';
import type { Notification } from 'src/domain/notifications/domain/notification.entity';
import type { NotificationType } from 'src/domain/notifications/domain/notification-type.enum';
import { NotificationMapper } from './mappers/notification.mapper';
import { NotificationRecord } from './schema/notification.record';

@Injectable()
export class LocalNotificationsRepository extends NotificationsRepository {
  constructor(
    @InjectRepository(NotificationRecord)
    private readonly defaultRepo: Repository<NotificationRecord>,
    private readonly mapper: NotificationMapper,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  private get repo(): Repository<NotificationRecord> {
    const manager = this.txHost.tx as EntityManager | undefined;
    return manager?.getRepository(NotificationRecord) ?? this.defaultRepo;
  }

  async create(notification: Notification): Promise<Notification> {
    const saved = await this.repo.save(this.mapper.toRecord(notification));
    return this.mapper.toDomain(saved);
  }

  createWithinRoutineThreadLimit(
    notification: Notification & { routineThreadId: UUID },
    limit: number,
  ): Promise<Notification | null> {
    return this.repo.manager.transaction(async (manager) => {
      // Held until the transaction ends, so a concurrent call for the same
      // thread counts this notification before deciding.
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [`notification-limit:${notification.routineThreadId}`],
      );
      const repo = manager.getRepository(NotificationRecord);
      const sent = await repo.count({
        where: { routineThreadId: notification.routineThreadId },
      });
      if (sent >= limit) return null;
      const saved = await repo.save(this.mapper.toRecord(notification));
      return this.mapper.toDomain(saved);
    });
  }

  async findById(userId: UUID, id: UUID): Promise<Notification | null> {
    const record = await this.repo.findOne({ where: { id, userId } });
    return record ? this.mapper.toDomain(record) : null;
  }

  async findPageByUserId(
    userId: UUID,
    { limit, offset }: PaginatedQueryParams,
    { routineId, type }: NotificationsFilter = {},
  ): Promise<Paginated<Notification>> {
    const [records, total] = await this.repo.findAndCount({
      where: { userId, ...(routineId && { routineId }), ...(type && { type }) },
      order: { createdAt: 'DESC', id: 'DESC' },
      take: limit,
      skip: offset,
    });
    return new Paginated({
      data: records.map((record) => this.mapper.toDomain(record)),
      limit,
      offset,
      total,
    });
  }

  async countUnreadByType(
    userId: UUID,
  ): Promise<UnreadNotificationTypeCount[]> {
    const rows = await this.repo
      .createQueryBuilder('notification')
      .select('notification.type', 'type')
      .addSelect('COUNT(*)::int', 'count')
      .where('notification.userId = :userId', { userId })
      .andWhere('notification.readAt IS NULL')
      .groupBy('notification.type')
      .orderBy('notification.type', 'ASC')
      .getRawMany<{ type: NotificationType; count: number }>();
    return rows.map(({ type, count }) => ({ type, count }));
  }

  async markRead(
    userId: UUID,
    id: UUID,
    readAt: Date,
  ): Promise<Notification | null> {
    const result = await this.repo
      .createQueryBuilder()
      .update(NotificationRecord)
      .set({ readAt: () => 'COALESCE("readAt", :readAt)' })
      .where('id = :id AND "userId" = :userId', { id, userId })
      .setParameters({ readAt })
      .returning('*')
      .execute();
    const record = (result.raw as NotificationRecord[]).at(0);
    return record ? this.mapper.toDomain(record) : null;
  }

  async markAllRead(userId: UUID, readAt: Date): Promise<number> {
    const result = await this.repo.update(
      { userId, readAt: IsNull() },
      { readAt },
    );
    return result.affected ?? 0;
  }

  countByOrgCreatedBefore(orgId: UUID, before: Date): Promise<number> {
    return this.repo.count({
      where: { orgId, createdAt: LessThan(before) },
    });
  }

  async deleteByOrgCreatedBefore(orgId: UUID, before: Date): Promise<number> {
    const result = await this.repo.delete({
      orgId,
      createdAt: LessThan(before),
    });
    return result.affected ?? 0;
  }
}
