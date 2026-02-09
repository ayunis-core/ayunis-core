import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMarketplaceSlugToAgents1770650039552 implements MigrationInterface {
    name = 'AddMarketplaceSlugToAgents1770650039552'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "agents" ADD "marketplaceIdentifier" character varying(255)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "agents" DROP COLUMN "marketplaceIdentifier"`);
    }

}
