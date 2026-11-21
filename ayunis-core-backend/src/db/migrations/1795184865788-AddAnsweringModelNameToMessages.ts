import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnsweringModelNameToMessages1795184865788 implements MigrationInterface {
  name = 'AddAnsweringModelNameToMessages1795184865788';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "messages" ADD "answeringModelName" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "messages" DROP COLUMN "answeringModelName"`,
    );
  }
}
