import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScalewayToModelProviderEnum1772115093760
  implements MigrationInterface
{
  name = 'AddScalewayToModelProviderEnum1772115093760';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7c11834d93fa8eaf208a48d66a"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."models_provider_enum" RENAME TO "models_provider_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."models_provider_enum" AS ENUM('openai', 'anthropic', 'bedrock', 'mistral', 'ollama', 'synaforce', 'ayunis', 'otc', 'azure', 'gemini', 'stackit', 'scaleway')`,
    );
    await queryRunner.query(
      `ALTER TABLE "models" ALTER COLUMN "provider" TYPE "public"."models_provider_enum" USING "provider"::"text"::"public"."models_provider_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."models_provider_enum_old"`);
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
      `CREATE TYPE "public"."usage_provider_enum" AS ENUM('openai', 'anthropic', 'bedrock', 'mistral', 'ollama', 'synaforce', 'ayunis', 'otc', 'azure', 'gemini', 'stackit', 'scaleway')`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage" ALTER COLUMN "provider" TYPE "public"."usage_provider_enum" USING "provider"::"text"::"public"."usage_provider_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."usage_provider_enum_old"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_7c11834d93fa8eaf208a48d66a" ON "models" ("name", "provider") `,
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
      `DROP INDEX "public"."IDX_7c11834d93fa8eaf208a48d66a"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."usage_provider_enum_old" AS ENUM('anthropic', 'ayunis', 'azure', 'bedrock', 'gemini', 'mistral', 'ollama', 'openai', 'otc', 'stackit', 'synaforce')`,
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
      `CREATE TYPE "public"."models_provider_enum_old" AS ENUM('anthropic', 'ayunis', 'azure', 'bedrock', 'gemini', 'mistral', 'ollama', 'openai', 'otc', 'stackit', 'synaforce')`,
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
