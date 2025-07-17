import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmailConfirmFlag1752676317840 implements MigrationInterface {
    name = 'AddEmailConfirmFlag1752676317840'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_messages_created_at"`);
        await queryRunner.query(`DROP INDEX "public"."idx_messages_thread_created"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "emailVerified" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "emailVerified"`);
        await queryRunner.query(`CREATE INDEX "idx_messages_thread_created" ON "messages" ("createdAt", "threadId") `);
        await queryRunner.query(`CREATE INDEX "idx_messages_created_at" ON "messages" ("createdAt") `);
    }

}
