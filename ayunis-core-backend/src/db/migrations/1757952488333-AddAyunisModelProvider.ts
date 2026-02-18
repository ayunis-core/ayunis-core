import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAyunisModelProvider1757952488333 implements MigrationInterface {
  name = 'AddAyunisModelProvider1757952488333';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7c11834d93fa8eaf208a48d66a"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."models_provider_enum" RENAME TO "models_provider_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."models_provider_enum" AS ENUM('openai', 'anthropic', 'mistral', 'ollama', 'synaforce', 'ayunis')`,
    );
    await queryRunner.query(
      `ALTER TABLE "models" ALTER COLUMN "provider" TYPE "public"."models_provider_enum" USING "provider"::"text"::"public"."models_provider_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."models_provider_enum_old"`);
    await queryRunner.query(
      `ALTER TYPE "public"."agent_tools_tooltype_enum" RENAME TO "agent_tools_tooltype_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_tools_tooltype_enum" AS ENUM('http', 'source_query', 'internet_search', 'website_content', 'send_email', 'create_calendar_event')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_tools" ALTER COLUMN "toolType" TYPE "public"."agent_tools_tooltype_enum" USING "toolType"::"text"::"public"."agent_tools_tooltype_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."agent_tools_tooltype_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."legal_acceptances_modelprovider_enum" RENAME TO "legal_acceptances_modelprovider_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."legal_acceptances_modelprovider_enum" AS ENUM('openai', 'anthropic', 'mistral', 'ollama', 'synaforce', 'ayunis')`,
    );
    await queryRunner.query(
      `ALTER TABLE "legal_acceptances" ALTER COLUMN "modelProvider" TYPE "public"."legal_acceptances_modelprovider_enum" USING "modelProvider"::"text"::"public"."legal_acceptances_modelprovider_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."legal_acceptances_modelprovider_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."permitted_providers_provider_enum" RENAME TO "permitted_providers_provider_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."permitted_providers_provider_enum" AS ENUM('openai', 'anthropic', 'mistral', 'ollama', 'synaforce', 'ayunis')`,
    );
    await queryRunner.query(
      `ALTER TABLE "permitted_providers" ALTER COLUMN "provider" TYPE "public"."permitted_providers_provider_enum" USING "provider"::"text"::"public"."permitted_providers_provider_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."permitted_providers_provider_enum_old"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_7c11834d93fa8eaf208a48d66a" ON "models" ("name", "provider") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7c11834d93fa8eaf208a48d66a"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."permitted_providers_provider_enum_old" AS ENUM('openai', 'anthropic', 'mistral', 'ollama', 'synaforce')`,
    );
    await queryRunner.query(
      `ALTER TABLE "permitted_providers" ALTER COLUMN "provider" TYPE "public"."permitted_providers_provider_enum_old" USING "provider"::"text"::"public"."permitted_providers_provider_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."permitted_providers_provider_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."permitted_providers_provider_enum_old" RENAME TO "permitted_providers_provider_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."legal_acceptances_modelprovider_enum_old" AS ENUM('openai', 'anthropic', 'mistral', 'ollama', 'synaforce')`,
    );
    await queryRunner.query(
      `ALTER TABLE "legal_acceptances" ALTER COLUMN "modelProvider" TYPE "public"."legal_acceptances_modelprovider_enum_old" USING "modelProvider"::"text"::"public"."legal_acceptances_modelprovider_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."legal_acceptances_modelprovider_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."legal_acceptances_modelprovider_enum_old" RENAME TO "legal_acceptances_modelprovider_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_tools_tooltype_enum_old" AS ENUM('http', 'source_query', 'internet_search', 'website_content', 'send_email')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_tools" ALTER COLUMN "toolType" TYPE "public"."agent_tools_tooltype_enum_old" USING "toolType"::"text"::"public"."agent_tools_tooltype_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."agent_tools_tooltype_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."agent_tools_tooltype_enum_old" RENAME TO "agent_tools_tooltype_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."models_provider_enum_old" AS ENUM('openai', 'anthropic', 'mistral', 'ollama', 'synaforce')`,
    );
    await queryRunner.query(
      `ALTER TABLE "models" ALTER COLUMN "provider" TYPE "public"."models_provider_enum_old" USING "provider"::"text"::"public"."models_provider_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."models_provider_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."models_provider_enum_old" RENAME TO "models_provider_enum"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_7c11834d93fa8eaf208a48d66a" ON "models" ("name", "provider") `,
    );
  }
}
