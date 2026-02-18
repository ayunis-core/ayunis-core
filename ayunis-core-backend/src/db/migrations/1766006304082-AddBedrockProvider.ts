import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBedrockProvider1766006304082 implements MigrationInterface {
  name = 'AddBedrockProvider1766006304082';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7c11834d93fa8eaf208a48d66a"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."models_provider_enum" RENAME TO "models_provider_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."models_provider_enum" AS ENUM('openai', 'anthropic', 'bedrock', 'mistral', 'ollama', 'synaforce', 'ayunis', 'otc')`,
    );
    await queryRunner.query(
      `ALTER TABLE "models" ALTER COLUMN "provider" TYPE "public"."models_provider_enum" USING "provider"::"text"::"public"."models_provider_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."models_provider_enum_old"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b0f8b9846a6b4679c2fcdafc09"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."permitted_providers_provider_enum" RENAME TO "permitted_providers_provider_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."permitted_providers_provider_enum" AS ENUM('openai', 'anthropic', 'bedrock', 'mistral', 'ollama', 'synaforce', 'ayunis', 'otc')`,
    );
    await queryRunner.query(
      `ALTER TABLE "permitted_providers" ALTER COLUMN "provider" TYPE "public"."permitted_providers_provider_enum" USING "provider"::"text"::"public"."permitted_providers_provider_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."permitted_providers_provider_enum_old"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a84595aeab2b176022e1ef6b0c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4eca2a1e72564bfdec6c88dcf3"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."usage_provider_enum" RENAME TO "usage_provider_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."usage_provider_enum" AS ENUM('openai', 'anthropic', 'bedrock', 'mistral', 'ollama', 'synaforce', 'ayunis', 'otc')`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage" ALTER COLUMN "provider" TYPE "public"."usage_provider_enum" USING "provider"::"text"::"public"."usage_provider_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."usage_provider_enum_old"`);
    await queryRunner.query(
      `ALTER TYPE "public"."legal_acceptances_modelprovider_enum" RENAME TO "legal_acceptances_modelprovider_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."legal_acceptances_modelprovider_enum" AS ENUM('openai', 'anthropic', 'bedrock', 'mistral', 'ollama', 'synaforce', 'ayunis', 'otc')`,
    );
    await queryRunner.query(
      `ALTER TABLE "legal_acceptances" ALTER COLUMN "modelProvider" TYPE "public"."legal_acceptances_modelprovider_enum" USING "modelProvider"::"text"::"public"."legal_acceptances_modelprovider_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."legal_acceptances_modelprovider_enum_old"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_7c11834d93fa8eaf208a48d66a" ON "models" ("name", "provider") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_b0f8b9846a6b4679c2fcdafc09" ON "permitted_providers" ("orgId", "provider") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a84595aeab2b176022e1ef6b0c" ON "usage" ("organizationId", "provider", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4eca2a1e72564bfdec6c88dcf3" ON "usage" ("provider", "createdAt") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4eca2a1e72564bfdec6c88dcf3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a84595aeab2b176022e1ef6b0c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b0f8b9846a6b4679c2fcdafc09"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7c11834d93fa8eaf208a48d66a"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."legal_acceptances_modelprovider_enum_old" AS ENUM('openai', 'anthropic', 'mistral', 'ollama', 'synaforce', 'ayunis', 'otc')`,
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
      `CREATE TYPE "public"."usage_provider_enum_old" AS ENUM('openai', 'anthropic', 'mistral', 'ollama', 'synaforce', 'ayunis', 'otc')`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage" ALTER COLUMN "provider" TYPE "public"."usage_provider_enum_old" USING "provider"::"text"::"public"."usage_provider_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."usage_provider_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."usage_provider_enum_old" RENAME TO "usage_provider_enum"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4eca2a1e72564bfdec6c88dcf3" ON "usage" ("createdAt", "provider") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a84595aeab2b176022e1ef6b0c" ON "usage" ("createdAt", "organizationId", "provider") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."permitted_providers_provider_enum_old" AS ENUM('openai', 'anthropic', 'mistral', 'ollama', 'synaforce', 'ayunis', 'otc')`,
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
      `CREATE UNIQUE INDEX "IDX_b0f8b9846a6b4679c2fcdafc09" ON "permitted_providers" ("provider", "orgId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."models_provider_enum_old" AS ENUM('openai', 'anthropic', 'mistral', 'ollama', 'synaforce', 'ayunis', 'otc')`,
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
