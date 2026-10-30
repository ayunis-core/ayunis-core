import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Moves every default into default_model_selections: personal defaults from
 * user_default_models and org/team defaults from permitted_models.isDefault.
 * Only language-model permits carried a meaningful default; legacy flags on
 * embedding or image permits are not migrated. Where legacy data holds more
 * than one flagged permit per org or team, the most recently updated wins.
 */
export class UnifyDefaultModelSelections1793272198572 implements MigrationInterface {
  name = 'UnifyDefaultModelSelections1793272198572';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."default_model_selections_kind_enum" AS ENUM('model', 'mode')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."default_model_selections_mode_enum" AS ENUM('auto', 'max')`,
    );
    await queryRunner.query(
      `CREATE TABLE "default_model_selections" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" character varying, "teamId" character varying, "orgId" character varying, "kind" "public"."default_model_selections_kind_enum" NOT NULL, "permittedModelId" character varying, "mode" "public"."default_model_selections_mode_enum", CONSTRAINT "CHK_900b31f85a8ae6f84e233f05ff" CHECK (("kind" = 'mode') = ("mode" IS NOT NULL)), CONSTRAINT "CHK_7d98eb20a1747000dcf9aae114" CHECK (("kind" = 'model') = ("permittedModelId" IS NOT NULL)), CONSTRAINT "CHK_6660b9c9c7df5a1242cffda80b" CHECK (num_nonnulls("userId", "teamId", "orgId") = 1), CONSTRAINT "PK_b77a83feb997647337651e81765" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b1c1a9ddd25fae176fd6514f34" ON "default_model_selections" ("permittedModelId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_12a840e2c1e3179c7ce7022c96" ON "default_model_selections" ("orgId") WHERE "orgId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_4f7c1aa40b853d2bf6d9c81da6" ON "default_model_selections" ("teamId") WHERE "teamId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_7b2de960823f81a3e0f95fab69" ON "default_model_selections" ("userId") WHERE "userId" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "default_model_selections" ADD CONSTRAINT "FK_b9352f0aed0942329943ddace35" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "default_model_selections" ADD CONSTRAINT "FK_a9639846de0c1f80a48304560ab" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "default_model_selections" ADD CONSTRAINT "FK_7ef222153b228f40c0d1fe27c55" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "default_model_selections" ADD CONSTRAINT "FK_b1c1a9ddd25fae176fd6514f341" FOREIGN KEY ("permittedModelId") REFERENCES "permitted_models"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(`
      INSERT INTO "default_model_selections" ("id", "createdAt", "updatedAt", "userId", "kind", "permittedModelId")
      SELECT gen_random_uuid()::varchar, u."createdAt", u."updatedAt", u."userId", 'model', u."modelId"
      FROM "user_default_models" u
    `);
    await queryRunner.query(`
      INSERT INTO "default_model_selections" ("id", "createdAt", "updatedAt", "orgId", "kind", "permittedModelId")
      SELECT DISTINCT ON (pm."orgId") gen_random_uuid()::varchar, pm."createdAt", pm."updatedAt", pm."orgId", 'model', pm."id"
      FROM "permitted_models" pm
      JOIN "models" m ON m."id" = pm."modelId"
      WHERE pm."isDefault" AND pm."scope" = 'org' AND m."type" = 'language'
      ORDER BY pm."orgId", pm."updatedAt" DESC
    `);
    await queryRunner.query(`
      INSERT INTO "default_model_selections" ("id", "createdAt", "updatedAt", "teamId", "kind", "permittedModelId")
      SELECT DISTINCT ON (pm."scope_id") gen_random_uuid()::varchar, pm."createdAt", pm."updatedAt", pm."scope_id", 'model', pm."id"
      FROM "permitted_models" pm
      JOIN "models" m ON m."id" = pm."modelId"
      WHERE pm."isDefault" AND pm."scope" = 'team' AND m."type" = 'language'
      ORDER BY pm."scope_id", pm."updatedAt" DESC
    `);

    await queryRunner.query(
      `ALTER TABLE "permitted_models" DROP COLUMN "isDefault"`,
    );
    await queryRunner.query(`DROP TABLE "user_default_models"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_default_models" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" character varying NOT NULL, "modelId" character varying NOT NULL, CONSTRAINT "PK_57ffe4d8e061d080ba4703e465a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_2068066be6ef39ebd1aba35256" ON "user_default_models" ("userId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "user_default_models" ADD CONSTRAINT "FK_b57e1a54cec228b7369d1ededdd" FOREIGN KEY ("modelId") REFERENCES "permitted_models"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_default_models" ADD CONSTRAINT "FK_2068066be6ef39ebd1aba35256e" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "permitted_models" ADD "isDefault" boolean NOT NULL DEFAULT false`,
    );

    // Mode defaults have no place in the old schema and are dropped.
    await queryRunner.query(`
      INSERT INTO "user_default_models" ("id", "createdAt", "updatedAt", "userId", "modelId")
      SELECT d."id", d."createdAt", d."updatedAt", d."userId", d."permittedModelId"
      FROM "default_model_selections" d
      WHERE d."userId" IS NOT NULL AND d."kind" = 'model'
    `);
    await queryRunner.query(`
      UPDATE "permitted_models" SET "isDefault" = true
      WHERE "id" IN (
        SELECT d."permittedModelId" FROM "default_model_selections" d
        WHERE d."kind" = 'model' AND (d."orgId" IS NOT NULL OR d."teamId" IS NOT NULL)
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "permitted_models" ALTER COLUMN "isDefault" DROP DEFAULT`,
    );

    await queryRunner.query(
      `ALTER TABLE "default_model_selections" DROP CONSTRAINT "FK_b1c1a9ddd25fae176fd6514f341"`,
    );
    await queryRunner.query(
      `ALTER TABLE "default_model_selections" DROP CONSTRAINT "FK_7ef222153b228f40c0d1fe27c55"`,
    );
    await queryRunner.query(
      `ALTER TABLE "default_model_selections" DROP CONSTRAINT "FK_a9639846de0c1f80a48304560ab"`,
    );
    await queryRunner.query(
      `ALTER TABLE "default_model_selections" DROP CONSTRAINT "FK_b9352f0aed0942329943ddace35"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7b2de960823f81a3e0f95fab69"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4f7c1aa40b853d2bf6d9c81da6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_12a840e2c1e3179c7ce7022c96"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b1c1a9ddd25fae176fd6514f34"`,
    );
    await queryRunner.query(`DROP TABLE "default_model_selections"`);
    await queryRunner.query(
      `DROP TYPE "public"."default_model_selections_mode_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."default_model_selections_kind_enum"`,
    );
  }
}
