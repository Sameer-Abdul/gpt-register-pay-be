import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateRelations1710150000002 implements MigrationInterface {
    name = 'UpdateRelations1710150000002';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop existing foreign key constraints if they exist
        await queryRunner.query(`
            ALTER TABLE "payments" 
            DROP CONSTRAINT IF EXISTS "FK_register_payment"
        `);

        // Update the payments table to match the entity
        await queryRunner.query(`
            ALTER TABLE "payments" 
            ADD COLUMN IF NOT EXISTS "registrationId" integer,
            ADD CONSTRAINT "FK_payment_register" 
            FOREIGN KEY ("registrationId") 
            REFERENCES "register"("id") 
            ON DELETE CASCADE
        `);

        // Update the register table to have a proper relationship with payments
        await queryRunner.query(`
            ALTER TABLE "register"
            ADD COLUMN IF NOT EXISTS "paymentId" uuid,
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
