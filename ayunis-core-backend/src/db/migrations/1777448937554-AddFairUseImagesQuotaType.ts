import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFairUseImagesQuotaType1777448937554 implements MigrationInterface {
    name = 'AddFairUseImagesQuotaType1777448937554'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_394fe814ce4a600f6a08311199"`);
        await queryRunner.query(`ALTER TABLE "usage_quotas" DROP CONSTRAINT "UQ_394fe814ce4a600f6a083111998"`);
        await queryRunner.query(`ALTER TYPE "public"."usage_quotas_quotatype_enum" RENAME TO "usage_quotas_quotatype_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."usage_quotas_quotatype_enum" AS ENUM('FAIR_USE_MESSAGES_LOW', 'FAIR_USE_MESSAGES_MEDIUM', 'FAIR_USE_MESSAGES_HIGH', 'FAIR_USE_IMAGES')`);
        await queryRunner.query(`ALTER TABLE "usage_quotas" ALTER COLUMN "quotaType" TYPE "public"."usage_quotas_quotatype_enum" USING "quotaType"::"text"::"public"."usage_quotas_quotatype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."usage_quotas_quotatype_enum_old"`);
        await queryRunner.query(`CREATE INDEX "IDX_394fe814ce4a600f6a08311199" ON "usage_quotas" ("userId", "quotaType") `);
        await queryRunner.query(`ALTER TABLE "usage_quotas" ADD CONSTRAINT "UQ_394fe814ce4a600f6a083111998" UNIQUE ("userId", "quotaType")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "usage_quotas" DROP CONSTRAINT "UQ_394fe814ce4a600f6a083111998"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_394fe814ce4a600f6a08311199"`);
        await queryRunner.query(`DELETE FROM "usage_quotas" WHERE "quotaType" = 'FAIR_USE_IMAGES'`);
        await queryRunner.query(`CREATE TYPE "public"."usage_quotas_quotatype_enum_old" AS ENUM('FAIR_USE_MESSAGES_HIGH', 'FAIR_USE_MESSAGES_LOW', 'FAIR_USE_MESSAGES_MEDIUM')`);
        await queryRunner.query(`ALTER TABLE "usage_quotas" ALTER COLUMN "quotaType" TYPE "public"."usage_quotas_quotatype_enum_old" USING "quotaType"::"text"::"public"."usage_quotas_quotatype_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."usage_quotas_quotatype_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."usage_quotas_quotatype_enum_old" RENAME TO "usage_quotas_quotatype_enum"`);
        await queryRunner.query(`ALTER TABLE "usage_quotas" ADD CONSTRAINT "UQ_394fe814ce4a600f6a083111998" UNIQUE ("userId", "quotaType")`);
        await queryRunner.query(`CREATE INDEX "IDX_394fe814ce4a600f6a08311199" ON "usage_quotas" ("userId", "quotaType") `);
    }

}
