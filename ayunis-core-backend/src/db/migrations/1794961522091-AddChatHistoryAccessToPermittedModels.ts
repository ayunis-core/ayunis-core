import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChatHistoryAccessToPermittedModels1794961522091 implements MigrationInterface {
  name = 'AddChatHistoryAccessToPermittedModels1794961522091';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "permitted_models" ADD "chatHistoryAccess" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "permitted_models" DROP COLUMN "chatHistoryAccess"`,
    );
  }
}
