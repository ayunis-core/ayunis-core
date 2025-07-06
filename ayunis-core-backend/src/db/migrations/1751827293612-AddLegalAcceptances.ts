import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLegalAcceptances1751827293612 implements MigrationInterface {
    name = 'AddLegalAcceptances1751827293612'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."legal_acceptances_modelprovider_enum" AS ENUM('openai', 'anthropic', 'mistral')`);
        await queryRunner.query(`CREATE TABLE "legal_acceptances" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "version" character varying NOT NULL, "userId" character varying NOT NULL, "orgId" character varying NOT NULL, "type" character varying NOT NULL, "modelProvider" "public"."legal_acceptances_modelprovider_enum", CONSTRAINT "PK_80ba27e822e932eceb3b0640983" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f62debcd26469d1afe5e4dff49" ON "legal_acceptances" ("type") `);
        await queryRunner.query(`DROP INDEX "public"."IDX_7c11834d93fa8eaf208a48d66a"`);
        await queryRunner.query(`ALTER TYPE "public"."models_provider_enum" RENAME TO "models_provider_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."models_provider_enum" AS ENUM('openai', 'anthropic', 'mistral')`);
        await queryRunner.query(`ALTER TABLE "models" ALTER COLUMN "provider" TYPE "public"."models_provider_enum" USING "provider"::"text"::"public"."models_provider_enum"`);
        await queryRunner.query(`DROP TYPE "public"."models_provider_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."permitted_providers_provider_enum" RENAME TO "permitted_providers_provider_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."permitted_providers_provider_enum" AS ENUM('openai', 'anthropic', 'mistral')`);
        await queryRunner.query(`ALTER TABLE "permitted_providers" ALTER COLUMN "provider" TYPE "public"."permitted_providers_provider_enum" USING "provider"::"text"::"public"."permitted_providers_provider_enum"`);
        await queryRunner.query(`DROP TYPE "public"."permitted_providers_provider_enum_old"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_7c11834d93fa8eaf208a48d66a" ON "models" ("name", "provider") `);
        await queryRunner.query(`ALTER TABLE "legal_acceptances" ADD CONSTRAINT "FK_9a4e88eb711d5e3395d45a9feb1" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "legal_acceptances" ADD CONSTRAINT "FK_6c761f5968c323c7c348628093c" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "legal_acceptances" DROP CONSTRAINT "FK_6c761f5968c323c7c348628093c"`);
        await queryRunner.query(`ALTER TABLE "legal_acceptances" DROP CONSTRAINT "FK_9a4e88eb711d5e3395d45a9feb1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7c11834d93fa8eaf208a48d66a"`);
        await queryRunner.query(`CREATE TYPE "public"."permitted_providers_provider_enum_old" AS ENUM('openai', 'anthropic', 'mistral', 'microsoft', 'ollama')`);
        await queryRunner.query(`ALTER TABLE "permitted_providers" ALTER COLUMN "provider" TYPE "public"."permitted_providers_provider_enum_old" USING "provider"::"text"::"public"."permitted_providers_provider_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."permitted_providers_provider_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."permitted_providers_provider_enum_old" RENAME TO "permitted_providers_provider_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."models_provider_enum_old" AS ENUM('openai', 'anthropic', 'mistral', 'microsoft', 'ollama')`);
        await queryRunner.query(`ALTER TABLE "models" ALTER COLUMN "provider" TYPE "public"."models_provider_enum_old" USING "provider"::"text"::"public"."models_provider_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."models_provider_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."models_provider_enum_old" RENAME TO "models_provider_enum"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_7c11834d93fa8eaf208a48d66a" ON "models" ("name", "provider") `);
        await queryRunner.query(`DROP INDEX "public"."IDX_f62debcd26469d1afe5e4dff49"`);
        await queryRunner.query(`DROP TABLE "legal_acceptances"`);
        await queryRunner.query(`DROP TYPE "public"."legal_acceptances_modelprovider_enum"`);
    }

}
