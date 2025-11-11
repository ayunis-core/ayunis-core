import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeInviterOptional1762848541370 implements MigrationInterface {
    name = 'MakeInviterOptional1762848541370'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invites" DROP CONSTRAINT "FK_fba2934931761bc4c620e1b180f"`);
        await queryRunner.query(`ALTER TABLE "invites" ADD CONSTRAINT "FK_fba2934931761bc4c620e1b180f" FOREIGN KEY ("inviterId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invites" DROP CONSTRAINT "FK_fba2934931761bc4c620e1b180f"`);
        await queryRunner.query(`ALTER TABLE "invites" ADD CONSTRAINT "FK_fba2934931761bc4c620e1b180f" FOREIGN KEY ("inviterId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
