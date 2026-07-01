import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Data cleanup for AYC-383: prepares existing data for the org-scoped foreign
 * keys added in the following migration
 * (AddOrgCascadeToConversationKbMcpData).
 *
 * Until now `knowledge_bases.orgId`, `mcp_integrations.orgId` and
 * `threads.userId` were plain columns with no foreign key, so org/user
 * deletion left this data behind as orphans. Adding the FKs would fail if any
 * such orphan rows already exist, so this migration purges them first:
 *
 *   - sources belonging to knowledge bases whose org no longer exists
 *     (deleted before their knowledge bases so the still-`SET NULL` source→KB
 *     FK doesn't merely detach them; their RAG chunks cascade away with them),
 *   - knowledge bases whose org no longer exists,
 *   - MCP integrations whose org no longer exists,
 *   - threads whose owning user no longer exists (messages, artifacts and
 *     assignments cascade via their existing threadId FKs).
 *
 * This is a one-way data fix: `down()` cannot recreate deleted rows and doing
 * so would re-introduce the orphaned, undeletable data, so it is a no-op.
 */
export class CleanupOrphanedOrgScopedData1782922617000 implements MigrationInterface {
  name = 'CleanupOrphanedOrgScopedData1782922617000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "sources"
       WHERE "knowledgeBaseId" IN (
         SELECT "kb"."id" FROM "knowledge_bases" AS "kb"
         WHERE NOT EXISTS (
           SELECT 1 FROM "orgs" AS "o" WHERE "o"."id" = "kb"."orgId"
         )
       )`,
    );
    await queryRunner.query(
      `DELETE FROM "knowledge_bases" AS "kb"
       WHERE NOT EXISTS (
         SELECT 1 FROM "orgs" AS "o" WHERE "o"."id" = "kb"."orgId"
       )`,
    );
    await queryRunner.query(
      `DELETE FROM "mcp_integrations" AS "mi"
       WHERE NOT EXISTS (
         SELECT 1 FROM "orgs" AS "o" WHERE "o"."id" = "mi"."orgId"
       )`,
    );
    await queryRunner.query(
      `DELETE FROM "threads" AS "t"
       WHERE NOT EXISTS (
         SELECT 1 FROM "users" AS "u" WHERE "u"."id" = "t"."userId"
       )`,
    );
  }

  public async down(): Promise<void> {
    // Irreversible data cleanup — orphaned rows cannot (and should not) be
    // recreated. Intentional no-op.
  }
}
