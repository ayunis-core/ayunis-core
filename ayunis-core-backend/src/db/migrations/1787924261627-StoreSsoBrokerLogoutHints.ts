import type { MigrationInterface, QueryRunner } from 'typeorm';

export class StoreSsoBrokerLogoutHints1787924261627 implements MigrationInterface {
  name = 'StoreSsoBrokerLogoutHints1787924261627';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "sso_broker_sessions" ("user_id" character varying NOT NULL, "zitadel_session_id" character varying(255) NOT NULL, "encrypted_id_token" text NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3c542008d69f99572cace5a3d56" PRIMARY KEY ("zitadel_session_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_17489741e91553ab6bebb0da51" ON "sso_broker_sessions" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_695d360487cd61d23c8a2a0532" ON "sso_broker_sessions" ("expires_at") `,
    );
    await queryRunner.query(
      `ALTER TABLE "sso_broker_sessions" ADD CONSTRAINT "FK_17489741e91553ab6bebb0da514" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sso_broker_sessions" DROP CONSTRAINT "FK_17489741e91553ab6bebb0da514"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_695d360487cd61d23c8a2a0532"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_17489741e91553ab6bebb0da51"`,
    );
    await queryRunner.query(`DROP TABLE "sso_broker_sessions"`);
  }
}
