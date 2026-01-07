import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemovePermittedProviders1766053066285
  implements MigrationInterface
{
  name = 'RemovePermittedProviders1766053066285';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop MODEL_PROVIDER legal acceptance column and enum
    await queryRunner.query(
      `ALTER TABLE "legal_acceptances" DROP COLUMN "modelProvider"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."legal_acceptances_modelprovider_enum"`,
    );

    // Drop permitted_providers table
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_b0f8b9846a6b4679c2fcdafc09"`,
    );
    await queryRunner.query(
      `ALTER TABLE "permitted_providers" DROP CONSTRAINT IF EXISTS "FK_f455bd0d37ca348d50271869bf0"`,
    );
    await queryRunner.query(`DROP TABLE "permitted_providers"`);
    await queryRunner.query(
      `DROP TYPE "public"."permitted_providers_provider_enum"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate permitted_providers table
    await queryRunner.query(
      `CREATE TYPE "public"."permitted_providers_provider_enum" AS ENUM('openai', 'anthropic', 'bedrock', 'mistral', 'ollama', 'synaforce', 'ayunis', 'otc')`,
    );
    await queryRunner.query(
      `CREATE TABLE "permitted_providers" ("id" uuid NOT NULL, "provider" "public"."permitted_providers_provider_enum" NOT NULL, "orgId" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_02892ef3b02fe97045c181effb6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "permitted_providers" ADD CONSTRAINT "FK_f455bd0d37ca348d50271869bf0" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_b0f8b9846a6b4679c2fcdafc09" ON "permitted_providers" ("orgId", "provider")`,
    );

    // Recreate MODEL_PROVIDER legal acceptance column
    await queryRunner.query(
      `CREATE TYPE "public"."legal_acceptances_modelprovider_enum" AS ENUM('openai', 'anthropic', 'bedrock', 'mistral', 'ollama', 'synaforce', 'ayunis', 'otc')`,
    );
    await queryRunner.query(
      `ALTER TABLE "legal_acceptances" ADD "modelProvider" "public"."legal_acceptances_modelprovider_enum"`,
    );
  }
}
