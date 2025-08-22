import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNameToSource1754309122402 implements MigrationInterface {
  name = 'AddNameToSource1754309122402';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sources" RENAME COLUMN "fileName" TO "name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ALTER COLUMN "name" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sources" ALTER COLUMN "name" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" RENAME COLUMN "name" TO "fileName"`,
    );
  }
}
