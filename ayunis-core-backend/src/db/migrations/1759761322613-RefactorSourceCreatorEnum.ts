import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorSourceCreatorEnum1759761322613
  implements MigrationInterface
{
  name = 'RefactorSourceCreatorEnum1759761322613';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Create the new enum type
    await queryRunner.query(
      `CREATE TYPE "public"."sources_createdby_enum" AS ENUM('user', 'llm', 'system')`,
    );

    // Step 2: Add the new column with the enum type, default to 'user'
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "createdBy" "public"."sources_createdby_enum" NOT NULL DEFAULT 'user'`,
    );

    // Step 3: Migrate existing data: createdByLLM = true -> 'llm', false -> 'user'
    await queryRunner.query(
      `UPDATE "sources" SET "createdBy" = CASE WHEN "createdByLLM" = true THEN 'llm'::"public"."sources_createdby_enum" ELSE 'user'::"public"."sources_createdby_enum" END`,
    );

    // Step 4: Drop the old boolean column
    await queryRunner.query(`ALTER TABLE "sources" DROP COLUMN "createdByLLM"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add back the boolean column
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "createdByLLM" boolean NOT NULL DEFAULT false`,
    );

    // Step 2: Migrate data back: 'llm' -> true, 'user'/'system' -> false
    await queryRunner.query(
      `UPDATE "sources" SET "createdByLLM" = CASE WHEN "createdBy" = 'llm' THEN true ELSE false END`,
    );

    // Step 3: Drop the enum column
    await queryRunner.query(`ALTER TABLE "sources" DROP COLUMN "createdBy"`);

    // Step 4: Drop the enum type
    await queryRunner.query(`DROP TYPE "public"."sources_createdby_enum"`);
  }
}
