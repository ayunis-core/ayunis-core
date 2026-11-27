import { randomUUID } from 'crypto';
import { DataSource, type EntityManager } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import {
  aDoor,
  A_QUIZ,
  A_VIDEO,
  anImage,
} from 'src/domain/advent-calendar/application/testing/advent-calendar.fixtures';
import { AdventCalendarButtonKind } from 'src/domain/advent-calendar/domain/advent-calendar-button';
import { LocalAdventCalendarDoorsRepository } from './local-advent-calendar-doors.repository';
import { AdventCalendarDoorRecord } from './schema/advent-calendar-door.record';

describe('LocalAdventCalendarDoorsRepository (PostgreSQL)', () => {
  let db: DataSource;
  let repository: LocalAdventCalendarDoorsRepository;
  let schema: string;
  const txHost = { tx: undefined as EntityManager | undefined };

  beforeAll(async () => {
    schema = `advent_calendar_${randomUUID().replaceAll('-', '')}`;
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [AdventCalendarDoorRecord],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${schema}"`);
    await db.synchronize();
    repository = new LocalAdventCalendarDoorsRepository(
      txHost as unknown as TransactionHost<TransactionalAdapterTypeOrm>,
    );
  }, 30_000);

  beforeEach(async () => {
    txHost.tx = db.manager;
    await db.getRepository(AdventCalendarDoorRecord).clear();
  });

  afterAll(async () => {
    if (!db?.isInitialized) return;
    await db.query(`DROP SCHEMA "${schema}" CASCADE`);
    await db.destroy();
  }, 30_000);

  it('replaces the door of a day instead of adding a second one', async () => {
    const first = await repository.save(aDoor({ media: anImage() }));
    const second = await repository.save(
      aDoor({ title: 'Prompts', media: A_VIDEO, buttons: [] }),
    );

    expect(await repository.findAll()).toEqual([second]);
    expect(second).toMatchObject({
      day: 5,
      title: 'Prompts',
      media: A_VIDEO,
      buttons: [],
    });
    expect(second.updatedAt.getTime()).toBeGreaterThanOrEqual(
      first.updatedAt.getTime(),
    );
  });

  it('reads back media and buttons as written, by day', async () => {
    const link = {
      kind: AdventCalendarButtonKind.LINK as const,
      label: 'Marketplace',
      url: '/marketplace',
    };
    await repository.save(aDoor({ day: 9, media: A_VIDEO, buttons: [link] }));
    await repository.save(
      aDoor({ day: 2, media: anImage(), buttons: [A_QUIZ] }),
    );

    const doors = await repository.findAll();

    expect(doors.map(({ day }) => day)).toEqual([2, 9]);
    expect(doors[0]).toMatchObject({ media: anImage(), buttons: [A_QUIZ] });
    expect(await repository.findByDay(9)).toMatchObject({
      media: A_VIDEO,
      buttons: [link],
    });
  });

  it('returns the deleted door, so its image can be deleted too', async () => {
    await repository.save(aDoor({ media: anImage() }));

    expect((await repository.delete(5))?.image).toEqual(anImage());
    expect(await repository.delete(5)).toBeNull();
    expect(await repository.findByDay(5)).toBeNull();
  });

  it('reads a door under a row lock inside a transaction', async () => {
    await repository.save(aDoor());

    const locked = await db.transaction(async (manager) => {
      txHost.tx = manager;
      return repository.findByDayForUpdate(5);
    });

    expect(locked?.title).toBe('Skills');
  });

  it.each([
    ['a day outside 1 to 24', `25, 'x', '', NULL, NULL, NULL, NULL, NULL`],
    [
      'an image without a storage key',
      `3, 'x', '', 'image', NULL, 'image/png', NULL, NULL`,
    ],
    [
      'an image and a video at once',
      `3, 'x', '', 'vimeo', 'advent-calendar/3/a.png', 'image/png', '1', NULL`,
    ],
  ])('refuses %s', async (_case, values) => {
    await expect(
      db.query(
        `INSERT INTO "${schema}"."advent_calendar_doors" ("day", "title", "body", "mediaType", "mediaStorageKey", "mediaContentType", "vimeoVideoId", "vimeoHash", "buttons") VALUES (${values}, '[]')`,
      ),
    ).rejects.toThrow(/check constraint/);
  });
});
