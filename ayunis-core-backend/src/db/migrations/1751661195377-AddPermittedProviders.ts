import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPermittedProviders1751661195377 implements MigrationInterface {
    name = 'AddPermittedProviders1751661195377'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."permitted_providers_provider_enum" AS ENUM('openai', 'anthropic', 'mistral', 'microsoft', 'ollama')`);
        await queryRunner.query(`CREATE TABLE "permitted_providers" ("provider" "public"."permitted_providers_provider_enum" NOT NULL, "orgId" character varying NOT NULL, CONSTRAINT "PK_1da22e3e2c4bbfbd9f805bc4377" PRIMARY KEY ("provider"))`);
        await queryRunner.query(`ALTER TABLE "permitted_providers" ADD CONSTRAINT "FK_f455bd0d37ca348d50271869bf0" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "permitted_providers" DROP CONSTRAINT "FK_f455bd0d37ca348d50271869bf0"`);
        await queryRunner.query(`DROP TABLE "permitted_providers"`);
        await queryRunner.query(`DROP TYPE "public"."permitted_providers_provider_enum"`);
    }

}
