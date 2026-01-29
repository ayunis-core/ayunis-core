import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropThreadsModelForeignKey1769678413485
  implements MigrationInterface
{
  name = 'DropThreadsModelForeignKey1769678413485';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the FK constraint that was using SET NULL on delete.
    // This allows us to preserve permittedModelId when a model is deleted,
    // enabling detection of deleted models in threads at runtime.
    await queryRunner.query(
      `ALTER TABLE "threads" DROP CONSTRAINT IF EXISTS "FK_16a4760316ad946a5b114b27d12"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate the FK constraint with SET NULL behavior
    await queryRunner.query(
      `ALTER TABLE "threads" ADD CONSTRAINT "FK_16a4760316ad946a5b114b27d12" FOREIGN KEY ("permittedModelId") REFERENCES "permitted_models"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }
}
