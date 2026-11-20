import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMcpConnectionObservations1794823952576 implements MigrationInterface {
  name = 'AddMcpConnectionObservations1794823952576';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "mcp_connection_observations" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "integration_id" character varying NOT NULL, "user_id" character varying NOT NULL, "revision" character varying NOT NULL, "startedAt" TIMESTAMP NOT NULL, "checkedAt" TIMESTAMP NOT NULL, "failure" character varying, CONSTRAINT "UQ_21891d343ea7ac92fa8aa0f043e" UNIQUE ("integration_id", "user_id"), CONSTRAINT "PK_5ef36e6d066c160d9618303ffb5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_connection_observations" ADD CONSTRAINT "FK_fd0f82a8d7e965e3da6f01922ee" FOREIGN KEY ("integration_id") REFERENCES "mcp_integrations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_connection_observations" ADD CONSTRAINT "FK_d5fed8526f792d90c1f1eaa1fa6" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mcp_connection_observations" DROP CONSTRAINT "FK_d5fed8526f792d90c1f1eaa1fa6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_connection_observations" DROP CONSTRAINT "FK_fd0f82a8d7e965e3da6f01922ee"`,
    );
    await queryRunner.query(`DROP TABLE "mcp_connection_observations"`);
  }
}
