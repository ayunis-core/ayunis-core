import { randomUUID, type UUID } from 'crypto';
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
import { ArtifactPiiMask } from 'src/domain/artifacts/domain/artifact-pii-mask.entity';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import { LocalArtifactsRepository } from './local-artifacts.repository';
import { ArtifactRecord } from './schema/artifact.record';
import { DocumentArtifactRecord } from './schema/document-artifact.record';
import { ArtifactVersionRecord } from './schema/artifact-version.record';
import { ThreadArtifactRecord } from './schema/thread-artifact.record';
import { ArtifactPiiMaskRecord } from './schema/artifact-pii-mask.record';
import { ArtifactMapper } from './mappers/artifact.mapper';
import { ArtifactVersionMapper } from './mappers/artifact-version.mapper';

// Ids are varchar, as in the real schema.
const artifactSchema = new EntitySchema<
  ArtifactRecord & Pick<DocumentArtifactRecord, 'letterheadId'>
>({
  name: 'ArtifactRecord',
  target: ArtifactRecord,
  tableName: 'artifacts',
  columns: {
    id: { type: 'varchar', primary: true },
    title: { type: String, default: 'Bescheid' },
    isAnonymous: { type: Boolean, default: false },
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
  tableName: 'artifact_versions',
  columns: {
    id: { type: 'varchar', primary: true },
    artifactId: { type: 'varchar' },
    versionNumber: { type: Number },
    content: { type: String },
    authorType: { type: String },
    authorId: { type: 'uuid', nullable: true },
    createdAt: { type: 'timestamp', createDate: true },
  },
});

const piiMaskSchema = new EntitySchema<ArtifactPiiMaskRecord>({
  name: 'ArtifactPiiMaskRecord',
  target: ArtifactPiiMaskRecord,
  tableName: 'artifact_pii_masks',
  columns: {
    id: { type: 'varchar', primary: true },
    artifactId: { type: 'varchar' },
    category: { type: String },
    maskIndex: { type: Number },
    value: { type: String },
    createdAt: { type: 'timestamp', createDate: true },
  },
});
const threadSchema = new EntitySchema<{ id: string; isAnonymous: boolean }>({
  name: 'threads',
  columns: {
    id: { type: 'varchar', primary: true },
    isAnonymous: { type: Boolean },
  },
});
const threadLinkSchema = new EntitySchema<ThreadArtifactRecord>({
  name: 'ThreadArtifactRecord',
  target: ThreadArtifactRecord,
  tableName: 'thread_artifacts',
  columns: {
    threadId: { type: 'varchar', primary: true },
    artifactId: { type: 'varchar', primary: true },
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
      entities: [
        artifactSchema,
        documentSchema,
        versionSchema,
        piiMaskSchema,
        threadSchema,
        threadLinkSchema,
      ],
      migrations: [],
      migrationsRun: false,
      logging: false,
      // Raw queries name their tables unqualified.
      extra: { options: `-c search_path=${schema}` },
    });
    await db.initialize();
    const runner = db.createQueryRunner();
    await runner.createSchema(schema, true);
    await runner.release();
    await db.synchronize();
    await configureRepository();
  }, 30_000);

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
        {
          provide: getRepositoryToken(ThreadArtifactRecord),
          useValue: db.getRepository(ThreadArtifactRecord),
        },
        {
          provide: getRepositoryToken(ArtifactPiiMaskRecord),
          useValue: db.getRepository(ArtifactPiiMaskRecord),
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
  }, 30_000);

  afterAll(async () => {
    if (!db?.isInitialized) return;
    const runner = db.createQueryRunner();
    await runner.dropSchema(schema, true, true);
    await runner.release();
    await db.destroy();
  }, 30_000);

  function version(): ArtifactVersion {
    return new ArtifactVersion({
      artifactId,
      versionNumber: 2,
      content: '<p>Municipal report</p>',
      authorType: AuthorType.USER,
    });
  }

  function piiMask(): ArtifactPiiMask {
    return new ArtifactPiiMask({
      artifactId,
      category: PiiCategory.PERSON_NAME,
      maskIndex: 1,
      value: 'Anna Schmidt',
    });
  }

  it('rolls back the inserted version and dictionary entries when the expected artifact version is stale', async () => {
    await expect(
      repository.addVersionAndUpdateArtifact({
        version: version(),
        expectedCurrentVersionNumber: 0,
        isAnonymous: false,
        piiMasks: [piiMask()],
      }),
    ).rejects.toBeInstanceOf(ArtifactVersionConflictError);
    expect(
      await db.getRepository(ArtifactVersionRecord).countBy({ artifactId }),
    ).toBe(0);
    expect(
      await db.getRepository(ArtifactPiiMaskRecord).countBy({ artifactId }),
    ).toBe(0);
    expect(
      await db.getRepository(ArtifactRecord).findOneBy({ id: artifactId }),
    ).toMatchObject({ currentVersionNumber: 1 });
  });

  it('commits the version, its dictionary entries and the artifact pointer together', async () => {
    await repository.addVersionAndUpdateArtifact({
      version: version(),
      expectedCurrentVersionNumber: 1,
      isAnonymous: false,
      piiMasks: [piiMask()],
    });
    expect(
      await db.getRepository(ArtifactVersionRecord).countBy({ artifactId }),
    ).toBe(1);
    expect(
      await db.getRepository(ArtifactPiiMaskRecord).countBy({ artifactId }),
    ).toBe(1);
    expect(
      await db.getRepository(ArtifactRecord).findOneBy({ id: artifactId }),
    ).toMatchObject({ currentVersionNumber: 2 });
  });
  it('preserves an omitted letterhead and clears an explicitly null letterhead', async () => {
    await repository.addVersionAndUpdateArtifact({
      version: version(),
      expectedCurrentVersionNumber: 1,
      isAnonymous: false,
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
      isAnonymous: false,
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
        isAnonymous: false,
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

  describe('conversion to a normal artifact', () => {
    let anonymousChat: UUID;
    let normalChat: UUID;
    const firstVersionId = randomUUID();
    const placeholderVersion = '<p>Herr {{pii:PERSON_NAME_1}}</p>';

    beforeEach(async () => {
      anonymousChat = randomUUID();
      normalChat = randomUUID();
      await db
        .getRepository(artifactSchema)
        .update(
          { id: artifactId },
          { isAnonymous: true, title: 'Bescheid an {{pii:PERSON_NAME_1}}' },
        );
      await db.getRepository(versionSchema).insert({
        id: firstVersionId,
        artifactId,
        versionNumber: 1,
        content: placeholderVersion,
        authorType: AuthorType.ASSISTANT,
      });
      await db.getRepository(piiMaskSchema).insert({ ...piiMask() });
      await db.getRepository(threadSchema).insert([
        { id: anonymousChat, isAnonymous: true },
        { id: normalChat, isAnonymous: false },
      ]);
      await db.getRepository(threadLinkSchema).insert([
        { threadId: anonymousChat, artifactId },
        { threadId: normalChat, artifactId },
      ]);
    });

    afterEach(async () => {
      await db.getRepository(versionSchema).delete({ id: firstVersionId });
    });

    const convert = () =>
      repository.convertToNormal({
        artifactId,
        expectedCurrentVersionNumber: 1,
        title: 'Bescheid an Anna Schmidt',
        versions: [{ id: firstVersionId, content: '<p>Herr Anna Schmidt</p>' }],
      });

    async function stored() {
      const artifact = await db
        .getRepository(artifactSchema)
        .findOneByOrFail({ id: artifactId });
      const versions = await db
        .getRepository(versionSchema)
        .find({ where: { artifactId }, order: { versionNumber: 'ASC' } });
      const links = await db
        .getRepository(threadLinkSchema)
        .findBy({ artifactId });
      return {
        isAnonymous: artifact.isAnonymous,
        title: artifact.title,
        contents: versions.map((version) => version.content),
        dictionarySize: await db
          .getRepository(piiMaskSchema)
          .countBy({ artifactId }),
        linkedChats: links
          .map((link) => link.threadId)
          .sort((a, b) => a.localeCompare(b)),
      };
    }

    const unconverted = () => ({
      isAnonymous: true,
      title: 'Bescheid an {{pii:PERSON_NAME_1}}',
      contents: [placeholderVersion],
      dictionarySize: 1,
      linkedChats: [anonymousChat, normalChat].sort((a, b) =>
        a.localeCompare(b),
      ),
    });

    const anonymousWrite = () =>
      repository.addVersionAndUpdateArtifact({
        version: new ArtifactVersion({
          artifactId,
          versionNumber: 2,
          content: '<p>Herr {{pii:PERSON_NAME_1}}, {{pii:PERSON_NAME_2}}</p>',
          authorType: AuthorType.ASSISTANT,
        }),
        expectedCurrentVersionNumber: 1,
        isAnonymous: true,
        piiMasks: [
          new ArtifactPiiMask({
            artifactId,
            category: PiiCategory.PERSON_NAME,
            maskIndex: 2,
            value: 'Bernd Bauer',
          }),
        ],
      });

    it('stores the resolved title and versions and deletes the dictionary and the links to anonymous chats', async () => {
      await convert();

      expect(await stored()).toEqual({
        isAnonymous: false,
        title: 'Bescheid an Anna Schmidt',
        contents: ['<p>Herr Anna Schmidt</p>'],
        dictionarySize: 0,
        linkedChats: [normalChat],
      });
    });

    it('converts nothing when an anonymous write landed after the conversion read the artifact', async () => {
      await anonymousWrite();
      const afterWrite = await stored();

      await expect(convert()).rejects.toBeInstanceOf(
        ArtifactVersionConflictError,
      );

      expect(await stored()).toEqual(afterWrite);
      expect(afterWrite.isAnonymous).toBe(true);
    });

    it('rejects an anonymous write prepared before the conversion, so no placeholder lands in the converted artifact', async () => {
      await convert();

      await expect(anonymousWrite()).rejects.toBeInstanceOf(
        ArtifactVersionConflictError,
      );

      expect(await stored()).toMatchObject({
        contents: ['<p>Herr Anna Schmidt</p>'],
        dictionarySize: 0,
      });
    });

    it('rejects an anonymous write that waited for a conversion in progress', async () => {
      const conversion = db.createQueryRunner();
      await conversion.connect();
      await conversion.startTransaction();
      try {
        await conversion.query(
          `UPDATE "artifacts" SET "isAnonymous" = false WHERE "id" = $1 AND "isAnonymous" AND "currentVersionNumber" = 1`,
          [artifactId],
        );
        const write = anonymousWrite();
        // Holds the row until the write is waiting for it.
        await new Promise((resolve) => setTimeout(resolve, 200));
        await conversion.commitTransaction();

        await expect(write).rejects.toBeInstanceOf(
          ArtifactVersionConflictError,
        );
      } finally {
        await conversion.release();
      }
      expect(await stored()).toMatchObject({
        contents: [placeholderVersion],
        dictionarySize: 1,
      });
    });

    it('leaves the artifact anonymous when a conversion is not at the expected version', async () => {
      await expect(
        repository.convertToNormal({
          artifactId,
          expectedCurrentVersionNumber: 2,
          title: 'Bescheid an Anna Schmidt',
          versions: [],
        }),
      ).rejects.toBeInstanceOf(ArtifactVersionConflictError);

      expect(await stored()).toEqual(unconverted());
    });
  });
});
