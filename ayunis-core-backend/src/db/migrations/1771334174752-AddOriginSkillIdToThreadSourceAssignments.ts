import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOriginSkillIdToThreadSourceAssignments1771334174752
  implements MigrationInterface
{
  name = 'AddOriginSkillIdToThreadSourceAssignments1771334174752';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "thread_source_assignments" ADD "originSkillId" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7b945db325ac35f59bd8c78b54" ON "thread_source_assignments" ("originSkillId") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7b945db325ac35f59bd8c78b54"`,
    );
    await queryRunner.query(
      `ALTER TABLE "thread_source_assignments" DROP COLUMN "originSkillId"`,
    );
  }
}
