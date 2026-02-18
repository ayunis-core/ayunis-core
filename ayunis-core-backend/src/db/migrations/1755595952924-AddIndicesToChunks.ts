import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndicesToChunks1755595952924 implements MigrationInterface {
  name = 'AddIndicesToChunks1755595952924';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_288673ba3bd260f9a174c6bb75" ON "child_chunks" ("parentId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e4a9bc2f434203a5250d1be480" ON "parent_chunks" ("relatedDocumentId") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e4a9bc2f434203a5250d1be480"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_288673ba3bd260f9a174c6bb75"`,
    );
  }
}
