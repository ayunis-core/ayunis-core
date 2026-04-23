import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UserDefaultModelReferenceCatalog1776869182118 implements MigrationInterface {
  name = 'UserDefaultModelReferenceCatalog1776869182118';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the FK that pinned user defaults to a specific permitted_models row.
    await queryRunner.query(
      `ALTER TABLE "user_default_models" DROP CONSTRAINT "FK_b57e1a54cec228b7369d1ededdd"`,
    );

    // Backfill: rewrite modelId from permitted_models.id to permitted_models.modelId
    // (the catalog model). Drop rows whose permitted_model is missing — the FK
    // cascade had already deleted those in the old design.
    await queryRunner.query(
      `UPDATE "user_default_models" udm
       SET "modelId" = pm."modelId"
       FROM "permitted_models" pm
       WHERE pm."id" = udm."modelId"`,
    );
    await queryRunner.query(
      `DELETE FROM "user_default_models"
       WHERE "modelId" NOT IN (SELECT "id" FROM "models")`,
    );

    // Re-add the FK pointing at the catalog model so the user's preference
    // survives admins removing/re-adding a permitted model for the same catalog
    // model.
    await queryRunner.query(
      `ALTER TABLE "user_default_models" ADD CONSTRAINT "FK_b57e1a54cec228b7369d1ededdd" FOREIGN KEY ("modelId") REFERENCES "models"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The reverse migration cannot reconstruct the original permitted_models.id
    // values because the same catalog model can be permitted in multiple orgs,
    // and the original mapping has been lost. Drop all user defaults so the new
    // FK is satisfied; users will need to re-select their default model.
    await queryRunner.query(
      `ALTER TABLE "user_default_models" DROP CONSTRAINT "FK_b57e1a54cec228b7369d1ededdd"`,
    );
    await queryRunner.query(`DELETE FROM "user_default_models"`);
    await queryRunner.query(
      `ALTER TABLE "user_default_models" ADD CONSTRAINT "FK_b57e1a54cec228b7369d1ededdd" FOREIGN KEY ("modelId") REFERENCES "permitted_models"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
