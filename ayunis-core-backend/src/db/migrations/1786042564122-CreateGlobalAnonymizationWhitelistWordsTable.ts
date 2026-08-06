import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGlobalAnonymizationWhitelistWordsTable1786042564122 implements MigrationInterface {
  name = 'CreateGlobalAnonymizationWhitelistWordsTable1786042564122';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."global_anonymization_whitelist_words_category_enum" AS ENUM('person_name', 'organization', 'location', 'email_address', 'phone_number', 'url_or_ip', 'date_time', 'financial_account', 'government_id', 'nationality_religion_politics', 'other')`,
    );
    await queryRunner.query(
      `CREATE TABLE "global_anonymization_whitelist_words" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "category" "public"."global_anonymization_whitelist_words_category_enum" NOT NULL, "word" text NOT NULL, "wordLowercase" text NOT NULL, "createdByUserId" character varying, CONSTRAINT "UQ_911de3cde8ce5316dc9b545245a" UNIQUE ("category", "wordLowercase"), CONSTRAINT "PK_c6cfd087ebff53d8fe5226f6b16" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "global_anonymization_whitelist_words" ADD CONSTRAINT "FK_6556af0a49c65240e2985fa83c4" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "global_anonymization_whitelist_words" DROP CONSTRAINT "FK_6556af0a49c65240e2985fa83c4"`,
    );
    await queryRunner.query(
      `DROP TABLE "global_anonymization_whitelist_words"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."global_anonymization_whitelist_words_category_enum"`,
    );
  }
}
