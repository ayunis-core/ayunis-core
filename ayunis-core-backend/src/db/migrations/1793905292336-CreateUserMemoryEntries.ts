import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserMemoryEntries1793905292336 implements MigrationInterface {
  name = 'CreateUserMemoryEntries1793905292336';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_memory_entries" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" character varying NOT NULL, "key" character varying(48) NOT NULL, "content" text NOT NULL, CONSTRAINT "UQ_d170f36b5ffcc1f2216a460bf37" UNIQUE ("userId", "key"), CONSTRAINT "PK_c91533c834c80cdfa9624d5d747" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_memory_entries" ADD CONSTRAINT "FK_c3a66d639485784e5a669e39b1f" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_memory_entries" DROP CONSTRAINT "FK_c3a66d639485784e5a669e39b1f"`,
    );
    await queryRunner.query(`DROP TABLE "user_memory_entries"`);
  }
}
