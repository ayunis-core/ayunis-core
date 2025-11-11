import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSuperAdmin1762850230665 implements MigrationInterface {
    name = 'AddSuperAdmin1762850230665'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."users_systemrole_enum" AS ENUM('customer', 'super_admin')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "systemRole" "public"."users_systemrole_enum" NOT NULL DEFAULT 'customer'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "systemRole"`);
        await queryRunner.query(`DROP TYPE "public"."users_systemrole_enum"`);
    }

}
