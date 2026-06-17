import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLetterheadsTable1773697364898 implements MigrationInterface {
  name = 'CreateLetterheadsTable1773697364898';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "letterheads" (
        "id" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "orgId" character varying NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" character varying(1000),
        "firstPageStoragePath" character varying NOT NULL,
        "continuationPageStoragePath" character varying,
        "firstPageMargins" text NOT NULL,
        "continuationPageMargins" text NOT NULL,
        CONSTRAINT "PK_5c311a586c089dc4f93c852cdc1" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ed5c8c0b59525d6ee217b5e271" ON "letterheads" ("orgId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "letterheads" ADD CONSTRAINT "FK_letterheads_orgId_orgs" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "letterheads" DROP CONSTRAINT "FK_letterheads_orgId_orgs"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ed5c8c0b59525d6ee217b5e271"`,
    );
    await queryRunner.query(`DROP TABLE "letterheads"`);
  }
}
