import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgentsToThreads1752004426758 implements MigrationInterface {
  name = 'AddAgentsToThreads1752004426758';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "threads" DROP COLUMN "instruction"`);
    await queryRunner.query(
      `ALTER TABLE "threads" DROP COLUMN "isInternetSearchEnabled"`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" ADD "agentId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" ADD CONSTRAINT "FK_d6f207f7897d73a658b3b7147eb" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "threads" DROP CONSTRAINT "FK_d6f207f7897d73a658b3b7147eb"`,
    );
    await queryRunner.query(`ALTER TABLE "threads" DROP COLUMN "agentId"`);
    await queryRunner.query(
      `ALTER TABLE "threads" ADD "isInternetSearchEnabled" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" ADD "instruction" character varying`,
    );
  }
}
