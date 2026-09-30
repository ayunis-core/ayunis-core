import { randomUUID } from 'crypto';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { ArtifactVersion } from 'src/domain/artifacts/domain/artifact-version.entity';
import { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';
import { ArtifactVersionConflictError } from 'src/domain/artifacts/application/artifacts.errors';
import { LocalArtifactsRepository } from './local-artifacts.repository';
import { ArtifactRecord } from './schema/artifact.record';
import { DocumentArtifactRecord } from './schema/document-artifact.record';
import { ArtifactVersionRecord } from './schema/artifact-version.record';
import { ArtifactMapper } from './mappers/artifact.mapper';
import { ArtifactVersionMapper } from './mappers/artifact-version.mapper';

const artifactSchema = new EntitySchema<
  ArtifactRecord & Pick<DocumentArtifactRecord, 'letterheadId'>
>({
  name: 'ArtifactRecord',
  target: ArtifactRecord,
  tableName: 'artifacts',
  columns: {
    id: { type: 'uuid', primary: true },
    currentVersionNumber: { type: Number },
    letterheadId: { type: 'uuid', nullable: true },
    updatedAt: { type: 'timestamp', updateDate: true },
  },
});
const documentSchema = new EntitySchema<DocumentArtifactRecord>({
  name: 'DocumentArtifactRecord',
  target: DocumentArtifactRecord,
  tableName: 'artifacts',
  columns: artifactSchema.options.columns,
});
const versionSchema = new EntitySchema<ArtifactVersionRecord>({
  name: 'ArtifactVersionRecord',
  target: ArtifactVersionRecord,
  tableName: 'versions',
  columns: {
    id: { type: 'uuid', primary: true },
    artifactId: { type: 'uuid' },
    versionNumber: { type: Number },
    content: { type: String },
    authorType: { type: String },
    authorId: { type: 'uuid', nullable: true },
    createdAt: { type: 'timestamp', createDate: true },
  },
});

describe('Artifact version transaction', () => {
  let db: DataSource;
  let schema: string;
  let repository: LocalArtifactsRepository;
  let artifactId: ReturnType<typeof randomUUID>;
  let letterheadId: ReturnType<typeof randomUUID>;

  beforeAll(async () => {
    schema = `ayc496_artifacts_${randomUUID().replaceAll('-', '')}`;
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [artifactSchema, documentSchema, versionSchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    await db.initialize();
    const runner = db.createQueryRunner();
    await runner.createSchema(schema, true);
    await runner.release();
    await db.synchronize();
    await configureRepository();
  });

  async function configureRepository(): Promise<void> {
    const adapter = new TransactionalAdapterTypeOrm({
      dataSourceToken: DataSource,
    });
    const txHost = new TransactionHost<TransactionalAdapterTypeOrm>({
      ...adapter.optionsFactory(db),
      connectionName: undefined,
      enableTransactionProxy: false,
      defaultTxOptions: {},
      extraProviderTokens: [],
    });
    const module = await Test.createTestingModule({
      providers: [
        LocalArtifactsRepository,
        ArtifactVersionMapper,
        { provide: ArtifactMapper, useValue: {} },
        {
          provide: getRepositoryToken(ArtifactRecord),
          useValue: db.getRepository(ArtifactRecord),
        },
        {
          provide: getRepositoryToken(DocumentArtifactRecord),
          useValue: db.getRepository(DocumentArtifactRecord),
        },
        {
          provide: getRepositoryToken(ArtifactVersionRecord),
          useValue: db.getRepository(ArtifactVersionRecord),
        },
        { provide: TransactionHost, useValue: txHost },
      ],
    }).compile();
    repository = module.get(LocalArtifactsRepository);
  }

  beforeEach(async () => {
    artifactId = randomUUID();
    letterheadId = randomUUID();
    await db
      .getRepository(artifactSchema)
      .insert({ id: artifactId, currentVersionNumber: 1, letterheadId });
  });

  afterAll(async () => {
    if (!db?.isInitialized) return;
    const runner = db.createQueryRunner();
    await runner.dropSchema(schema, true, true);
    await runner.release();
    await db.destroy();
  });

  function version(): ArtifactVersion {
    return new ArtifactVersion({
      artifactId,
      versionNumber: 2,
      content: '<p>Municipal report</p>',
      authorType: AuthorType.USER,
    });
  }

  it('rolls back the inserted version when the expected artifact version is stale', async () => {
    await expect(
      repository.addVersionAndUpdateArtifact({
        version: version(),
        expectedCurrentVersionNumber: 0,
      }),
    ).rejects.toBeInstanceOf(ArtifactVersionConflictError);
    expect(
      await db.getRepository(ArtifactVersionRecord).countBy({ artifactId }),
    ).toBe(0);
    expect(
      await db.getRepository(ArtifactRecord).findOneBy({ id: artifactId }),
    ).toMatchObject({ currentVersionNumber: 1 });
  });

  it('commits the version and artifact pointer together', async () => {
    await repository.addVersionAndUpdateArtifact({
      version: version(),
      expectedCurrentVersionNumber: 1,
    });
    expect(
      await db.getRepository(ArtifactVersionRecord).countBy({ artifactId }),
    ).toBe(1);
    expect(
      await db.getRepository(ArtifactRecord).findOneBy({ id: artifactId }),
    ).toMatchObject({ currentVersionNumber: 2 });
  });
  it('preserves an omitted letterhead and clears an explicitly null letterhead', async () => {
    await repository.addVersionAndUpdateArtifact({
      version: version(),
      expectedCurrentVersionNumber: 1,
    });
    expect(
      await db.getRepository(artifactSchema).findOneBy({ id: artifactId }),
    ).toMatchObject({ letterheadId });
    await repository.addVersionAndUpdateArtifact({
      version: new ArtifactVersion({
        artifactId,
        versionNumber: 3,
        content: '<p>Updated report</p>',
        authorType: AuthorType.USER,
      }),
      expectedCurrentVersionNumber: 2,
      letterheadId: null,
    });
    expect(
      await db.getRepository(artifactSchema).findOneBy({ id: artifactId }),
    ).toMatchObject({ letterheadId: null, currentVersionNumber: 3 });
  });

  it('preserves the letterhead and rolls back the version on a stale document update', async () => {
    await expect(
      repository.addVersionAndUpdateArtifact({
        version: version(),
        expectedCurrentVersionNumber: 0,
        letterheadId: null,
      }),
    ).rejects.toBeInstanceOf(ArtifactVersionConflictError);
    expect(
      await db.getRepository(artifactSchema).findOneBy({ id: artifactId }),
    ).toMatchObject({ letterheadId, currentVersionNumber: 1 });
    expect(
      await db.getRepository(ArtifactVersionRecord).countBy({ artifactId }),
    ).toBe(0);
  });
});
