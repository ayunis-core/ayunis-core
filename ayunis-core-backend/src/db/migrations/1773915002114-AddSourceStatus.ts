import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSourceStatus1773915002114 implements MigrationInterface {
    name = 'AddSourceStatus1773915002114'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."sources_status_enum" AS ENUM('processing', 'ready', 'failed')`);
        await queryRunner.query(`ALTER TABLE "sources" ADD "status" "public"."sources_status_enum" NOT NULL DEFAULT 'ready'`);
        await queryRunner.query(`ALTER TABLE "sources" ADD "processingError" text`);
        await queryRunner.query(`ALTER TABLE "sources" ADD "processingStartedAt" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sources" DROP COLUMN "processingStartedAt"`);
        await queryRunner.query(`ALTER TABLE "sources" DROP COLUMN "processingError"`);
        await queryRunner.query(`ALTER TABLE "sources" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."sources_status_enum"`);
    }

}
