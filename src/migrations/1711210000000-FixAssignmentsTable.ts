import { MigrationInterface, QueryRunner } from "typeorm";

export class FixAssignmentsTable1711210000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {

    // 1. file_path
    await queryRunner.query(`
      ALTER TABLE assignments 
      ADD COLUMN IF NOT EXISTS file_path VARCHAR(500)
    `);

    // 2. rating -> numeric(3,1)
    await queryRunner.query(`
      ALTER TABLE assignments 
      ADD COLUMN IF NOT EXISTS rating NUMERIC(3,1)
    `);

    // 3. ai_rating -> numeric(3,1)
    await queryRunner.query(`
      ALTER TABLE assignments 
      ALTER COLUMN ai_rating TYPE NUMERIC(3,1) USING ai_rating::numeric
    `);

    // 4. manual_rating -> numeric(3,1)
    await queryRunner.query(`
      ALTER TABLE assignments 
      ALTER COLUMN manual_rating TYPE NUMERIC(3,1) USING manual_rating::numeric
    `);

    // 5. final_rating -> numeric(3,1)
    await queryRunner.query(`
      ALTER TABLE assignments 
      ALTER COLUMN final_rating TYPE NUMERIC(3,1) USING final_rating::numeric
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE assignments DROP COLUMN IF EXISTS file_path
    `);

    await queryRunner.query(`
      ALTER TABLE assignments DROP COLUMN IF EXISTS rating
    `);

    await queryRunner.query(`
      ALTER TABLE assignments 
      ALTER COLUMN ai_rating TYPE INTEGER USING ai_rating::integer
    `);

    await queryRunner.query(`
      ALTER TABLE assignments 
      ALTER COLUMN manual_rating TYPE INTEGER USING manual_rating::integer
    `);

    await queryRunner.query(`
      ALTER TABLE assignments 
      ALTER COLUMN final_rating TYPE INTEGER USING final_rating::integer
    `);
  }
}
