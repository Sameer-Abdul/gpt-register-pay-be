import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1710150000000 implements MigrationInterface {
    name = 'InitialSchema1710150000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create the register table if it doesn't exist
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "register" (
                "id" SERIAL PRIMARY KEY,
                "first_name" character varying NOT NULL,
                "middle_name" character varying,
                "last_name" character varying NOT NULL,
                "mobile_no" character varying NOT NULL,
                "email" character varying NOT NULL UNIQUE,
                "marital_status" character varying NOT NULL,
                "marriage_date" timestamp with time zone,
                "address" text NOT NULL,
                "gender" character varying NOT NULL,
                "course" character varying NOT NULL DEFAULT 'Award Nomination',
                "state" character varying NOT NULL,
                "district" character varying NOT NULL,
                "mandal" character varying NOT NULL,
                "designation" character varying NOT NULL,
                "highest_class_i_teach" character varying NOT NULL,
                "school_correspondent_name" character varying NOT NULL,
                "school_correspondent_phone" character varying NOT NULL,
                "school_correspondent_email" character varying NOT NULL,
                "utr_number" character varying(50),
                "payment_screenshot" bytea,
                "screenshot_mime_type" character varying,
                "payment_id" uuid,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_register_payment_id" UNIQUE ("payment_id")
            )
        `);

        // Create the payments table if it doesn't exist
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "payments" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "utrNumber" character varying(50) NOT NULL,
                "screenshotPath" character varying,
                "screenshotMimeType" character varying,
                "originalFilename" character varying,
                "fileSize" integer,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "registrationId" integer
            )
        `);

        // Add foreign key constraint from payments to register
        await queryRunner.query(`
            ALTER TABLE "payments"
            ADD CONSTRAINT "FK_payment_register"
            FOREIGN KEY ("registrationId")
            REFERENCES "register"("id")
            ON DELETE CASCADE
        `);

        // Add foreign key constraint from register to payments
        // This is now handled by the column definition with REFERENCES
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraints first
        await queryRunner.query(`
            ALTER TABLE "register"
            DROP CONSTRAINT IF EXISTS "FK_register_payment"
        `);

        await queryRunner.query(`
            ALTER TABLE "payments"
            DROP CONSTRAINT IF EXISTS "FK_payment_register"
        `);

        // Drop tables
        await queryRunner.query(`DROP TABLE IF EXISTS "register"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "payments"`);
    }
}
