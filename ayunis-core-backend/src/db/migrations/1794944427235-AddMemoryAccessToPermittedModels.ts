import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMemoryAccessToPermittedModels1794944427235 implements MigrationInterface {
  name = 'AddMemoryAccessToPermittedModels1794944427235';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "permitted_models" ADD "memoryAccess" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "permitted_models" DROP COLUMN "memoryAccess"`,
    );
  }
}
