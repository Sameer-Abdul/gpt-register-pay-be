import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPaymentFieldsToRegister1710150000000 implements MigrationInterface {
    name = 'AddPaymentFieldsToRegister1710150000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "register" ADD "utr_number" character varying(50)`);
        await queryRunner.query(`ALTER TABLE "register" ADD "payment_screenshot" bytea`);
        await queryRunner.query(`ALTER TABLE "register" ADD "screenshot_mime_type" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "register" DROP COLUMN "screenshot_mime_type"`);
        await queryRunner.query(`ALTER TABLE "register" DROP COLUMN "payment_screenshot"`);
        await queryRunner.query(`ALTER TABLE "register" DROP COLUMN "utr_number"`);
    }
}
