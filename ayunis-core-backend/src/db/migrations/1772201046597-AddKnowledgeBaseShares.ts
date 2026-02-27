import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKnowledgeBaseShares1772201046597 implements MigrationInterface {
  name = 'AddKnowledgeBaseShares1772201046597';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "shares" ADD "knowledge_base_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "shares" ADD CONSTRAINT "FK_9d58e41ed733832c1feaf146a62" FOREIGN KEY ("knowledge_base_id") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "shares" DROP CONSTRAINT "FK_9d58e41ed733832c1feaf146a62"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shares" DROP COLUMN "knowledge_base_id"`,
    );
  }
}
