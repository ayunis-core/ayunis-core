import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertDataSourceDataToJsonb1758881662358
  implements MigrationInterface
{
  name = 'ConvertDataSourceDataToJsonb1758881662358';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "data_source_details_record" DROP COLUMN "data"`,
    );
    await queryRunner.query(
      `ALTER TABLE "data_source_details_record" ADD "data" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "data_source_details_record" DROP COLUMN "data"`,
    );
    await queryRunner.query(
      `ALTER TABLE "data_source_details_record" ADD "data" character varying`,
    );
  }
}
