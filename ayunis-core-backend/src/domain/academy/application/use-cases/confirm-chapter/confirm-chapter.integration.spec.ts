import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { randomUUID } from 'crypto';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { AcademyChapter } from 'src/domain/academy/domain/academy-chapter.entity';
import { AcademyCourseModule } from 'src/domain/academy/domain/academy-course-module.entity';
import type { AcademyChapterRepository } from 'src/domain/academy/application/ports/academy-chapter.repository';
import { UnexpectedAcademyError } from 'src/domain/academy/application/academy.errors';
import type { GetAcademyMinimumModuleSecondsUseCase } from 'src/iam/platform-config/application/use-cases/get-academy-minimum-module-seconds/get-academy-minimum-module-seconds.use-case';
import { AcademyMapper } from 'src/domain/academy/infrastructure/persistence/local/mappers/academy.mapper';
import { LocalAcademyChapterConfirmationRepository } from 'src/domain/academy/infrastructure/persistence/local/local-academy-chapter-confirmation.repository';
import { LocalAcademyCompletionRepository } from 'src/domain/academy/infrastructure/persistence/local/local-academy-completion.repository';
import { LocalAcademyModuleViewTimeRepository } from 'src/domain/academy/infrastructure/persistence/local/local-academy-module-view-time.repository';
import { AcademyChapterConfirmationRecord } from 'src/domain/academy/infrastructure/persistence/local/schema/academy-chapter-confirmation.record';
import { AcademyCompletionRecord } from 'src/domain/academy/infrastructure/persistence/local/schema/academy-completion.record';
import { AcademyModuleViewTimeRecord } from 'src/domain/academy/infrastructure/persistence/local/schema/academy-module-view-time.record';
import { ConfirmChapterCommand } from './confirm-chapter.command';
import { ConfirmChapterUseCase } from './confirm-chapter.use-case';

const baseColumns = {
  id: { type: 'uuid', primary: true },
  createdAt: { type: 'timestamp', createDate: true },
  updatedAt: { type: 'timestamp', updateDate: true },
  userId: { type: 'uuid' },
} as const;

const confirmationSchema = new EntitySchema<AcademyChapterConfirmationRecord>({
  name: 'AcademyChapterConfirmationRecord',
  target: AcademyChapterConfirmationRecord,
  tableName: 'academy_chapter_confirmations',
  columns: {
    ...baseColumns,
    chapterId: { type: 'uuid' },
    confirmedAt: { type: 'timestamp' },
  },
  uniques: [{ columns: ['userId', 'chapterId'] }],
});

const completionSchema = new EntitySchema<AcademyCompletionRecord>({
  name: 'AcademyCompletionRecord',
  target: AcademyCompletionRecord,
  tableName: 'academy_completion',
  columns: { ...baseColumns, completedAt: { type: 'timestamp' } },
  uniques: [{ columns: ['userId'] }],
});

const viewTimeSchema = new EntitySchema<AcademyModuleViewTimeRecord>({
  name: 'AcademyModuleViewTimeRecord',
  target: AcademyModuleViewTimeRecord,
  tableName: 'academy_module_view_times',
  columns: {
    ...baseColumns,
    courseModuleId: { type: 'uuid' },
    visibleSeconds: { type: 'double precision', default: 0 },
    lastHeartbeatAt: { type: 'timestamptz' },
  },
  uniques: [{ columns: ['userId', 'courseModuleId'] }],
});

describe('ConfirmChapterUseCase transaction', () => {
  let dataSource: DataSource;
  let schemaName: string;
  let useCase: ConfirmChapterUseCase;
  let viewTimeRepository: LocalAcademyModuleViewTimeRepository;
  let txHost: TransactionHost<TransactionalAdapterTypeOrm>;
  const courseModule = new AcademyCourseModule({
    chapterId: randomUUID(),
    title: 'Was ein Sprachmodell tut',
    loomUrl: 'https://www.loom.com/share/abc123',
    position: 0,
  });
  const chapter = new AcademyChapter({
    id: courseModule.chapterId,
    title: 'KI-Grundlagen',
    description: 'Basics',
    position: 0,
    courseModules: [courseModule],
  });

  beforeAll(async () => {
    schemaName = `ayc_913_${randomUUID().replaceAll('-', '')}`;
    dataSource = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema: schemaName,
      entities: [confirmationSchema, completionSchema, viewTimeSchema],
      migrations: [],
      migrationsRun: false,
    });
    await dataSource.initialize();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.createSchema(schemaName, true);
    await queryRunner.release();
    await dataSource.synchronize();

    const adapter = new TransactionalAdapterTypeOrm({
      dataSourceToken: DataSource,
    });
    txHost = new TransactionHost<TransactionalAdapterTypeOrm>({
      ...adapter.optionsFactory(dataSource),
      connectionName: undefined,
      enableTransactionProxy: false,
      defaultTxOptions: {},
      extraProviderTokens: [],
    });
    const mapper = new AcademyMapper();
    viewTimeRepository = new LocalAcademyModuleViewTimeRepository(
      txHost,
      mapper,
    );
    useCase = new ConfirmChapterUseCase(
      {
        findOne: jest.fn().mockResolvedValue(chapter),
        findAllIds: jest.fn().mockResolvedValue([chapter.id]),
      } as unknown as AcademyChapterRepository,
      new LocalAcademyChapterConfirmationRepository(txHost, mapper),
      new LocalAcademyCompletionRepository(txHost, mapper),
      viewTimeRepository,
      {
        execute: jest.fn().mockResolvedValue(60),
      } as unknown as GetAcademyMinimumModuleSecondsUseCase,
    );
  });

  afterAll(async () => {
    if (!dataSource.isInitialized) return;
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.dropSchema(schemaName, true, true);
    await queryRunner.release();
    await dataSource.destroy();
  });

  it('keeps completion and the page-time reset together when the reset fails', async () => {
    const userId = randomUUID();
    await dataSource.getRepository(AcademyModuleViewTimeRecord).insert({
      id: randomUUID(),
      userId,
      courseModuleId: courseModule.id,
      visibleSeconds: 120,
      lastHeartbeatAt: new Date(),
    });
    jest
      .spyOn(viewTimeRepository, 'deleteAllByUser')
      .mockRejectedValueOnce(new Error('delete failed'));
    const confirm = () =>
      useCase.execute(
        new ConfirmChapterCommand({ userId, chapterId: chapter.id }),
      );

    await expect(confirm()).rejects.toBeInstanceOf(UnexpectedAcademyError);
    await expect(
      dataSource.getRepository(AcademyCompletionRecord).countBy({ userId }),
    ).resolves.toBe(0);
    await expect(
      dataSource
        .getRepository(AcademyChapterConfirmationRecord)
        .countBy({ userId }),
    ).resolves.toBe(0);

    await expect(confirm()).resolves.toMatchObject({ academyCompleted: true });
    await expect(
      dataSource.getRepository(AcademyCompletionRecord).countBy({ userId }),
    ).resolves.toBe(1);
    await expect(
      dataSource.getRepository(AcademyModuleViewTimeRecord).countBy({ userId }),
    ).resolves.toBe(0);
  });

  it('credits heartbeats in the configured schema', async () => {
    const userId = randomUUID();
    const heartbeat = (sessionStart: boolean) =>
      viewTimeRepository.recordHeartbeat({
        userId,
        courseModuleId: courseModule.id,
        sessionStart,
        maxIncrementSeconds: 15,
      });

    await heartbeat(true);
    await heartbeat(false);

    const [viewTime] = await viewTimeRepository.findAllByUser(userId);
    expect(viewTime.visibleSeconds).toBeGreaterThan(0);
    expect(viewTime.visibleSeconds).toBeLessThan(15);
  });

  describe('one clock per learner', () => {
    const otherModuleId = randomUUID();
    const wait = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    async function totalSeconds(userId: string): Promise<number> {
      const viewTimes = await viewTimeRepository.findAllByUser(
        userId as `${string}-${string}-${string}-${string}-${string}`,
      );
      return viewTimes.reduce(
        (sum, { visibleSeconds }) => sum + visibleSeconds,
        0,
      );
    }

    function heartbeat(
      userId: string,
      courseModuleId: string,
      sessionStart: boolean,
    ) {
      return viewTimeRepository.recordHeartbeat({
        userId: userId as `${string}-${string}-${string}-${string}-${string}`,
        courseModuleId:
          courseModuleId as `${string}-${string}-${string}-${string}-${string}`,
        sessionStart,
        maxIncrementSeconds: 15,
      });
    }

    it('splits time between videos open at once instead of crediting each', async () => {
      const userId = randomUUID();
      const startedAt = Date.now();
      await heartbeat(userId, courseModule.id, true);
      await heartbeat(userId, otherModuleId, true);
      await wait(1_000);
      await heartbeat(userId, courseModule.id, false);
      await heartbeat(userId, otherModuleId, false);

      const elapsedSeconds = (Date.now() - startedAt) / 1000;
      expect(await totalSeconds(userId)).toBeLessThanOrEqual(elapsedSeconds);
    });

    it('does not double-credit simultaneous heartbeats for different videos', async () => {
      const userId = randomUUID();
      const startedAt = Date.now();
      await heartbeat(userId, courseModule.id, true);
      await heartbeat(userId, otherModuleId, true);
      await wait(1_000);
      await Promise.all([
        heartbeat(userId, courseModule.id, false),
        heartbeat(userId, otherModuleId, false),
      ]);

      const elapsedSeconds = (Date.now() - startedAt) / 1000;
      expect(await totalSeconds(userId)).toBeLessThanOrEqual(elapsedSeconds);
    });
  });

  it('records the certificate when the last two chapters are confirmed at once', async () => {
    const userId = randomUUID();
    const chapters = [0, 1].map((position) => {
      const courseModuleId = randomUUID();
      const chapterId = randomUUID();
      return new AcademyChapter({
        id: chapterId,
        title: `Kapitel ${position + 1}`,
        description: 'Basics',
        position,
        courseModules: [
          new AcademyCourseModule({
            id: courseModuleId,
            chapterId,
            title: `Video ${position + 1}`,
            loomUrl: 'https://www.loom.com/share/abc123',
            position: 0,
          }),
        ],
      });
    });
    await dataSource.getRepository(AcademyModuleViewTimeRecord).insert(
      chapters.map((chapterWithModule) => ({
        id: randomUUID(),
        userId,
        courseModuleId: chapterWithModule.courseModules[0].id,
        visibleSeconds: 120,
        lastHeartbeatAt: new Date(),
      })),
    );
    // Holds each request after its confirmation is written and before it
    // checks completion, until both arrive or the other cannot (it waits on
    // the learner lock), so the race is deterministic rather than timing-based.
    let arrived = 0;
    let releaseBarrier: () => void = () => undefined;
    const barrier = new Promise<void>((resolve) => (releaseBarrier = resolve));
    const findAllIds = jest.fn(async () => {
      arrived += 1;
      if (arrived === 2) releaseBarrier();
      await Promise.race([
        barrier,
        new Promise((resolve) => setTimeout(resolve, 500)),
      ]);
      return chapters.map(({ id }) => id);
    });
    const mapper = new AcademyMapper();
    const racingUseCase = new ConfirmChapterUseCase(
      {
        findOne: jest.fn(async (id: string) =>
          chapters.find((candidate) => candidate.id === id),
        ),
        findAllIds,
      } as unknown as AcademyChapterRepository,
      new LocalAcademyChapterConfirmationRepository(txHost, mapper),
      new LocalAcademyCompletionRepository(txHost, mapper),
      viewTimeRepository,
      {
        execute: jest.fn().mockResolvedValue(60),
      } as unknown as GetAcademyMinimumModuleSecondsUseCase,
    );

    await Promise.all(
      chapters.map(({ id }) =>
        racingUseCase.execute(
          new ConfirmChapterCommand({ userId, chapterId: id }),
        ),
      ),
    );

    await expect(
      dataSource
        .getRepository(AcademyChapterConfirmationRecord)
        .countBy({ userId }),
    ).resolves.toBe(2);
    await expect(
      dataSource.getRepository(AcademyCompletionRecord).countBy({ userId }),
    ).resolves.toBe(1);
  });
});
