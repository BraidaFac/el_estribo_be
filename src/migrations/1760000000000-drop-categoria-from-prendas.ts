import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropCategoriaFromPrendas1760000000000 implements MigrationInterface {
  name = 'DropCategoriaFromPrendas1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      SET @has_sacos_categoria := (
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'sacos'
          AND COLUMN_NAME = 'categoria'
      );
    `);
    await queryRunner.query(`
      SET @drop_sacos_categoria_sql := IF(
        @has_sacos_categoria > 0,
        'ALTER TABLE \`sacos\` DROP COLUMN \`categoria\`',
        'SELECT 1'
      );
    `);
    await queryRunner.query(
      'PREPARE drop_sacos_categoria_stmt FROM @drop_sacos_categoria_sql;',
    );
    await queryRunner.query('EXECUTE drop_sacos_categoria_stmt;');
    await queryRunner.query('DEALLOCATE PREPARE drop_sacos_categoria_stmt;');

    await queryRunner.query(`
      SET @has_pantalones_categoria := (
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'pantalones'
          AND COLUMN_NAME = 'categoria'
      );
    `);
    await queryRunner.query(`
      SET @drop_pantalones_categoria_sql := IF(
        @has_pantalones_categoria > 0,
        'ALTER TABLE \`pantalones\` DROP COLUMN \`categoria\`',
        'SELECT 1'
      );
    `);
    await queryRunner.query(
      'PREPARE drop_pantalones_categoria_stmt FROM @drop_pantalones_categoria_sql;',
    );
    await queryRunner.query('EXECUTE drop_pantalones_categoria_stmt;');
    await queryRunner.query(
      'DEALLOCATE PREPARE drop_pantalones_categoria_stmt;',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      SET @has_sacos_categoria := (
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'sacos'
          AND COLUMN_NAME = 'categoria'
      );
    `);
    await queryRunner.query(`
      SET @add_sacos_categoria_sql := IF(
        @has_sacos_categoria = 0,
        'ALTER TABLE \`sacos\` ADD COLUMN \`categoria\` varchar(40) NULL AFTER \`marca\`',
        'SELECT 1'
      );
    `);
    await queryRunner.query(
      'PREPARE add_sacos_categoria_stmt FROM @add_sacos_categoria_sql;',
    );
    await queryRunner.query('EXECUTE add_sacos_categoria_stmt;');
    await queryRunner.query('DEALLOCATE PREPARE add_sacos_categoria_stmt;');

    await queryRunner.query(`
      SET @has_pantalones_categoria := (
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'pantalones'
          AND COLUMN_NAME = 'categoria'
      );
    `);
    await queryRunner.query(`
      SET @add_pantalones_categoria_sql := IF(
        @has_pantalones_categoria = 0,
        'ALTER TABLE \`pantalones\` ADD COLUMN \`categoria\` varchar(40) NULL AFTER \`marca\`',
        'SELECT 1'
      );
    `);
    await queryRunner.query(
      'PREPARE add_pantalones_categoria_stmt FROM @add_pantalones_categoria_sql;',
    );
    await queryRunner.query('EXECUTE add_pantalones_categoria_stmt;');
    await queryRunner.query(
      'DEALLOCATE PREPARE add_pantalones_categoria_stmt;',
    );
  }
}
