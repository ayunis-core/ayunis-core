import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTeamModelOverrides1773647075277 implements MigrationInterface {
  name = 'AddTeamModelOverrides1773647075277';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "teams" ADD "model_override_enabled" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."permitted_models_scope_enum" AS ENUM('org', 'team')`,
    );
    await queryRunner.query(
      `ALTER TABLE "permitted_models" ADD "scope" "public"."permitted_models_scope_enum" NOT NULL DEFAULT 'org'`,
    );
    await queryRunner.query(
      `ALTER TABLE "permitted_models" ADD "teamId" character varying`,
    );

    // Deduplicate existing rows on (orgId, modelId) before creating the unique index
    await queryRunner.query(`
      DELETE FROM "permitted_models"
      WHERE "id" IN (
        SELECT "id" FROM (
          SELECT "id", ROW_NUMBER() OVER (PARTITION BY "orgId", "modelId" ORDER BY "createdAt" ASC) AS rn
          FROM "permitted_models"
          WHERE "scope" = 'org'
        ) sub
        WHERE sub.rn > 1
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_605f8ca2a5a7123c96c2f145a2" ON "permitted_models" ("teamId", "modelId") WHERE "scope" = 'team'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_e0b6fc73ea7f071066257a9c4d" ON "permitted_models" ("orgId", "modelId") WHERE "scope" = 'org'`,
    );
    await queryRunner.query(
      `ALTER TABLE "permitted_models" ADD CONSTRAINT "FK_b6d0e7d1fa9fa0c343b75152f94" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "permitted_models" ADD CONSTRAINT "CHK_permitted_models_scope_team" CHECK (("scope" = 'org' AND "teamId" IS NULL) OR ("scope" = 'team' AND "teamId" IS NOT NULL))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Delete team-scoped rows first to avoid duplicate (orgId, modelId) after columns are dropped
    await queryRunner.query(
      `DELETE FROM "permitted_models" WHERE "scope" = 'team'`,
    );
    await queryRunner.query(
      `ALTER TABLE "permitted_models" DROP CONSTRAINT "CHK_permitted_models_scope_team"`,
    );
    await queryRunner.query(
      `ALTER TABLE "permitted_models" DROP CONSTRAINT "FK_b6d0e7d1fa9fa0c343b75152f94"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e0b6fc73ea7f071066257a9c4d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_605f8ca2a5a7123c96c2f145a2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "permitted_models" DROP COLUMN "teamId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "permitted_models" DROP COLUMN "scope"`,
    );
    await queryRunner.query(`DROP TYPE "public"."permitted_models_scope_enum"`);
    await queryRunner.query(
      `ALTER TABLE "teams" DROP COLUMN "model_override_enabled"`,
    );
  }
}
