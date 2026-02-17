import { MigrationInterface, QueryRunner } from 'typeorm';

export class MoveMarketplaceIdentifierFromAgentsToSkills1771330643208
  implements MigrationInterface
{
  name = 'MoveMarketplaceIdentifierFromAgentsToSkills1771330643208';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "agents" DROP COLUMN "marketplaceIdentifier"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD "marketplaceIdentifier" character varying(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "skills" DROP COLUMN "marketplaceIdentifier"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agents" ADD "marketplaceIdentifier" character varying(255)`,
    );
  }
}
