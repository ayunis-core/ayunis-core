import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddArtifactOwners1795349119344 implements MigrationInterface {
  name = 'AddArtifactOwners1795349119344';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "artifacts" ADD "workspaceId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "artifacts" ADD "creatorId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "artifacts" DROP CONSTRAINT "FK_551c174f02d20652f95ec0836f7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "artifacts" DROP CONSTRAINT "FK_2e3cf9c3366ecc0433c0af146cb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "artifacts" ALTER COLUMN "threadId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "artifacts" ALTER COLUMN "userId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_02f6c8c3b32471516031067f0c" ON "artifacts" ("workspaceId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6296a56694dc73dad29255180c" ON "artifacts" ("creatorId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "artifacts" ADD CONSTRAINT "CHK_4a02faead616ee06d2c93a584f" CHECK (num_nonnulls("userId", "workspaceId") = 1)`,
    );
    await queryRunner.query(
      `ALTER TABLE "artifacts" ADD CONSTRAINT "FK_551c174f02d20652f95ec0836f7" FOREIGN KEY ("threadId") REFERENCES "threads"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "artifacts" ADD CONSTRAINT "FK_2e3cf9c3366ecc0433c0af146cb" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "artifacts" ADD CONSTRAINT "FK_02f6c8c3b32471516031067f0c8" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "artifacts" ADD CONSTRAINT "FK_6296a56694dc73dad29255180cb" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "artifacts" DROP CONSTRAINT "FK_6296a56694dc73dad29255180cb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "artifacts" DROP CONSTRAINT "FK_02f6c8c3b32471516031067f0c8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "artifacts" DROP CONSTRAINT "FK_2e3cf9c3366ecc0433c0af146cb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "artifacts" DROP CONSTRAINT "FK_551c174f02d20652f95ec0836f7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "artifacts" DROP CONSTRAINT "CHK_4a02faead616ee06d2c93a584f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6296a56694dc73dad29255180c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_02f6c8c3b32471516031067f0c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "artifacts" ALTER COLUMN "userId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "artifacts" ALTER COLUMN "threadId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "artifacts" ADD CONSTRAINT "FK_2e3cf9c3366ecc0433c0af146cb" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "artifacts" ADD CONSTRAINT "FK_551c174f02d20652f95ec0836f7" FOREIGN KEY ("threadId") REFERENCES "threads"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "artifacts" DROP COLUMN "creatorId"`);
    await queryRunner.query(
      `ALTER TABLE "artifacts" DROP COLUMN "workspaceId"`,
    );
  }
}
