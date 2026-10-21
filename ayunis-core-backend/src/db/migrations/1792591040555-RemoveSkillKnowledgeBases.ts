import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveSkillKnowledgeBases1792591040555 implements MigrationInterface {
  name = 'RemoveSkillKnowledgeBases1792591040555';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "skill_knowledge_bases"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "skill_knowledge_bases" ("skillsId" character varying NOT NULL, "knowledgeBasesId" character varying NOT NULL, CONSTRAINT "PK_aff430c73f5d25384d854307134" PRIMARY KEY ("skillsId", "knowledgeBasesId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c1ca1820a2d10818eb5f0e5ca8" ON "skill_knowledge_bases" ("skillsId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_27f6c71ffde24fb47e6bc026b7" ON "skill_knowledge_bases" ("knowledgeBasesId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "skill_knowledge_bases" ADD CONSTRAINT "FK_c1ca1820a2d10818eb5f0e5ca8d" FOREIGN KEY ("skillsId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "skill_knowledge_bases" ADD CONSTRAINT "FK_27f6c71ffde24fb47e6bc026b7b" FOREIGN KEY ("knowledgeBasesId") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }
}
