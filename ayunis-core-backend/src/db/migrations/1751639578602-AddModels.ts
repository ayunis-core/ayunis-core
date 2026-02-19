import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddModels1751639578602 implements MigrationInterface {
  name = 'AddModels1751639578602';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."models_provider_enum" AS ENUM('openai', 'anthropic', 'mistral', 'microsoft', 'ollama')`,
    );
    await queryRunner.query(
      `CREATE TABLE "models" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "provider" "public"."models_provider_enum" NOT NULL, "displayName" character varying NOT NULL, "canStream" boolean NOT NULL DEFAULT false, "isReasoning" boolean NOT NULL DEFAULT false, "isArchived" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_ef9ed7160ea69013636466bf2d5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_7c11834d93fa8eaf208a48d66a" ON "models" ("name", "provider") `,
    );
    await queryRunner.query(
      `ALTER TABLE "permitted_models" DROP COLUMN "provider"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."permitted_models_provider_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "permitted_models" DROP COLUMN "name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "permitted_models" ADD "modelId" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "permitted_models" ADD CONSTRAINT "FK_beb4b97081716f3400a91d0c6da" FOREIGN KEY ("modelId") REFERENCES "models"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "permitted_models" DROP CONSTRAINT "FK_beb4b97081716f3400a91d0c6da"`,
    );
    await queryRunner.query(
      `ALTER TABLE "permitted_models" DROP COLUMN "modelId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "permitted_models" ADD "name" character varying NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."permitted_models_provider_enum" AS ENUM('openai', 'anthropic', 'mistral', 'microsoft', 'ollama')`,
    );
    await queryRunner.query(
      `ALTER TABLE "permitted_models" ADD "provider" "public"."permitted_models_provider_enum" NOT NULL`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7c11834d93fa8eaf208a48d66a"`,
    );
    await queryRunner.query(`DROP TABLE "models"`);
    await queryRunner.query(`DROP TYPE "public"."models_provider_enum"`);
  }
}
