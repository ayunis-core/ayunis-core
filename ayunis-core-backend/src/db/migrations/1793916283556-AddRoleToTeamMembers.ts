import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoleToTeamMembers1793916283556 implements MigrationInterface {
  name = 'AddRoleToTeamMembers1793916283556';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."team_members_role_enum" AS ENUM('admin', 'manager', 'user')`,
    );
    await queryRunner.query(
      `ALTER TABLE "team_members" ADD "role" "public"."team_members_role_enum" NOT NULL DEFAULT 'user'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "team_members" DROP COLUMN "role"`);
    await queryRunner.query(`DROP TYPE "public"."team_members_role_enum"`);
  }
}
