import { randomUUID, type UUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { ThreadRecord } from 'src/domain/threads/infrastructure/persistence/local/schema/thread.record';
import { LocalArtifactsRepository } from 'src/domain/artifacts/infrastructure/persistence/local/local-artifacts.repository';
import type { ArtifactMapper } from 'src/domain/artifacts/infrastructure/persistence/local/mappers/artifact.mapper';
import type { ArtifactVersionMapper } from 'src/domain/artifacts/infrastructure/persistence/local/mappers/artifact-version.mapper';
import { ArtifactRecord } from 'src/domain/artifacts/infrastructure/persistence/local/schema/artifact.record';
import { ArtifactVersionRecord } from 'src/domain/artifacts/infrastructure/persistence/local/schema/artifact-version.record';
import { DocumentArtifactRecord } from 'src/domain/artifacts/infrastructure/persistence/local/schema/document-artifact.record';
import { ThreadArtifactRecord } from 'src/domain/artifacts/infrastructure/persistence/local/schema/thread-artifact.record';
import { ArtifactPiiMaskRecord } from 'src/domain/artifacts/infrastructure/persistence/local/schema/artifact-pii-mask.record';

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
    isAnonymous: { type: 'boolean', default: false },
  },
});
export const artifactSchema = new EntitySchema<
  ArtifactRecord & { type: string }
>({
  name: 'ArtifactRecord',
  target: ArtifactRecord,
  tableName: 'artifacts',
  columns: {
    id,
    userId: { type: 'varchar', nullable: true },
    workspaceId: { type: 'varchar', nullable: true },
    creatorId: { type: 'varchar', nullable: true },
    type: { type: 'varchar', default: 'document' },
    title: { type: 'varchar' },
    isAnonymous: { type: 'boolean', default: false },
    currentVersionNumber: { type: Number, default: 1 },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
  },
  relations: {
    versions: {
      type: 'one-to-many',
      target: 'ArtifactVersionRecord',
      inverseSide: 'artifact',
    },
    threadLinks: {
      type: 'one-to-many',
      target: 'ThreadArtifactRecord',
      inverseSide: 'artifact',
    },
    piiMasks: {
      type: 'one-to-many',
      target: 'ArtifactPiiMaskRecord',
      inverseSide: 'artifact',
    },
  },
});
export const versionSchema = new EntitySchema<ArtifactVersionRecord>({
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
const threadLinkSchema = new EntitySchema<ThreadArtifactRecord>({
  name: 'ThreadArtifactRecord',
  target: ThreadArtifactRecord,
  tableName: 'thread_artifacts',
  columns: {
    threadId: id,
    artifactId: id,
    createdAt: { type: 'timestamp', createDate: true },
  },
  relations: {
    thread: {
      type: 'many-to-one',
      target: 'ThreadRecord',
      joinColumn: { name: 'threadId' },
    },
    artifact: {
      type: 'many-to-one',
      target: 'ArtifactRecord',
      joinColumn: { name: 'artifactId' },
      inverseSide: 'threadLinks',
    },
  },
});

export const piiMaskSchema = new EntitySchema<ArtifactPiiMaskRecord>({
  name: 'ArtifactPiiMaskRecord',
  target: ArtifactPiiMaskRecord,
  tableName: 'artifact_pii_masks',
  columns: {
    id,
    artifactId: { type: 'varchar' },
    category: { type: 'varchar' },
    maskIndex: { type: Number },
    value: { type: 'text' },
    createdAt: { type: 'timestamp', createDate: true },
  },
  uniques: [
    { columns: ['artifactId', 'category', 'maskIndex'] },
    { columns: ['artifactId', 'category', 'value'] },
  ],
  relations: {
    artifact: {
      type: 'many-to-one',
      target: 'ArtifactRecord',
      joinColumn: { name: 'artifactId' },
      inverseSide: 'piiMasks',
      onDelete: 'CASCADE',
    },
  },
});

/**
 * A data source on a fresh schema with chats, artifacts, their versions,
 * chat links and mask dictionaries, plus `workspace_members` for the workspace membership condition.
 */
export async function createArtifactTestDb(
  prefix: string,
): Promise<{ db: DataSource; schema: string }> {
  const schema = `${prefix}_${randomUUID().replaceAll('-', '')}`;
  const db = new DataSource({
    ...(typeormConfigRaw as PostgresConnectionOptions),
    schema,
    entities: [
      threadSchema,
      artifactSchema,
      versionSchema,
      threadLinkSchema,
      piiMaskSchema,
    ],
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
  return { db, schema };
}

export async function dropArtifactTestDb(
  db: DataSource | undefined,
  schema: string,
): Promise<void> {
  if (!db?.isInitialized) return;
  const runner = db.createQueryRunner();
  await runner.dropSchema(schema, true, true);
  await runner.release();
  await db.destroy();
}

/** The repository outside any transaction, returning records as entities. */
export function createArtifactsRepository(
  db: DataSource,
): LocalArtifactsRepository {
  return new LocalArtifactsRepository(
    db.getRepository(ArtifactRecord),
    db.getRepository(DocumentArtifactRecord),
    db.getRepository(ArtifactVersionRecord),
    db.getRepository(ThreadArtifactRecord),
    db.getRepository(ArtifactPiiMaskRecord),
    {
      toDomain: (record: ArtifactRecord) => record,
    } as unknown as ArtifactMapper,
    {} as ArtifactVersionMapper,
    {
      tx: undefined,
    } as unknown as TransactionHost<TransactionalAdapterTypeOrm>,
  );
}

export async function insertChat(
  db: DataSource,
  userId: UUID,
  workspaceId: UUID | null,
  isAnonymous = false,
): Promise<UUID> {
  const chatId = randomUUID();
  await db
    .getRepository(ThreadRecord)
    .insert({ id: chatId, userId, workspaceId, isAnonymous });
  return chatId;
}

/**
 * An artifact the chat's user created in the chat, owned by the chat's scope,
 * with version 1 and its link to the chat.
 */
export async function insertArtifact(
  db: DataSource,
  threadId: UUID,
  isAnonymous = false,
): Promise<UUID> {
  const artifactId = randomUUID();
  const chat = await db
    .getRepository(ThreadRecord)
    .findOneByOrFail({ id: threadId });
  await db.getRepository(artifactSchema).insert({
    id: artifactId,
    userId: chat.workspaceId ? null : chat.userId,
    workspaceId: chat.workspaceId,
    creatorId: chat.userId,
    title: 'Beschlussvorlage',
    isAnonymous,
  });
  await db
    .getRepository(versionSchema)
    .insert({ id: randomUUID(), artifactId, versionNumber: 1 });
  await db.getRepository(threadLinkSchema).insert({ threadId, artifactId });
  return artifactId;
}
