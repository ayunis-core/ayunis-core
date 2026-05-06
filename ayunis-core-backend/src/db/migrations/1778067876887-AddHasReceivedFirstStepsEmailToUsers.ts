import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHasReceivedFirstStepsEmailToUsers1778067876887 implements MigrationInterface {
    name = 'AddHasReceivedFirstStepsEmailToUsers1778067876887'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "hasReceivedFirstStepsEmail" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "hasReceivedFirstStepsEmail"`);
    }

}
