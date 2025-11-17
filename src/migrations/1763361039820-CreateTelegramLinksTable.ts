import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTelegramLinksTable1763361039820 implements MigrationInterface {
    name = 'CreateTelegramLinksTable1763361039820'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS telegram_links (
                id SERIAL PRIMARY KEY,
                chat_id BIGINT NOT NULL UNIQUE,
                phone_number VARCHAR(20) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT telegram_links_chat_id_key UNIQUE (chat_id)
            );
            CREATE INDEX IF NOT EXISTS idx_telegram_links_chat_id ON telegram_links(chat_id);
            CREATE INDEX IF NOT EXISTS idx_telegram_links_phone_number ON telegram_links(phone_number);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS telegram_links CASCADE`);
    }
}
