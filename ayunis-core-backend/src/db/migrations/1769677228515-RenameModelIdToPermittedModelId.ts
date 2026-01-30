import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameModelIdToPermittedModelId1769677228515
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the existing index on modelId
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_threads_modelId"`);

    // Rename the column
    await queryRunner.query(
      `ALTER TABLE "threads" RENAME COLUMN "modelId" TO "permittedModelId"`,
    );

    // Recreate the index with the new column name
    await queryRunner.query(
      `CREATE INDEX "IDX_threads_permittedModelId" ON "threads" ("permittedModelId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the index on permittedModelId
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_threads_permittedModelId"`,
    );

    // Rename the column back
    await queryRunner.query(
      `ALTER TABLE "threads" RENAME COLUMN "permittedModelId" TO "modelId"`,
    );

    // Recreate the original index
    await queryRunner.query(
      `CREATE INDEX "IDX_threads_modelId" ON "threads" ("modelId")`,
    );
  }
}
