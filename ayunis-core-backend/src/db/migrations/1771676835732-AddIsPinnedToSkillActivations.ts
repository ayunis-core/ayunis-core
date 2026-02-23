import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsPinnedToSkillActivations1771676835732 implements MigrationInterface {
    name = 'AddIsPinnedToSkillActivations1771676835732'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "skill_activations" ADD "isPinned" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "skill_activations" DROP COLUMN "isPinned"`);
    }

}
