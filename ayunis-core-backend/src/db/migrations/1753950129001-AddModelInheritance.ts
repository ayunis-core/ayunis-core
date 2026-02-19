import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddModelInheritance1753950129001 implements MigrationInterface {
  name = 'AddModelInheritance1753950129001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add dimensions column for embedding models
    await queryRunner.query(`ALTER TABLE "models" ADD "dimensions" integer`);

    // Add type column as nullable first
    await queryRunner.query(
      `ALTER TABLE "models" ADD "type" character varying`,
    );

    // Set all existing records as language models (since they have canStream/isReasoning properties)
    await queryRunner.query(
      `UPDATE "models" SET "type" = 'language' WHERE "type" IS NULL`,
    );

    // Now make type column NOT NULL
    await queryRunner.query(
      `ALTER TABLE "models" ALTER COLUMN "type" SET NOT NULL`,
    );

    // Make language-specific columns nullable (since embedding models won't have them)
    await queryRunner.query(
      `ALTER TABLE "models" ALTER COLUMN "canStream" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "models" ALTER COLUMN "isReasoning" DROP NOT NULL`,
    );

    // Create index on the discriminator column
    await queryRunner.query(
      `CREATE INDEX "IDX_8df74483aed9bb6dcc8ff2a886" ON "models" ("type") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8df74483aed9bb6dcc8ff2a886"`,
    );
    await queryRunner.query(
      `ALTER TABLE "models" ALTER COLUMN "isReasoning" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "models" ALTER COLUMN "canStream" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "models" DROP COLUMN "type"`);
    await queryRunner.query(`ALTER TABLE "models" DROP COLUMN "dimensions"`);
  }
}
