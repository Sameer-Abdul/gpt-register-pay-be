import { MigrationInterface, QueryRunner } from "typeorm";

export class FixRelations1710150000003 implements MigrationInterface {
    name = 'FixRelations1710150000003';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Drop existing foreign key constraints if they exist
        await queryRunner.query(`
            ALTER TABLE "payments" 
            DROP CONSTRAINT IF EXISTS "FK_register_payment"
        `);

        // 2. Update the payments table to match the entity
        // Add registrationId column if it doesn't exist
        await queryRunner.query(`
            ALTER TABLE "payments" 
            ADD COLUMN IF NOT EXISTS "registrationId" integer
        `);

        // 3. Update the register table to have a proper relationship with payments
        // Add paymentId column if it doesn't exist
        await queryRunner.query(`
            ALTER TABLE "register"
            ADD COLUMN IF NOT EXISTS "paymentId" uuid
        `);

        // 4. Create the foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "payments"
            ADD CONSTRAINT "FK_payment_register"
            FOREIGN KEY ("registrationId")
            REFERENCES "register"("id")
            ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE "register"
            ADD CONSTRAINT "FK_register_payment"
            FOREIGN KEY ("paymentId")
            REFERENCES "payments"("id")
            ON DELETE SET NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop the foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "register"
            DROP CONSTRAINT IF EXISTS "FK_register_payment"
        `);

        await queryRunner.query(`
            ALTER TABLE "payments"
            DROP CONSTRAINT IF EXISTS "FK_payment_register"
        `);

        // Remove the columns if they exist
        await queryRunner.query(`
            ALTER TABLE "register"
            DROP COLUMN IF EXISTS "paymentId"
        `);

        await queryRunner.query(`
            ALTER TABLE "payments"
            DROP COLUMN IF EXISTS "registrationId"
        `);
    }
}
