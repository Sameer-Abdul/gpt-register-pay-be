import { MigrationInterface, QueryRunner } from "typeorm";

export class FixRatings1711199000000 implements MigrationInterface {
  name = 'FixRatings1711199000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN IF EXISTS "rating"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "assignments" ADD "rating" numeric(3,1)`);
  }
}
