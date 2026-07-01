import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrgCascadeToConversationKbMcpData1782922618870 implements MigrationInterface {
  name = 'AddOrgCascadeToConversationKbMcpData1782922618870';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sources" DROP CONSTRAINT "FK_16ddae600230efe98552376f4c7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" ADD CONSTRAINT "FK_da2afb899f6b8b06790e8edd2c3" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD CONSTRAINT "FK_16ddae600230efe98552376f4c7" FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD CONSTRAINT "FK_838e2ec7815ea042ef12042d786" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" ADD CONSTRAINT "FK_256dd2e4946d6768c5583caa072" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "threads" DROP CONSTRAINT "FK_256dd2e4946d6768c5583caa072"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP CONSTRAINT "FK_838e2ec7815ea042ef12042d786"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" DROP CONSTRAINT "FK_16ddae600230efe98552376f4c7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" DROP CONSTRAINT "FK_da2afb899f6b8b06790e8edd2c3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD CONSTRAINT "FK_16ddae600230efe98552376f4c7" FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }
}
