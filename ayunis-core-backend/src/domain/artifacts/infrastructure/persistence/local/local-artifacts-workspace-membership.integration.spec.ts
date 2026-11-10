import { randomUUID, type UUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { ThreadRecord } from 'src/domain/threads/infrastructure/persistence/local/schema/thread.record';
import { LocalArtifactsRepository } from './local-artifacts.repository';
import type { ArtifactMapper } from './mappers/artifact.mapper';
import type { ArtifactVersionMapper } from './mappers/artifact-version.mapper';
import { ArtifactRecord } from './schema/artifact.record';
import { ArtifactVersionRecord } from './schema/artifact-version.record';
import { DocumentArtifactRecord } from './schema/document-artifact.record';

// ts-jest drops the column types of the records, so the tables the queries
// touch are declared explicitly. Ids are varchar, as in the real schema.
const id = { type: 'varchar', primary: true } as const;
const threadSchema = new EntitySchema<ThreadRecord>({
  name: 'ThreadRecord',
  target: ThreadRecord,
  tableName: 'threads',
  columns: {
    id,
    userId: { type: 'varchar' },
    workspaceId: { type: 'varchar', nullable: true },
  },
});
const artifactSchema = new EntitySchema<ArtifactRecord>({
  name: 'ArtifactRecord',
  target: ArtifactRecord,
  tableName: 'artifacts',
  columns: {
    id,
    threadId: { type: 'varchar' },
    userId: { type: 'varchar' },
    title: { type: 'varchar' },
    currentVersionNumber: { type: Number, default: 1 },
    createdAt: { type: 'timestamp', createDate: true },
  },
  relations: {
    thread: {
      type: 'many-to-one',
      target: 'ThreadRecord',
      joinColumn: { name: 'threadId' },
    },
    versions: {
      type: 'one-to-many',
      target: 'ArtifactVersionRecord',
      inverseSide: 'artifact',
    },
  },
});
const versionSchema = new EntitySchema<ArtifactVersionRecord>({
  name: 'ArtifactVersionRecord',
  target: ArtifactVersionRecord,
  tableName: 'artifact_versions',
  columns: {
    id,
    artifactId: { type: 'varchar' },
    versionNumber: { type: Number },
  },
  relations: {
    artifact: {
      type: 'many-to-one',
      target: 'ArtifactRecord',
      joinColumn: { name: 'artifactId' },
      inverseSide: 'versions',
    },
  },
});

/**
 * Distinct principals: the creator and a colleague are both members of the
 * workspace and each has an artifact in their own chat there; the creator
 * also has an artifact in a personal chat. Membership rows are changed
 * directly, as no member API exists here.
 */
describe('Workspace chat artifacts require current membership (PostgreSQL)', () => {
  let db: DataSource;
  let schema: string;
  let artifacts: LocalArtifactsRepository;
  let creator: UUID;
  let colleague: UUID;
  let workspaceId: UUID;
  let workspaceChat: UUID;
  let workspaceArtifact: UUID;
  let personalChat: UUID;
  let personalArtifact: UUID;

  beforeAll(async () => {
    schema = `ayc1698_artifacts_${randomUUID().replaceAll('-', '')}`;
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [threadSchema, artifactSchema, versionSchema],
      migrations: [],
      migrationsRun: false,
      logging: false,
      // The membership condition names workspace_members unqualified, so every
      // pooled connection must resolve it inside the throwaway schema.
      extra: { options: `-c search_path=${schema}` },
    });
    await db.initialize();
    const runner = db.createQueryRunner();
    await runner.createSchema(schema, true);
    await runner.release();
    await db.synchronize();
    await db.query(`CREATE TABLE workspace_members (
      id varchar PRIMARY KEY, "workspaceId" varchar NOT NULL,
      "userId" varchar NOT NULL, UNIQUE ("workspaceId", "userId")
    )`);
    artifacts = new LocalArtifactsRepository(
      db.getRepository(ArtifactRecord),
      db.getRepository(DocumentArtifactRecord),
      db.getRepository(ArtifactVersionRecord),
      {
        toDomain: (record: ArtifactRecord) => record,
      } as unknown as ArtifactMapper,
      {} as ArtifactVersionMapper,
      {
        tx: undefined,
      } as unknown as TransactionHost<TransactionalAdapterTypeOrm>,
    );
  }, 30_000);

  beforeEach(async () => {
    creator = randomUUID();
    colleague = randomUUID();
    workspaceId = randomUUID();
    await join(creator);
    await join(colleague);
    workspaceChat = await chat(creator, workspaceId);
    workspaceArtifact = await artifact(creator, workspaceChat);
    personalChat = await chat(creator, null);
    personalArtifact = await artifact(creator, personalChat);
    await artifact(colleague, await chat(colleague, workspaceId));
  }, 30_000);

  afterAll(async () => {
    if (!db?.isInitialized) return;
    const runner = db.createQueryRunner();
    await runner.dropSchema(schema, true, true);
    await runner.release();
    await db.destroy();
  }, 30_000);

  async function join(userId: UUID): Promise<void> {
    await db.query(
      `INSERT INTO workspace_members (id, "workspaceId", "userId")
       VALUES ($1, $2, $3)`,
      [randomUUID(), workspaceId, userId],
    );
  }

  async function leave(userId: UUID): Promise<void> {
    await db.query(
      `DELETE FROM workspace_members WHERE "workspaceId" = $1 AND "userId" = $2`,
      [workspaceId, userId],
    );
  }

  async function chat(userId: UUID, workspace: UUID | null): Promise<UUID> {
    const chatId = randomUUID();
    await db
      .getRepository(ThreadRecord)
      .insert({ id: chatId, userId, workspaceId: workspace });
    return chatId;
  }

  async function artifact(userId: UUID, threadId: UUID): Promise<UUID> {
    const artifactId = randomUUID();
    await db.getRepository(artifactSchema).insert({
      id: artifactId,
      threadId,
      userId,
      title: 'Beschlussvorlage',
    });
    await db
      .getRepository(versionSchema)
      .insert({ id: randomUUID(), artifactId, versionNumber: 1 });
    return artifactId;
  }

  /** Every lookup that serves an artifact to a user, by path. */
  async function reads(userId: UUID, artifactId: UUID, threadId: UUID) {
    const withVersions = await artifacts.findByIdWithVersions(
      artifactId,
      userId,
    );
    return {
      update: (await artifacts.findById(artifactId, userId)) !== null,
      detail: withVersions?.versions?.length === 1,
      threadList: (await artifacts.findByThreadId(threadId, userId)).some(
        (item) => item.id === artifactId,
      ),
    };
  }

  const reachable = { update: true, detail: true, threadList: true };
  const unreachable = { update: false, detail: false, threadList: false };

  it('serves the creator their workspace chat artifact while a member', async () => {
    expect(await reads(creator, workspaceArtifact, workspaceChat)).toEqual(
      reachable,
    );
  });

  it('hides the artifact once the creator is no longer a member, and keeps it', async () => {
    await leave(creator);

    expect(await reads(creator, workspaceArtifact, workspaceChat)).toEqual(
      unreachable,
    );
    expect(
      await db.getRepository(artifactSchema).countBy({ id: workspaceArtifact }),
    ).toBe(1);
  });

  it('serves the artifact again when the creator is added back', async () => {
    await leave(creator);
    expect(await reads(creator, workspaceArtifact, workspaceChat)).toEqual(
      unreachable,
    );

    await join(creator);

    expect(await reads(creator, workspaceArtifact, workspaceChat)).toEqual(
      reachable,
    );
  });

  it('never serves another member the creator’s artifact', async () => {
    expect(await reads(colleague, workspaceArtifact, workspaceChat)).toEqual(
      unreachable,
    );
  });

  it('serves personal chat artifacts without any workspace membership', async () => {
    await leave(creator);

    expect(await reads(creator, personalArtifact, personalChat)).toEqual(
      reachable,
    );
  });
});
