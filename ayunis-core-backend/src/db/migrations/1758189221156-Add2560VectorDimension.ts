import { MigrationInterface, QueryRunner } from 'typeorm';

export class Add2560VectorDimension1758189221156 implements MigrationInterface {
  name = 'Add2560VectorDimension1758189221156';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "child_chunks" ADD "embedding_2560" vector`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "child_chunks" DROP COLUMN "embedding_2560"`,
    );
  }
}
