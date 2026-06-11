import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateThreadPiiMasksTable1781161486267 implements MigrationInterface {
  name = 'CreateThreadPiiMasksTable1781161486267';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."thread_pii_masks_category_enum" AS ENUM('person_name', 'organization', 'location', 'email_address', 'phone_number', 'url_or_ip', 'date_time', 'financial_account', 'government_id', 'nationality_religion_politics', 'other')`,
    );
    await queryRunner.query(
      `CREATE TABLE "thread_pii_masks" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "threadId" character varying NOT NULL, "category" "public"."thread_pii_masks_category_enum" NOT NULL, "maskIndex" integer NOT NULL, "value" text NOT NULL, CONSTRAINT "UQ_a25260d1828a75a47c9f7651871" UNIQUE ("threadId", "category", "value"), CONSTRAINT "UQ_9bcca61906737e8a5b08263eb46" UNIQUE ("threadId", "category", "maskIndex"), CONSTRAINT "PK_4e5c29156ec3aa1ab17f0ccc775" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_297e25137f828aa2d8d10f6d26" ON "thread_pii_masks" ("threadId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "anonymization_whitelist_entries" DROP CONSTRAINT "UQ_398e29bebe8413873fc849a16c4"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."anonymization_whitelist_entries_category_enum" RENAME TO "anonymization_whitelist_entries_category_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."anonymization_whitelist_entries_category_enum" AS ENUM('person_name', 'organization', 'location', 'email_address', 'phone_number', 'url_or_ip', 'date_time', 'financial_account', 'government_id', 'nationality_religion_politics', 'other')`,
    );
    await queryRunner.query(
      `ALTER TABLE "anonymization_whitelist_entries" ALTER COLUMN "category" TYPE "public"."anonymization_whitelist_entries_category_enum" USING "category"::"text"::"public"."anonymization_whitelist_entries_category_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."anonymization_whitelist_entries_category_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "anonymization_whitelist_entries" ADD CONSTRAINT "UQ_398e29bebe8413873fc849a16c4" UNIQUE ("orgId", "category")`,
    );
    await queryRunner.query(
      `ALTER TABLE "thread_pii_masks" ADD CONSTRAINT "FK_297e25137f828aa2d8d10f6d267" FOREIGN KEY ("threadId") REFERENCES "threads"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "thread_pii_masks" DROP CONSTRAINT "FK_297e25137f828aa2d8d10f6d267"`,
    );
    await queryRunner.query(
      `ALTER TABLE "anonymization_whitelist_entries" DROP CONSTRAINT "UQ_398e29bebe8413873fc849a16c4"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."anonymization_whitelist_entries_category_enum_old" AS ENUM('date_time', 'email_address', 'financial_account', 'government_id', 'location', 'nationality_religion_politics', 'organization', 'person_name', 'phone_number', 'url_or_ip')`,
    );
    await queryRunner.query(
      `ALTER TABLE "anonymization_whitelist_entries" ALTER COLUMN "category" TYPE "public"."anonymization_whitelist_entries_category_enum_old" USING "category"::"text"::"public"."anonymization_whitelist_entries_category_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."anonymization_whitelist_entries_category_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."anonymization_whitelist_entries_category_enum_old" RENAME TO "anonymization_whitelist_entries_category_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "anonymization_whitelist_entries" ADD CONSTRAINT "UQ_398e29bebe8413873fc849a16c4" UNIQUE ("orgId", "category")`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_297e25137f828aa2d8d10f6d26"`,
    );
    await queryRunner.query(`DROP TABLE "thread_pii_masks"`);
    await queryRunner.query(
      `DROP TYPE "public"."thread_pii_masks_category_enum"`,
    );
  }
}
