import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMarriageDateToRegister1762162598031 implements MigrationInterface {
    name = 'AddMarriageDateToRegister1762162598031'
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE register 
            ADD COLUMN IF NOT EXISTS marriage_date TIMESTAMP WITH TIME ZONE;
        `);
    }


    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE register 
            DROP COLUMN IF EXISTS marriage_date;
        `);
    }

}
