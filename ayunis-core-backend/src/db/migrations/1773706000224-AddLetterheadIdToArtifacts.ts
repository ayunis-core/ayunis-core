import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLetterheadIdToArtifacts1773706000224 implements MigrationInterface {
    name = 'AddLetterheadIdToArtifacts1773706000224'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "artifacts" ADD "letterheadId" character varying`);
        await queryRunner.query(`CREATE INDEX "IDX_ab4dde61f4eb04ba072c26a5a2" ON "artifacts" ("letterheadId") `);
        await queryRunner.query(`ALTER TABLE "artifacts" ADD CONSTRAINT "FK_ab4dde61f4eb04ba072c26a5a2c" FOREIGN KEY ("letterheadId") REFERENCES "letterheads"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "artifacts" DROP CONSTRAINT "FK_ab4dde61f4eb04ba072c26a5a2c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ab4dde61f4eb04ba072c26a5a2"`);
        await queryRunner.query(`ALTER TABLE "artifacts" DROP COLUMN "letterheadId"`);
    }

}
