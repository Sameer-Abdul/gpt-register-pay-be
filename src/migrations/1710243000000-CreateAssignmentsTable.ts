import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAssignmentsTable1710243000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id SERIAL PRIMARY KEY,
        register_id INTEGER NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        rating DECIMAL(3,1),
        state VARCHAR(100),
        district VARCHAR(100),
        mandal VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add sample data for testing
    await queryRunner.query(`
      INSERT INTO assignments (register_id, file_name, rating, state, district, mandal)
      VALUES 
        (1, 'assignment1.pdf', 9.5, 'Telangana', 'Hyderabad', 'Shaikpet'),
        (2, 'assignment2.pdf', 9.0, 'Telangana', 'Rangareddy', 'Ameerpet'),
        (3, 'assignment3.pdf', 8.5, 'Andhra Pradesh', 'Guntur', 'Mangalagiri'),
        (4, 'assignment4.pdf', 9.8, 'Telangana', 'Hyderabad', 'Jubilee Hills'),
        (5, 'assignment5.pdf', 8.0, 'Karnataka', 'Bangalore', 'Whitefield');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS assignments;`);
  }
}
