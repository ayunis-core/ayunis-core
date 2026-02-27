import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKnowledgeBaseShares1772250000000 implements MigrationInterface {
  name = 'AddKnowledgeBaseShares1772250000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "shares" ADD "knowledge_base_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "shares" ADD CONSTRAINT "FK_shares_knowledge_base_id" FOREIGN KEY ("knowledge_base_id") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "shares" DROP CONSTRAINT "FK_shares_knowledge_base_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shares" DROP COLUMN "knowledge_base_id"`,
    );
  }
}
