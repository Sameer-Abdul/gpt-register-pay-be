import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateRelations1762845922474 implements MigrationInterface {
    name = 'UpdateRelations1762845922474'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_payment_register"`);
        await queryRunner.query(`ALTER TABLE "register" DROP CONSTRAINT "FK_register_payment"`);
        await queryRunner.query(`ALTER TABLE "register" DROP CONSTRAINT "fk_register_tenant"`);
        await queryRunner.query(`DROP INDEX "public"."idx_assignments_register_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_assignments_rating"`);
        await queryRunner.query(`DROP INDEX "public"."idx_register_role"`);
        await queryRunner.query(`ALTER TABLE "register" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "register" DROP COLUMN "payment_screenshot_path"`);
        await queryRunner.query(`ALTER TABLE "register" DROP COLUMN "password_hash"`);
        await queryRunner.query(`ALTER TABLE "register" DROP COLUMN "tenant_id"`);
        await queryRunner.query(`ALTER TABLE "register" ADD "password" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "UQ_54dcb35697d6d5825ab61c09d94" UNIQUE ("register_id")`);
        await queryRunner.query(`ALTER TABLE "assignments" DROP CONSTRAINT "assignments_pkey"`);
        await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "assignments" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "assignments" ADD CONSTRAINT "PK_c54ca359535e0012b04dcbd80ee" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN "file_name"`);
        await queryRunner.query(`ALTER TABLE "assignments" ADD "file_name" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "assignments" ALTER COLUMN "file_data" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN "file_type"`);
        await queryRunner.query(`ALTER TABLE "assignments" ADD "file_type" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN "state"`);
        await queryRunner.query(`ALTER TABLE "assignments" ADD "state" character varying`);
        await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN "district"`);
        await queryRunner.query(`ALTER TABLE "assignments" ADD "district" character varying`);
        await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN "mandal"`);
        await queryRunner.query(`ALTER TABLE "assignments" ADD "mandal" character varying`);
        await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN "submission_date"`);
        await queryRunner.query(`ALTER TABLE "assignments" ADD "submission_date" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "assignments" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "register" DROP COLUMN "utr_number"`);
        await queryRunner.query(`ALTER TABLE "register" ADD "utr_number" character varying`);
        await queryRunner.query(`ALTER TABLE "register" DROP COLUMN "role"`);
        await queryRunner.query(`ALTER TABLE "register" ADD "role" character varying NOT NULL DEFAULT 'user'`);
        await queryRunner.query(`ALTER TABLE "register" ALTER COLUMN "is_admin" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_54dcb35697d6d5825ab61c09d94" FOREIGN KEY ("register_id") REFERENCES "register"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "assignments" ADD CONSTRAINT "FK_9d9a8e046de05a9e7ad9f379f56" FOREIGN KEY ("register_id") REFERENCES "register"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "register" ADD CONSTRAINT "FK_8a8a4760c30f2be5f2c6abf3a63" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "register" DROP CONSTRAINT "FK_8a8a4760c30f2be5f2c6abf3a63"`);
        await queryRunner.query(`ALTER TABLE "assignments" DROP CONSTRAINT "FK_9d9a8e046de05a9e7ad9f379f56"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_54dcb35697d6d5825ab61c09d94"`);
        await queryRunner.query(`ALTER TABLE "register" ALTER COLUMN "is_admin" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "register" DROP COLUMN "role"`);
        await queryRunner.query(`ALTER TABLE "register" ADD "role" character varying(20) NOT NULL DEFAULT 'user'`);
        await queryRunner.query(`ALTER TABLE "register" DROP COLUMN "utr_number"`);
        await queryRunner.query(`ALTER TABLE "register" ADD "utr_number" character varying(50)`);
        await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "assignments" ADD "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN "submission_date"`);
        await queryRunner.query(`ALTER TABLE "assignments" ADD "submission_date" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN "mandal"`);
        await queryRunner.query(`ALTER TABLE "assignments" ADD "mandal" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN "district"`);
        await queryRunner.query(`ALTER TABLE "assignments" ADD "district" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN "state"`);
        await queryRunner.query(`ALTER TABLE "assignments" ADD "state" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN "file_type"`);
        await queryRunner.query(`ALTER TABLE "assignments" ADD "file_type" character varying(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "assignments" ALTER COLUMN "file_data" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN "file_name"`);
        await queryRunner.query(`ALTER TABLE "assignments" ADD "file_name" character varying(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "assignments" DROP CONSTRAINT "PK_c54ca359535e0012b04dcbd80ee"`);
        await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "assignments" ADD "id" SERIAL NOT NULL`);
        await queryRunner.query(`ALTER TABLE "assignments" ADD CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "UQ_54dcb35697d6d5825ab61c09d94"`);
        await queryRunner.query(`ALTER TABLE "register" DROP COLUMN "password"`);
        await queryRunner.query(`ALTER TABLE "register" ADD "tenant_id" character varying(20) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "register" ADD "password_hash" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "register" ADD "payment_screenshot_path" text`);
        await queryRunner.query(`ALTER TABLE "register" ADD "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now()`);
        await queryRunner.query(`CREATE INDEX "idx_register_role" ON "register" ("role") `);
        await queryRunner.query(`CREATE INDEX "idx_assignments_rating" ON "assignments" ("rating") `);
        await queryRunner.query(`CREATE INDEX "idx_assignments_register_id" ON "assignments" ("register_id") `);
        await queryRunner.query(`ALTER TABLE "register" ADD CONSTRAINT "fk_register_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenant_master"("tenant_id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "register" ADD CONSTRAINT "FK_register_payment" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_payment_register" FOREIGN KEY ("register_id") REFERENCES "register"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
