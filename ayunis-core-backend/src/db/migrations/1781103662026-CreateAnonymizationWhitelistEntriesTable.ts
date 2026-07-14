import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnonymizationWhitelistEntriesTable1781103662026 implements MigrationInterface {
  name = 'CreateAnonymizationWhitelistEntriesTable1781103662026';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."anonymization_whitelist_entries_category_enum" AS ENUM('person_name', 'organization', 'location', 'email_address', 'phone_number', 'url_or_ip', 'date_time', 'financial_account', 'government_id', 'nationality_religion_politics')`,
    );
    await queryRunner.query(
      `CREATE TABLE "anonymization_whitelist_entries" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orgId" character varying NOT NULL, "category" "public"."anonymization_whitelist_entries_category_enum" NOT NULL, "pattern" text, CONSTRAINT "UQ_398e29bebe8413873fc849a16c4" UNIQUE ("orgId", "category"), CONSTRAINT "PK_87f703a36270e61894e2fba8163" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_afe776d2a9db9a54c762441699" ON "anonymization_whitelist_entries" ("orgId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "anonymization_whitelist_entries" ADD CONSTRAINT "FK_afe776d2a9db9a54c762441699a" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "anonymization_whitelist_entries" DROP CONSTRAINT "FK_afe776d2a9db9a54c762441699a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_afe776d2a9db9a54c762441699"`,
    );
    await queryRunner.query(`DROP TABLE "anonymization_whitelist_entries"`);
    await queryRunner.query(
      `DROP TYPE "public"."anonymization_whitelist_entries_category_enum"`,
    );
  }
}
