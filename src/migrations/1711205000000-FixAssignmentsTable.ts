import { MigrationInterface, QueryRunner } from "typeorm";

export class FixAssignmentsTable1711205000000 implements MigrationInterface {
  name = "FixAssignmentsTable1711205000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add missing file_path column
    await queryRunner.query(`
      ALTER TABLE assignments
      ADD COLUMN IF NOT EXISTS file_path VARCHAR(500);
    `);

    // Add missing rating column
    await queryRunner.query(`
      ALTER TABLE assignments
      ADD COLUMN IF NOT EXISTS rating numeric(3,1);
    `);

    // Convert ai_rating, manual_rating, final_rating to numeric(3,1)
    await queryRunner.query(`
      ALTER TABLE assignments
      ALTER COLUMN ai_rating TYPE numeric(3,1) USING ai_rating::numeric;
    `);

    await queryRunner.query(`
      ALTER TABLE assignments
      ALTER COLUMN manual_rating TYPE numeric(3,1) USING manual_rating::numeric;
    `);

    await queryRunner.query(`
      ALTER TABLE assignments
      ALTER COLUMN final_rating TYPE numeric(3,1) USING final_rating::numeric;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE assignments DROP COLUMN IF EXISTS file_path`);
    await queryRunner.query(`ALTER TABLE assignments DROP COLUMN IF EXISTS rating`);
    
    await queryRunner.query(`
      ALTER TABLE assignments ALTER COLUMN ai_rating TYPE INTEGER USING ai_rating::integer;
    `);

    await queryRunner.query(`
      ALTER TABLE assignments ALTER COLUMN manual_rating TYPE INTEGER USING manual_rating::integer;
    `);

    await queryRunner.query(`
      ALTER TABLE assignments ALTER COLUMN final_rating TYPE INTEGER USING final_rating::integer;
    `);
  }
}
