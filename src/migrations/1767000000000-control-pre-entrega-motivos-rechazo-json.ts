import { MigrationInterface, QueryRunner } from 'typeorm';

export class ControlPreEntregaMotivosRechazoJson1767000000000 implements MigrationInterface {
  name = 'ControlPreEntregaMotivosRechazoJson1767000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Datos de prueba: se eliminan para permitir el cambio de tipo de columna.
    await queryRunner.query(`TRUNCATE TABLE \`control_pre_entrega\``);

    await queryRunner.query(
      `ALTER TABLE \`control_pre_entrega\` DROP COLUMN \`motivo_rechazo\``,
    );

    await queryRunner.query(
      `ALTER TABLE \`control_pre_entrega\` ADD \`motivos_rechazo\` json NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`control_pre_entrega\` DROP COLUMN \`motivos_rechazo\``,
    );

    await queryRunner.query(
      `ALTER TABLE \`control_pre_entrega\` ADD \`motivo_rechazo\` varchar(600) NULL`,
    );
  }
}
