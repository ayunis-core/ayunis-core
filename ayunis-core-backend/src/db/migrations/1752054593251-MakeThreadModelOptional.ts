import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeThreadModelOptional1752054593251 implements MigrationInterface {
    name = 'MakeThreadModelOptional1752054593251'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "threads" DROP CONSTRAINT "FK_16a4760316ad946a5b114b27d12"`);
        await queryRunner.query(`ALTER TABLE "threads" ALTER COLUMN "modelId" DROP NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_16a4760316ad946a5b114b27d1" ON "threads" ("modelId") `);
        await queryRunner.query(`CREATE INDEX "IDX_d6f207f7897d73a658b3b7147e" ON "threads" ("agentId") `);
        await queryRunner.query(`ALTER TABLE "threads" ADD CONSTRAINT "FK_16a4760316ad946a5b114b27d12" FOREIGN KEY ("modelId") REFERENCES "permitted_models"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "threads" DROP CONSTRAINT "FK_16a4760316ad946a5b114b27d12"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d6f207f7897d73a658b3b7147e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_16a4760316ad946a5b114b27d1"`);
        await queryRunner.query(`ALTER TABLE "threads" ALTER COLUMN "modelId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "threads" ADD CONSTRAINT "FK_16a4760316ad946a5b114b27d12" FOREIGN KEY ("modelId") REFERENCES "permitted_models"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
