import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { aNotification } from 'src/domain/notifications/application/testing/notification.fixtures';
import { NotificationType } from 'src/domain/notifications/domain/notification-type.enum';
import { LocalNotificationsRepository } from './local-notifications.repository';
import { NotificationMapper } from './mappers/notification.mapper';
import { NotificationRecord } from './schema/notification.record';

// The table without its foreign keys, so the test needs no users, orgs,
// routines or threads.
const notificationSchema = new EntitySchema<NotificationRecord>({
  name: 'NotificationRecord',
  target: NotificationRecord,
  tableName: 'notifications',
  columns: {
    id: { type: 'uuid', primary: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
    userId: { type: 'uuid' },
    orgId: { type: 'uuid' },
    type: { type: String },
    headline: { type: String },
    subheadline: { type: String },
    body: { type: 'text' },
    routineId: { type: 'uuid', nullable: true },
    routineThreadId: { type: 'uuid', nullable: true },
    readAt: { type: 'timestamptz', nullable: true },
  },
});

describe('LocalNotificationsRepository (PostgreSQL)', () => {
  let db: DataSource;
  let repository: LocalNotificationsRepository;
  let schema: string;
  const owner = randomUUID();
  const otherUser = randomUUID();
  const org = randomUUID();

  beforeAll(async () => {
    schema = `notifications_${randomUUID().replaceAll('-', '')}`;
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [notificationSchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${schema}"`);
    await db.synchronize();
    repository = new LocalNotificationsRepository(
      db.getRepository(NotificationRecord),
      new NotificationMapper(),
      {
        tx: undefined,
      } as unknown as TransactionHost<TransactionalAdapterTypeOrm>,
    );
  }, 30_000);

  beforeEach(async () => {
    await db.getRepository(NotificationRecord).clear();
  });

  afterAll(async () => {
    if (!db?.isInitialized) return;
    await db.query(`DROP SCHEMA "${schema}" CASCADE`);
    await db.destroy();
  }, 30_000);

  function stored(overrides: Parameters<typeof aNotification>[0] = {}) {
    return repository.create(
      aNotification({
        id: randomUUID(),
        userId: owner,
        orgId: org,
        ...overrides,
      }),
    );
  }

  describe('createWithinRoutineThreadLimit', () => {
    it('creates at most the limit of notifications for one thread, even when sent at once', async () => {
      const routineThreadId = randomUUID();

      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          repository.createWithinRoutineThreadLimit(
            aNotification({
              id: randomUUID(),
              userId: owner,
              orgId: org,
              routineThreadId,
            }) as ReturnType<typeof aNotification> & { routineThreadId: UUID },
            3,
          ),
        ),
      );

      expect(results.filter((result) => result !== null)).toHaveLength(3);
      expect(
        await db
          .getRepository(NotificationRecord)
          .count({ where: { routineThreadId } }),
      ).toBe(3);
    });

    it('counts each routine thread on its own', async () => {
      const first = randomUUID();
      const second = randomUUID();
      for (let i = 0; i < 3; i++) {
        await stored({ routineThreadId: first });
      }

      await expect(
        repository.createWithinRoutineThreadLimit(
          aNotification({
            id: randomUUID(),
            userId: owner,
            orgId: org,
            routineThreadId: second,
          }) as ReturnType<typeof aNotification> & { routineThreadId: UUID },
          3,
        ),
      ).resolves.not.toBeNull();
    });
  });

  describe('owner scope', () => {
    it("does not find another user's notification", async () => {
      const notification = await stored();

      await expect(
        repository.findById(otherUser, notification.id),
      ).resolves.toBeNull();
      await expect(
        repository.findById(owner, notification.id),
      ).resolves.toMatchObject({ id: notification.id });
    });

    it("does not mark another user's notification read", async () => {
      const notification = await stored();

      await expect(
        repository.markRead(otherUser, notification.id, new Date()),
      ).resolves.toBeNull();
      expect(
        (await repository.findById(owner, notification.id))?.readAt,
      ).toBeNull();
    });
  });

  describe('findPageByUserId', () => {
    it("lists only the user's notifications, newest first, with the total", async () => {
      const older = await stored({
        createdAt: new Date('2026-11-05T06:00:00.000Z'),
      });
      const newer = await stored({
        createdAt: new Date('2026-11-07T06:00:00.000Z'),
      });
      await stored({ userId: otherUser });

      const page = await repository.findPageByUserId(owner, {
        limit: 1,
        offset: 0,
      });

      expect(page.total).toBe(2);
      expect(page.data.map((n) => n.id)).toEqual([newer.id]);
      const next = await repository.findPageByUserId(owner, {
        limit: 1,
        offset: 1,
      });
      expect(next.data.map((n) => n.id)).toEqual([older.id]);
    });

    it("lists only the user's notifications of one routine when filtered by it", async () => {
      const routineId = randomUUID();
      const error = await stored({
        routineId,
        type: NotificationType.ROUTINE_ERROR,
        createdAt: new Date('2026-11-07T06:00:00.000Z'),
      });
      const finding = await stored({
        routineId,
        createdAt: new Date('2026-11-06T06:00:00.000Z'),
      });
      await stored({ routineId: randomUUID() });
      await stored({ routineId: null });
      await stored({ userId: otherUser, routineId });

      const page = await repository.findPageByUserId(
        owner,
        { limit: 20, offset: 0 },
        { routineId },
      );

      expect(page.total).toBe(2);
      expect(page.data.map((n) => n.id)).toEqual([error.id, finding.id]);
      const second = await repository.findPageByUserId(
        owner,
        { limit: 1, offset: 1 },
        { routineId },
      );
      expect(second).toMatchObject({ total: 2 });
      expect(second.data.map((n) => n.id)).toEqual([finding.id]);
    });

    it("lists only the user's notifications of one type when filtered by it", async () => {
      const error = await stored({
        type: NotificationType.ROUTINE_ERROR,
        createdAt: new Date('2026-11-07T06:00:00.000Z'),
      });
      const olderError = await stored({
        type: NotificationType.ROUTINE_ERROR,
        createdAt: new Date('2026-11-06T06:00:00.000Z'),
      });
      await stored({ type: NotificationType.ROUTINE });
      await stored({ userId: otherUser, type: NotificationType.ROUTINE_ERROR });

      const page = await repository.findPageByUserId(
        owner,
        { limit: 20, offset: 0 },
        { type: NotificationType.ROUTINE_ERROR },
      );

      expect(page.total).toBe(2);
      expect(page.data.map((n) => n.id)).toEqual([error.id, olderError.id]);
    });

    it("finds nothing for another user's routine", async () => {
      const routineId = randomUUID();
      await stored({ userId: otherUser, routineId });

      const page = await repository.findPageByUserId(
        owner,
        { limit: 20, offset: 0 },
        { routineId },
      );

      expect(page).toMatchObject({ total: 0, data: [] });
    });
  });

  describe('read state', () => {
    it('keeps the first read time when read again', async () => {
      const notification = await stored();
      const firstRead = new Date('2026-11-07T08:00:00.000Z');

      await repository.markRead(owner, notification.id, firstRead);
      const again = await repository.markRead(
        owner,
        notification.id,
        new Date('2026-11-07T09:00:00.000Z'),
      );

      expect(again?.readAt).toEqual(firstRead);
    });

    it("counts and marks all of only the user's unread notifications", async () => {
      await stored();
      await stored();
      await stored({ readAt: new Date('2026-11-06T08:00:00.000Z') });
      await stored({ userId: otherUser });

      await expect(repository.countUnreadByType(owner)).resolves.toEqual([
        { type: NotificationType.ROUTINE, count: 2 },
      ]);
      await expect(repository.markAllRead(owner, new Date())).resolves.toBe(2);
      await expect(repository.countUnreadByType(owner)).resolves.toEqual([]);
      await expect(repository.countUnreadByType(otherUser)).resolves.toEqual([
        { type: NotificationType.ROUTINE, count: 1 },
      ]);
    });

    it("counts only the user's unread notifications per type", async () => {
      await stored({ type: NotificationType.ROUTINE_ERROR });
      await stored();
      await stored({ type: NotificationType.ROUTINE_ERROR });
      await stored({
        type: NotificationType.ROUTINE_ERROR,
        readAt: new Date('2026-11-06T08:00:00.000Z'),
      });
      await stored({ userId: otherUser, type: NotificationType.ROUTINE_ERROR });

      await expect(repository.countUnreadByType(owner)).resolves.toEqual([
        { type: NotificationType.ROUTINE, count: 1 },
        { type: NotificationType.ROUTINE_ERROR, count: 2 },
      ]);
    });
  });

  describe('retention', () => {
    it("deletes only the org's notifications created before the cutoff", async () => {
      const cutoff = new Date('2026-08-09T04:00:00.000Z');
      const expired = await stored({
        createdAt: new Date('2026-08-01T06:00:00.000Z'),
      });
      const kept = await stored({
        createdAt: new Date('2026-08-10T06:00:00.000Z'),
      });
      const otherOrg = await stored({
        orgId: randomUUID(),
        createdAt: new Date('2026-08-01T06:00:00.000Z'),
      });

      await expect(
        repository.countByOrgCreatedBefore(org, cutoff),
      ).resolves.toBe(1);
      await expect(
        repository.deleteByOrgCreatedBefore(org, cutoff),
      ).resolves.toBe(1);

      const remaining = await db.getRepository(NotificationRecord).find();
      expect(remaining.map((n) => n.id)).toEqual(
        expect.arrayContaining([kept.id, otherOrg.id]),
      );
      expect(remaining).toHaveLength(2);
      expect(remaining.map((n) => n.id)).not.toContain(expired.id);
    });
  });
});
