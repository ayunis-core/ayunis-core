import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDocumentTypography1795085426661 implements MigrationInterface {
  name = 'AddDocumentTypography1795085426661';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "org_document_defaults" ("orgId" character varying NOT NULL, "fontFamily" character varying, "fontSizePt" integer, CONSTRAINT "PK_9171854ac1e5fd8672f4d085f22" PRIMARY KEY ("orgId"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "letterheads" ADD "fontFamily" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "letterheads" ADD "fontSizePt" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "org_document_defaults" ADD CONSTRAINT "FK_9171854ac1e5fd8672f4d085f22" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "org_document_defaults" DROP CONSTRAINT "FK_9171854ac1e5fd8672f4d085f22"`,
    );
    await queryRunner.query(
      `ALTER TABLE "letterheads" DROP COLUMN "fontSizePt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "letterheads" DROP COLUMN "fontFamily"`,
    );
    await queryRunner.query(`DROP TABLE "org_document_defaults"`);
  }
}
