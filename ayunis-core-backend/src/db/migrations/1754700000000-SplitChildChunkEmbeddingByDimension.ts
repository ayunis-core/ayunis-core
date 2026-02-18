import { MigrationInterface, QueryRunner } from 'typeorm';

export class SplitChildChunkEmbeddingByDimension1755000000000
  implements MigrationInterface
{
  name = 'SplitChildChunkEmbeddingByDimension1755000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "child_chunks" ADD COLUMN "embedding_1024" vector NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "child_chunks" ADD COLUMN "embedding_1536" vector NULL`,
    );

    // Migrate any existing data into the appropriate column if present
    await queryRunner.query(
      `UPDATE "child_chunks" SET "embedding_1024" = embedding WHERE embedding IS NOT NULL AND vector_dims(embedding) = 1024`,
    );
    await queryRunner.query(
      `UPDATE "child_chunks" SET "embedding_1536" = embedding WHERE embedding IS NOT NULL AND vector_dims(embedding) = 1536`,
    );

    // Drop the old generic column
    await queryRunner.query(
      `ALTER TABLE "child_chunks" DROP COLUMN IF EXISTS "embedding"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate the generic column
    await queryRunner.query(
      `ALTER TABLE "child_chunks" ADD COLUMN "embedding" vector NULL`,
    );

    // Combine back, prefer 1536 then 1024
    await queryRunner.query(
      `UPDATE "child_chunks" SET embedding = embedding_1536 WHERE embedding_1536 IS NOT NULL`,
    );
    await queryRunner.query(
      `UPDATE "child_chunks" SET embedding = embedding_1024 WHERE embedding IS NULL AND embedding_1024 IS NOT NULL`,
    );

    // Drop split columns
    await queryRunner.query(
      `ALTER TABLE "child_chunks" DROP COLUMN IF EXISTS "embedding_1536"`,
    );
    await queryRunner.query(
      `ALTER TABLE "child_chunks" DROP COLUMN IF EXISTS "embedding_1024"`,
    );
  }
}
