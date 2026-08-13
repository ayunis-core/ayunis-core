import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexOnUsersOrgId1786648070178 implements MigrationInterface {
  name = 'AddIndexOnUsersOrgId1786648070178';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_1890588e47e133fd85670f187d" ON "users" ("orgId") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1890588e47e133fd85670f187d"`,
    );
  }
}
