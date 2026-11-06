import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTeamAndOrgKnowledgeBaseOwnership1793979275771 implements MigrationInterface {
  name = 'AddTeamAndOrgKnowledgeBaseOwnership1793979275771';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" DROP CONSTRAINT "CHK_knowledge_bases_exactly_one_owner"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" ADD "teamId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" ADD "isOrgOwned" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" ADD "isActive" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_30b897b75b0152629a3f0eaf00" ON "knowledge_bases" ("teamId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" ADD CONSTRAINT "CHK_knowledge_bases_single_owner" CHECK (num_nonnulls("userId", "workspaceId", "teamId") + "isOrgOwned"::int = 1)`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" ADD CONSTRAINT "FK_30b897b75b0152629a3f0eaf00a" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The restored check only admits user or workspace owners, so team- and
    // org-owned knowledge bases (with their cascading sources) cannot
    // survive a rollback.
    await queryRunner.query(
      `DELETE FROM "knowledge_bases" WHERE "teamId" IS NOT NULL OR "isOrgOwned"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" DROP CONSTRAINT "FK_30b897b75b0152629a3f0eaf00a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" DROP CONSTRAINT "CHK_knowledge_bases_single_owner"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_30b897b75b0152629a3f0eaf00"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" DROP COLUMN "isActive"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" DROP COLUMN "isOrgOwned"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" DROP COLUMN "teamId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" ADD CONSTRAINT "CHK_knowledge_bases_exactly_one_owner" CHECK (((("userId" IS NOT NULL) AND ("workspaceId" IS NULL)) OR (("userId" IS NULL) AND ("workspaceId" IS NOT NULL))))`,
    );
  }
}
