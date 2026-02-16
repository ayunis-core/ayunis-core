import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSkillShares1771247112948 implements MigrationInterface {
  name = 'AddSkillShares1771247112948';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "shares" ADD "skill_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "shares" ADD CONSTRAINT "FK_cc15040a7ba74c2ac60a698df8f" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "shares" DROP CONSTRAINT "FK_cc15040a7ba74c2ac60a698df8f"`,
    );
    await queryRunner.query(`ALTER TABLE "shares" DROP COLUMN "skill_id"`);
  }
}
