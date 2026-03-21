import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateReservaDatesAndListoTiendaBloqueo1761000000000 implements MigrationInterface {
  name = 'UpdateReservaDatesAndListoTiendaBloqueo1761000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`bloqueos_prenda\`
      MODIFY \`tipo_bloqueo\` enum(
        'MEDICION',
        'RESERVA',
        'MODISTA',
        'LISTO_TIENDA',
        'LAVANDERIA',
        'MANTENIMIENTO',
        'MANUAL'
      ) NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE \`reservas\`
      MODIFY \`cliente_retiro_at\` date NULL,
      MODIFY \`cliente_devolvio_at\` date NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`reservas\`
      MODIFY \`cliente_retiro_at\` timestamp NULL,
      MODIFY \`cliente_devolvio_at\` timestamp NULL
    `);

    await queryRunner.query(`
      ALTER TABLE \`bloqueos_prenda\`
      MODIFY \`tipo_bloqueo\` enum(
        'MEDICION',
        'RESERVA',
        'MODISTA',
        'LAVANDERIA',
        'MANTENIMIENTO',
        'MANUAL'
      ) NOT NULL
    `);
  }
}
