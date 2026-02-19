import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSourceIdToChunks1758629800675 implements MigrationInterface {
  name = 'AddSourceIdToChunks1758629800675';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "text_source_details_record" ADD "sourceId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "text_source_details_record" ADD CONSTRAINT "UQ_1e1afe0b5da200cd597264a4a00" UNIQUE ("sourceId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_source_details_record" ADD "sourceId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_source_details_record" ADD CONSTRAINT "UQ_b5db1a73593318f37a856ef12b4" UNIQUE ("sourceId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "url_source_details_record" ADD "sourceId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "url_source_details_record" ADD CONSTRAINT "UQ_9d2d071ed6474ce08693ab0d5ee" UNIQUE ("sourceId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ALTER COLUMN "type" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "text_source_details_record" ADD CONSTRAINT "FK_1e1afe0b5da200cd597264a4a00" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_source_details_record" ADD CONSTRAINT "FK_b5db1a73593318f37a856ef12b4" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "url_source_details_record" ADD CONSTRAINT "FK_9d2d071ed6474ce08693ab0d5ee" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "url_source_details_record" DROP CONSTRAINT "FK_9d2d071ed6474ce08693ab0d5ee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_source_details_record" DROP CONSTRAINT "FK_b5db1a73593318f37a856ef12b4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "text_source_details_record" DROP CONSTRAINT "FK_1e1afe0b5da200cd597264a4a00"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ALTER COLUMN "type" SET DEFAULT 'text'`,
    );
    await queryRunner.query(
      `ALTER TABLE "url_source_details_record" DROP CONSTRAINT "UQ_9d2d071ed6474ce08693ab0d5ee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "url_source_details_record" DROP COLUMN "sourceId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_source_details_record" DROP CONSTRAINT "UQ_b5db1a73593318f37a856ef12b4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_source_details_record" DROP COLUMN "sourceId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "text_source_details_record" DROP CONSTRAINT "UQ_1e1afe0b5da200cd597264a4a00"`,
    );
    await queryRunner.query(
      `ALTER TABLE "text_source_details_record" DROP COLUMN "sourceId"`,
    );
  }
}
