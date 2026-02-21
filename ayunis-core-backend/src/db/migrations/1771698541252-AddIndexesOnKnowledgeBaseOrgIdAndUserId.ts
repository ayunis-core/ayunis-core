import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexesOnKnowledgeBaseOrgIdAndUserId1771698541252
  implements MigrationInterface
{
  name = 'AddIndexesOnKnowledgeBaseOrgIdAndUserId1771698541252';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_da2afb899f6b8b06790e8edd2c" ON "knowledge_bases" ("orgId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e7f0bbc4c652f1c9146114c1b4" ON "knowledge_bases" ("userId") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e7f0bbc4c652f1c9146114c1b4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_da2afb899f6b8b06790e8edd2c"`,
    );
  }
}
