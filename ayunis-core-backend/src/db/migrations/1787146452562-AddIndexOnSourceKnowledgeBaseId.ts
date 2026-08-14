import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexOnSourceKnowledgeBaseId1787146452562 implements MigrationInterface {
  name = 'AddIndexOnSourceKnowledgeBaseId1787146452562';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_16ddae600230efe98552376f4c" ON "sources" ("knowledgeBaseId") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_16ddae600230efe98552376f4c"`,
    );
  }
}
