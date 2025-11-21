import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddRatingColumns1711195000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'assignments',
      new TableColumn({
        name: 'ai_rating',
        type: 'numeric',
        precision: 3,
        scale: 1,
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'assignments',
      new TableColumn({
        name: 'manual_rating',
        type: 'numeric',
        precision: 3,
        scale: 1,
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'assignments',
      new TableColumn({
        name: 'final_rating',
        type: 'numeric',
        precision: 3,
        scale: 1,
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('assignments', 'ai_rating');
    await queryRunner.dropColumn('assignments', 'manual_rating');
    await queryRunner.dropColumn('assignments', 'final_rating');
  }
}
