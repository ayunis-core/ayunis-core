import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkspaceIdAndIsPinnedToThreads1786447177489 implements MigrationInterface {
  name = 'AddWorkspaceIdAndIsPinnedToThreads1786447177489';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "threads" ADD "workspaceId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" ADD "isPinned" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_824ed1f30919eaeb40155372a4" ON "threads" ("workspaceId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" ADD CONSTRAINT "FK_824ed1f30919eaeb40155372a47" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "threads" DROP CONSTRAINT "FK_824ed1f30919eaeb40155372a47"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_824ed1f30919eaeb40155372a4"`,
    );
    await queryRunner.query(`ALTER TABLE "threads" DROP COLUMN "isPinned"`);
    await queryRunner.query(`ALTER TABLE "threads" DROP COLUMN "workspaceId"`);
  }
}
