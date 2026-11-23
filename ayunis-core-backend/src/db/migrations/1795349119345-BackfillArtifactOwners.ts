import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gives every artifact the owner of the chat it was created in: artifacts of
 * workspace chats become the workspace's, artifacts of personal chats stay
 * with their user, who is recorded as the creator of both. The next migration
 * drops the chat reference, so chats reach artifacts only through their links.
 */
export class BackfillArtifactOwners1795349119345 implements MigrationInterface {
  name = 'BackfillArtifactOwners1795349119345';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "artifacts" SET "creatorId" = "userId"`);
    await queryRunner.query(
      `UPDATE "artifacts" SET "workspaceId" = "threads"."workspaceId", "userId" = NULL FROM "threads" WHERE "threads"."id" = "artifacts"."threadId" AND "threads"."workspaceId" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // An artifact belongs to one chat again: the first one linked to it,
    // which is the chat it was created in unless that chat is gone.
    await queryRunner.query(
      `UPDATE "artifacts" SET "threadId" = "first"."threadId" FROM (SELECT DISTINCT ON ("artifactId") "artifactId", "threadId" FROM "thread_artifacts" ORDER BY "artifactId", "createdAt", "threadId") AS "first" WHERE "first"."artifactId" = "artifacts"."id" AND "artifacts"."threadId" IS NULL`,
    );
    // Without a chat an artifact would have been deleted with its chat.
    await queryRunner.query(`DELETE FROM "artifacts" WHERE "threadId" IS NULL`);
    await queryRunner.query(
      `UPDATE "artifacts" SET "userId" = "threads"."userId", "workspaceId" = NULL FROM "threads" WHERE "threads"."id" = "artifacts"."threadId"`,
    );
  }
}
