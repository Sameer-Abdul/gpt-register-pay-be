import { MigrationInterface, QueryRunner } from "typeorm";

export class CompleteSchema9999999999999 implements MigrationInterface {
    name = 'CompleteSchema9999999999999';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enable UUID extension if it doesn't exist
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        // Create register table
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
                "payment_id" uuid UNIQUE,
                "created_at" TIMESTAMP NOT NULL DEFAULT now()
            )
        `);

        // Create payments table
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

        // Add foreign key from payments to register
        await queryRunner.query(`
            ALTER TABLE "payments"
            ADD CONSTRAINT "FK_payment_register"
            FOREIGN KEY ("registrationId")
            REFERENCES "register"("id")
            ON DELETE CASCADE
        `);

        // Add foreign key from register to payments
        await queryRunner.query(`
            ALTER TABLE "register"
            ADD CONSTRAINT "FK_register_payment"
            FOREIGN KEY ("payment_id")
            REFERENCES "payments"("id")
            ON DELETE SET NULL
        `);
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
        await queryRunner.query(`DROP TABLE IF EXISTS "register" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "payments" CASCADE`);
        
        // Drop extension
        await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
    }
}
