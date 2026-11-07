import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { DataSource, EntitySchema, type EntityManager } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { NotificationMediaType } from 'src/domain/notifications/domain/notification-media';
import { NotificationType } from 'src/domain/notifications/domain/notification-type.enum';
import { ReleaseNoteRecord } from 'src/domain/release-notes/infrastructure/persistence/local/schema/release-note.record';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { LocalNotificationsRepository } from './local-notifications.repository';
import { NotificationMapper } from './mappers/notification.mapper';
import { NotificationRecord } from './schema/notification.record';

// Only the columns the release-note fan-out reads, so the test needs no
// complete users, orgs or release notes. The release-note foreign key is the
// one of the migration: deleting the note deletes its notifications.
const orgSchema = new EntitySchema<OrgRecord>({
  name: 'OrgRecord',
  target: OrgRecord,
  tableName: 'orgs',
  columns: {
    id: { type: 'uuid', primary: true },
    archived: { type: Boolean, default: false },
  },
});
const userSchema = new EntitySchema<UserRecord>({
  name: 'UserRecord',
  target: UserRecord,
  tableName: 'users',
  columns: { id: { type: 'uuid', primary: true }, orgId: { type: 'uuid' } },
});
const releaseNoteSchema = new EntitySchema<ReleaseNoteRecord>({
  name: 'ReleaseNoteRecord',
  target: ReleaseNoteRecord,
  tableName: 'release_notes',
  columns: { id: { type: 'uuid', primary: true } },
});
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
    subheadline: { type: String, nullable: true },
    body: { type: 'text' },
    mediaType: { type: String, nullable: true },
    mediaUrl: { type: String, nullable: true },
    mediaStorageKey: { type: String, nullable: true },
    mediaContentType: { type: String, nullable: true },
    routineId: { type: 'uuid', nullable: true },
    routineThreadId: { type: 'uuid', nullable: true },
    releaseNoteId: { type: 'uuid', nullable: true },
    readAt: { type: 'timestamptz', nullable: true },
  },
  relations: {
    releaseNote: {
      type: 'many-to-one',
      target: 'ReleaseNoteRecord',
      joinColumn: { name: 'releaseNoteId' },
      onDelete: 'CASCADE',
    },
  },
});

const sentAt = new Date('2026-11-07T18:00:00.000Z');
const image = {
  type: NotificationMediaType.IMAGE as const,
  storageKey:
    'release-notes/c76cd1b4-3b80-4666-bc4f-913161122056/0123456789abcdef.webp',
  contentType: 'image/webp',
};

describe('LocalNotificationsRepository release-note notifications (PostgreSQL)', () => {
  let db: DataSource;
  let repository: LocalNotificationsRepository;
  let schema: string;
  const txHost = { tx: undefined as EntityManager | undefined };
  const activeOrg = randomUUID();
  const archivedOrg = randomUUID();
  const activeUsers = [randomUUID(), randomUUID()];
  const archivedUser = randomUUID();

  beforeAll(async () => {
    schema = `release_note_notifications_${randomUUID().replaceAll('-', '')}`;
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [orgSchema, userSchema, releaseNoteSchema, notificationSchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${schema}"`);
    await db.synchronize();
    await db.getRepository(OrgRecord).insert([
      { id: activeOrg, archived: false },
      { id: archivedOrg, archived: true },
    ]);
    await db
      .getRepository(UserRecord)
      .insert([
        ...activeUsers.map((id) => ({ id, orgId: activeOrg })),
        { id: archivedUser, orgId: archivedOrg },
      ]);
    repository = new LocalNotificationsRepository(
      db.getRepository(NotificationRecord),
      new NotificationMapper(),
      txHost as unknown as TransactionHost<TransactionalAdapterTypeOrm>,
    );
  }, 30_000);

  beforeEach(async () => {
    txHost.tx = undefined;
    await db.getRepository(NotificationRecord).clear();
    await db.query(`DELETE FROM "${schema}"."release_notes"`);
  });

  afterAll(async () => {
    if (!db?.isInitialized) return;
    await db.query(`DROP SCHEMA "${schema}" CASCADE`);
    await db.destroy();
  }, 30_000);

  async function aStoredReleaseNote(): Promise<UUID> {
    const id = randomUUID();
    await db.getRepository(ReleaseNoteRecord).insert({ id });
    return id;
  }

  function notificationsOf(releaseNoteId: UUID) {
    return db
      .getRepository(NotificationRecord)
      .find({ where: { releaseNoteId }, order: { userId: 'ASC' } });
  }

  it('sends the release note to every user of a non-archived org', async () => {
    const releaseNoteId = await aStoredReleaseNote();

    const created = await repository.createReleaseNoteNotifications(
      {
        releaseNoteId,
        headline: 'Routinen sind da',
        body: 'Ayunis erledigt wiederkehrende Recherchen jetzt automatisch.',
        media: image,
      },
      sentAt,
    );

    expect(created).toBe(2);
    const notifications = await notificationsOf(releaseNoteId);
    expect(notifications.map((n) => n.userId)).toEqual(
      [...activeUsers].sort((a, b) => a.localeCompare(b)),
    );
    expect(new Set(notifications.map((n) => n.id)).size).toBe(2);
    for (const notification of notifications) {
      expect(notification).toMatchObject({
        orgId: activeOrg,
        type: NotificationType.RELEASE_NOTE,
        headline: 'Routinen sind da',
        subheadline: null,
        body: 'Ayunis erledigt wiederkehrende Recherchen jetzt automatisch.',
        mediaType: NotificationMediaType.IMAGE,
        mediaUrl: null,
        mediaStorageKey: image.storageKey,
        mediaContentType: image.contentType,
        routineId: null,
        routineThreadId: null,
        readAt: null,
        createdAt: sentAt,
      });
    }
  });

  it('updates every notification of the edited note in place and keeps its read state', async () => {
    const releaseNoteId = await aStoredReleaseNote();
    const otherNoteId = await aStoredReleaseNote();
    const original = {
      headline: 'Routinen sind da',
      body: 'Ayunis erledigt wiederkehrende Recherchen jetzt automatisch.',
      media: image,
    };
    await repository.createReleaseNoteNotifications(
      { releaseNoteId, ...original },
      sentAt,
    );
    await repository.createReleaseNoteNotifications(
      { releaseNoteId: otherNoteId, ...original },
      sentAt,
    );
    const readAt = new Date('2026-11-07T09:00:00.000Z');
    await db
      .getRepository(NotificationRecord)
      .update({ releaseNoteId, userId: activeUsers[0] }, { readAt });
    const before = await notificationsOf(releaseNoteId);

    const updated = await repository.updateReleaseNoteNotifications({
      releaseNoteId,
      headline: 'Routinen im Video',
      body: 'Jetzt mit Video.',
      media: {
        type: NotificationMediaType.LOOM,
        url: 'https://www.loom.com/embed/198aa66c0e684eb891a4a6d4ee74512d',
      },
    });

    expect(updated).toBe(2);
    const after = await notificationsOf(releaseNoteId);
    expect(after.map((n) => [n.id, n.readAt])).toEqual(
      before.map((n) => [n.id, n.readAt]),
    );
    expect(after.find((n) => n.userId === activeUsers[0])?.readAt).toEqual(
      readAt,
    );
    for (const notification of after) {
      expect(notification).toMatchObject({
        headline: 'Routinen im Video',
        body: 'Jetzt mit Video.',
        mediaType: NotificationMediaType.LOOM,
        mediaUrl: 'https://www.loom.com/embed/198aa66c0e684eb891a4a6d4ee74512d',
        mediaStorageKey: null,
        mediaContentType: null,
      });
    }
    const other = await notificationsOf(otherNoteId);
    expect(other.map((n) => n.headline)).toEqual([
      'Routinen sind da',
      'Routinen sind da',
    ]);
  });

  it('deletes the notifications of a deleted release note', async () => {
    const releaseNoteId = await aStoredReleaseNote();
    await repository.createReleaseNoteNotifications(
      {
        releaseNoteId,
        headline: 'Routinen sind da',
        body: 'Ayunis erledigt wiederkehrende Recherchen jetzt automatisch.',
        media: null,
      },
      sentAt,
    );

    await db.getRepository(ReleaseNoteRecord).delete({ id: releaseNoteId });

    await expect(notificationsOf(releaseNoteId)).resolves.toEqual([]);
  });

  it('writes through the ambient transaction, so a failed sync sends nothing', async () => {
    const releaseNoteId = await aStoredReleaseNote();

    await expect(
      db.transaction(async (manager) => {
        txHost.tx = manager;
        await repository.createReleaseNoteNotifications(
          {
            releaseNoteId,
            headline: 'Routinen sind da',
            body: 'Ayunis erledigt wiederkehrende Recherchen jetzt automatisch.',
            media: null,
          },
          sentAt,
        );
        throw new Error('the sync failed before it committed');
      }),
    ).rejects.toThrow('the sync failed before it committed');

    txHost.tx = undefined;
    await expect(notificationsOf(releaseNoteId)).resolves.toEqual([]);
  });
});
