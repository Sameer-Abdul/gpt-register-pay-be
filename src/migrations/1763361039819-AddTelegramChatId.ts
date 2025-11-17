import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTelegramChatId1763361039819 implements MigrationInterface {
    name = 'AddTelegramChatId1763361039819';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "register" ADD "telegram_chat_id" character varying`);
        await queryRunner.query(`CREATE INDEX "IDX_register_telegram_chat_id" ON "register" ("telegram_chat_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_register_telegram_chat_id"`);
        await queryRunner.query(`ALTER TABLE "register" DROP COLUMN "telegram_chat_id"`);
    }
}
