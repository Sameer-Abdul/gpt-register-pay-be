import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatePaymentColumns1710150000001 implements MigrationInterface {
    name = 'UpdatePaymentColumns1710150000001';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // First, drop the foreign key constraint if it exists
        await queryRunner.query(`
            ALTER TABLE "payments" 
            DROP CONSTRAINT IF EXISTS "FK_476db4d7a6da8e1ec5b5c2c9e7c"
        `);

        // Rename columns to match the entity
        await queryRunner.query(`ALTER TABLE "payments" RENAME COLUMN "utr_number" TO "utrNumber"`);
        await queryRunner.query(`ALTER TABLE "payments" RENAME COLUMN "screenshot_path" TO "screenshotPath"`);
        await queryRunner.query(`ALTER TABLE "payments" RENAME COLUMN "screenshot_mime_type" TO "screenshotMimeType"`);
        await queryRunner.query(`ALTER TABLE "payments" RENAME COLUMN "original_filename" TO "originalFilename"`);
        await queryRunner.query(`ALTER TABLE "payments" RENAME COLUMN "file_size" TO "fileSize"`);
        
        // Recreate the foreign key constraint
        await queryRunner.query(`
            ALTER TABLE "payments" 
            ADD CONSTRAINT "FK_register_payment" 
            FOREIGN KEY ("register_id") 
            REFERENCES "register"("id") 
            ON DELETE CASCADE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop the foreign key constraint
        await queryRunner.query(`
            ALTER TABLE "payments" 
            DROP CONSTRAINT IF EXISTS "FK_register_payment"
        `);

        // Revert column names
        await queryRunner.query(`ALTER TABLE "payments" RENAME COLUMN "utrNumber" TO "utr_number"`);
        await queryRunner.query(`ALTER TABLE "payments" RENAME COLUMN "screenshotPath" TO "screenshot_path"`);
        await queryRunner.query(`ALTER TABLE "payments" RENAME COLUMN "screenshotMimeType" TO "screenshot_mime_type"`);
        await queryRunner.query(`ALTER TABLE "payments" RENAME COLUMN "originalFilename" TO "original_filename"`);
        await queryRunner.query(`ALTER TABLE "payments" RENAME COLUMN "fileSize" TO "file_size"`);
    }
}
