import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddModelCostInformation1761732034518
  implements MigrationInterface
{
  name = 'AddModelCostInformation1761732034518';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sources" DROP CONSTRAINT "FK_b8571f7b820de796d0b0cef0e86"`,
    );
    await queryRunner.query(
      `ALTER TABLE "models" DROP COLUMN "costPerInputToken"`,
    );
    await queryRunner.query(
      `ALTER TABLE "models" DROP COLUMN "costPerOutputToken"`,
    );
    await queryRunner.query(`ALTER TABLE "models" DROP COLUMN "costPerToken"`);
    await queryRunner.query(`ALTER TABLE "models" DROP COLUMN "costCurrency"`);
    await queryRunner.query(
      `ALTER TABLE "sources" DROP CONSTRAINT "UQ_b8571f7b820de796d0b0cef0e86"`,
    );
    await queryRunner.query(`ALTER TABLE "sources" DROP COLUMN "sourceId"`);
    await queryRunner.query(
      `ALTER TABLE "models" ADD "inputTokenCost" numeric(10,6)`,
    );
    await queryRunner.query(
      `ALTER TABLE "models" ADD "outputTokenCost" numeric(10,6)`,
    );
    await queryRunner.query(
      `ALTER TABLE "models" ADD "currency" character varying(3)`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_16519322477ef8b09d68ce04889"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP CONSTRAINT "REL_16519322477ef8b09d68ce0488"`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" DROP CONSTRAINT "FK_bd61e255ed429f6f327137c3f69"`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" ALTER COLUMN "sourceId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_16519322477ef8b09d68ce04889" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" ADD CONSTRAINT "FK_bd61e255ed429f6f327137c3f69" FOREIGN KEY ("sourceId") REFERENCES "text_source_details_record"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" DROP CONSTRAINT "FK_bd61e255ed429f6f327137c3f69"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_16519322477ef8b09d68ce04889"`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" ALTER COLUMN "sourceId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" ADD CONSTRAINT "FK_bd61e255ed429f6f327137c3f69" FOREIGN KEY ("sourceId") REFERENCES "text_source_details_record"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD CONSTRAINT "REL_16519322477ef8b09d68ce0488" UNIQUE ("orgId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_16519322477ef8b09d68ce04889" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "models" DROP COLUMN "currency"`);
    await queryRunner.query(
      `ALTER TABLE "models" DROP COLUMN "outputTokenCost"`,
    );
    await queryRunner.query(
      `ALTER TABLE "models" DROP COLUMN "inputTokenCost"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "sourceId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD CONSTRAINT "UQ_b8571f7b820de796d0b0cef0e86" UNIQUE ("sourceId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "models" ADD "costCurrency" character varying(3)`,
    );
    await queryRunner.query(
      `ALTER TABLE "models" ADD "costPerToken" numeric(10,8)`,
    );
    await queryRunner.query(
      `ALTER TABLE "models" ADD "costPerOutputToken" numeric(10,8)`,
    );
    await queryRunner.query(
      `ALTER TABLE "models" ADD "costPerInputToken" numeric(10,8)`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD CONSTRAINT "FK_b8571f7b820de796d0b0cef0e86" FOREIGN KEY ("sourceId") REFERENCES "text_source_details_record"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
