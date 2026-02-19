import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnonymousOnlyToPermittedModel1764339508793
  implements MigrationInterface
{
  name = 'AddAnonymousOnlyToPermittedModel1764339508793';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "permitted_models" ADD "anonymousOnly" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "permitted_models" DROP COLUMN "anonymousOnly"`,
    );
  }
}
