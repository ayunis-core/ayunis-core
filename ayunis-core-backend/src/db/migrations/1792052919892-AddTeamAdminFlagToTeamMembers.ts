import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTeamAdminFlagToTeamMembers1792052919892 implements MigrationInterface {
  name = 'AddTeamAdminFlagToTeamMembers1792052919892';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "team_members" ADD "is_team_admin" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "team_members" DROP COLUMN "is_team_admin"`,
    );
  }
}
