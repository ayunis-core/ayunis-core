import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import type { TranscriptSegment } from 'src/domain/transcriptions/domain/recording-transcript';
import { LocalSourceTranscriptRepository } from './local-source-transcript.repository';
import { SourceTranscriptSegmentRecord } from './schema/source-transcript-segment.record';

const sourceSchema = new EntitySchema<{ id: string }>({
  name: 'SourceRecord',
  tableName: 'sources',
  columns: { id: { type: String, primary: true } },
});

const segmentSchema = new EntitySchema<SourceTranscriptSegmentRecord>({
  name: 'SourceTranscriptSegmentRecord',
  target: SourceTranscriptSegmentRecord,
  tableName: 'source_transcript_segments',
  columns: {
    id: { type: String, primary: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
    sourceId: { type: String },
    position: { type: Number },
    startSeconds: { type: 'double precision' },
    endSeconds: { type: 'double precision' },
    speaker: { type: String, nullable: true },
    text: { type: 'text' },
  },
  indices: [{ columns: ['sourceId', 'position'], unique: true }],
  relations: {
    source: {
      type: 'many-to-one',
      target: 'SourceRecord',
      joinColumn: { name: 'sourceId' },
      onDelete: 'CASCADE',
    },
  },
});

describe('Recording transcript segments', () => {
  let dataSource: DataSource;
  let schemaName: string;
  let repository: LocalSourceTranscriptRepository;

  beforeAll(async () => {
    schemaName = `transcript_${randomUUID().replaceAll('-', '')}`;
    dataSource = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema: schemaName,
      entities: [sourceSchema, segmentSchema],
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
    repository = new LocalSourceTranscriptRepository(
      dataSource.getRepository(SourceTranscriptSegmentRecord),
      new TransactionHost<TransactionalAdapterTypeOrm>({
        ...adapter.optionsFactory(dataSource),
        connectionName: undefined,
        enableTransactionProxy: false,
        defaultTxOptions: {},
        extraProviderTokens: [],
      }),
    );
  }, 30_000);

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.dropSchema(schemaName, true, true);
    await queryRunner.release();
    await dataSource.destroy();
  }, 30_000);

  it('replaces the transcript of a re-processed recording, in order, with the speaker labels apart from the text', async () => {
    const sourceId = randomUUID();
    await dataSource.getRepository('SourceRecord').insert({ id: sourceId });
    const earlier: TranscriptSegment[] = Array.from(
      { length: 1001 },
      (_, index) => ({ text: `Teil ${index}`, start: index, end: index + 1 }),
    );
    const transcript: TranscriptSegment[] = [
      { text: 'Wir beginnen.', start: 0.5, end: 2, speakerId: 'speaker_0' },
      { text: 'Einverstanden.', start: 2.5, end: 3 },
    ];

    await repository.replace(sourceId, earlier);
    await expect(repository.findBySourceId(sourceId)).resolves.toHaveLength(
      1001,
    );
    await repository.replace(sourceId, transcript);

    await expect(repository.findBySourceId(sourceId)).resolves.toEqual(
      transcript,
    );
  });
});
