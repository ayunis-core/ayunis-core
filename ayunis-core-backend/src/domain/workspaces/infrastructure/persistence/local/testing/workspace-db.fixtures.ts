import { randomUUID } from 'crypto';
import { DataSource, EntitySchema } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { WorkspaceMemberRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace-member.record';
import { WorkspaceRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace.record';

// ts-jest drops the column types of the records, so the tables are declared
// explicitly for TypeORM.
const timestamps = {
  createdAt: { type: 'timestamp', createDate: true },
  updatedAt: { type: 'timestamp', updateDate: true },
} as const;
const workspaceSchema = new EntitySchema<WorkspaceRecord>({
  name: 'WorkspaceRecord',
  target: WorkspaceRecord,
  tableName: 'workspaces',
  columns: {
    id: { type: String, primary: true },
    ...timestamps,
    name: { type: String },
    description: { type: String, nullable: true },
    instruction: { type: String, nullable: true },
    icon: { type: String },
    color: { type: String },
    orgId: { type: String },
  },
});
const memberSchema = new EntitySchema<WorkspaceMemberRecord>({
  name: 'WorkspaceMemberRecord',
  target: WorkspaceMemberRecord,
  tableName: 'workspace_members',
  columns: {
    id: { type: String, primary: true },
    ...timestamps,
    workspaceId: { type: String },
    userId: { type: String },
    role: { type: String },
  },
});

/** The membership tables first, then what the list stats read. */
export const WORKSPACE_TABLES = [
  `CREATE TABLE users (id varchar PRIMARY KEY)`,
  `CREATE TABLE workspaces (
    id varchar PRIMARY KEY, "createdAt" timestamp NOT NULL DEFAULT now(),
    "updatedAt" timestamp NOT NULL DEFAULT now(), name varchar NOT NULL,
    description varchar, instruction text, icon varchar NOT NULL,
    color varchar NOT NULL, "orgId" varchar NOT NULL
  )`,
  `CREATE TABLE workspace_members (
    id varchar PRIMARY KEY, "createdAt" timestamp NOT NULL DEFAULT now(),
    "updatedAt" timestamp NOT NULL DEFAULT now(),
    "workspaceId" varchar NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    "userId" varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role varchar NOT NULL, UNIQUE ("workspaceId", "userId")
  )`,
  `CREATE TABLE threads (
    id varchar PRIMARY KEY, "userId" varchar NOT NULL, "workspaceId" varchar,
    "createdAt" timestamp NOT NULL DEFAULT now(), "lastActivityAt" timestamp
  )`,
  `CREATE TABLE skills (id varchar PRIMARY KEY, "workspaceId" varchar)`,
  `CREATE TABLE knowledge_bases (id varchar PRIMARY KEY, "workspaceId" varchar)`,
];

/** A data source on a fresh schema holding the given tables. */
export async function createWorkspaceTestDb(
  prefix: string,
  tables: string[] = WORKSPACE_TABLES,
): Promise<{ db: DataSource; schema: string }> {
  const schema = `${prefix}_${randomUUID().replaceAll('-', '')}`;
  const db = new DataSource({
    ...(typeormConfigRaw as PostgresConnectionOptions),
    schema,
    entities: [workspaceSchema, memberSchema],
    migrations: [],
    migrationsRun: false,
    logging: false,
  });
  await db.initialize();
  const setup = db.createQueryRunner();
  await setup.createSchema(schema, true);
  await setup.query(`SET search_path TO "${schema}"`);
  for (const statement of tables) await setup.query(statement);
  await setup.query('SET search_path TO public');
  await setup.release();
  return { db, schema };
}

export async function dropWorkspaceTestDb(
  db: DataSource | undefined,
  schema: string,
): Promise<void> {
  if (!db?.isInitialized) return;
  await db.query(`DROP SCHEMA "${schema}" CASCADE`);
  await db.destroy();
}
