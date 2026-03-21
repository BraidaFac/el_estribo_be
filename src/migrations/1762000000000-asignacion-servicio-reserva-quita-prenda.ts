import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Crea asignaciones_servicio_reserva, migra datos desde sacos/pantalones/reservas,
 * elimina FK de lavandería/modista en sacos, pantalones y reservas.
 */
export class AsignacionServicioReservaQuitaPrenda1762000000000
  implements MigrationInterface
{
  name = 'AsignacionServicioReservaQuitaPrenda1762000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`asignaciones_servicio_reserva\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`reserva_id\` int NOT NULL,
        \`tipo_prenda\` enum('SACO','PANTALON') NOT NULL,
        \`lavanderia_id\` int NULL,
        \`modista_id\` int NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_asignacion_reserva_prenda\` (\`reserva_id\`, \`tipo_prenda\`),
        KEY \`FK_asign_lav\` (\`lavanderia_id\`),
        KEY \`FK_asign_mod\` (\`modista_id\`),
        KEY \`IDX_asignacion_reserva_id\` (\`reserva_id\`),
        CONSTRAINT \`FK_asign_reserva\` FOREIGN KEY (\`reserva_id\`) REFERENCES \`reservas\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_asign_lavanderia\` FOREIGN KEY (\`lavanderia_id\`) REFERENCES \`lavanderias\` (\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`FK_asign_modista\` FOREIGN KEY (\`modista_id\`) REFERENCES \`modistas\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      INSERT IGNORE INTO \`asignaciones_servicio_reserva\`
        (\`reserva_id\`, \`tipo_prenda\`, \`lavanderia_id\`, \`modista_id\`, \`created_at\`, \`updated_at\`)
      SELECT r.\`id\`, 'SACO', s.\`lavanderia_id\`, s.\`modista_id\`, NOW(6), NOW(6)
      FROM \`reservas\` r
      INNER JOIN \`sacos\` s ON s.\`id\` = r.\`saco_id\`
      WHERE s.\`lavanderia_id\` IS NOT NULL OR s.\`modista_id\` IS NOT NULL;
    `);

    await queryRunner.query(`
      INSERT IGNORE INTO \`asignaciones_servicio_reserva\`
        (\`reserva_id\`, \`tipo_prenda\`, \`lavanderia_id\`, \`modista_id\`, \`created_at\`, \`updated_at\`)
      SELECT r.\`id\`, 'PANTALON', p.\`lavanderia_id\`, p.\`modista_id\`, NOW(6), NOW(6)
      FROM \`reservas\` r
      INNER JOIN \`pantalones\` p ON p.\`id\` = r.\`pantalon_id\`
      WHERE r.\`pantalon_id\` IS NOT NULL
        AND (p.\`lavanderia_id\` IS NOT NULL OR p.\`modista_id\` IS NOT NULL);
    `);

    await queryRunner.query(`
      UPDATE \`asignaciones_servicio_reserva\` a
      INNER JOIN \`reservas\` r ON r.\`id\` = a.\`reserva_id\` AND a.\`tipo_prenda\` = 'SACO'
      SET
        a.\`lavanderia_id\` = COALESCE(a.\`lavanderia_id\`, r.\`lavanderia_id\`),
        a.\`modista_id\` = COALESCE(a.\`modista_id\`, r.\`modista_id\`)
      WHERE r.\`lavanderia_id\` IS NOT NULL OR r.\`modista_id\` IS NOT NULL;
    `);

    await queryRunner.query(`
      INSERT IGNORE INTO \`asignaciones_servicio_reserva\`
        (\`reserva_id\`, \`tipo_prenda\`, \`lavanderia_id\`, \`modista_id\`, \`created_at\`, \`updated_at\`)
      SELECT r.\`id\`, 'SACO', r.\`lavanderia_id\`, r.\`modista_id\`, NOW(6), NOW(6)
      FROM \`reservas\` r
      WHERE (r.\`lavanderia_id\` IS NOT NULL OR r.\`modista_id\` IS NOT NULL);
    `);

    await this.dropFkIfExists(queryRunner, 'reservas', 'lavanderia_id');
    await this.dropFkIfExists(queryRunner, 'reservas', 'modista_id');
    await this.dropColumnIfExists(queryRunner, 'reservas', 'lavanderia_id');
    await this.dropColumnIfExists(queryRunner, 'reservas', 'modista_id');

    for (const table of ['sacos', 'pantalones'] as const) {
      await this.dropFkIfExists(queryRunner, table, 'lavanderia_id');
      await this.dropFkIfExists(queryRunner, table, 'modista_id');
      await this.dropColumnIfExists(queryRunner, table, 'lavanderia_id');
      await this.dropColumnIfExists(queryRunner, table, 'modista_id');
    }
  }

  private async dropFkIfExists(
    queryRunner: QueryRunner,
    table: string,
    column: string,
  ): Promise<void> {
    const rows: { CONSTRAINT_NAME: string }[] = await queryRunner.query(
      `
      SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
        AND COLUMN_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL
      LIMIT 1
    `,
      [table, column],
    );
    const name = rows[0]?.CONSTRAINT_NAME;
    if (name) {
      await queryRunner.query(
        `ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${name}\``,
      );
    }
  }

  private async dropColumnIfExists(
    queryRunner: QueryRunner,
    table: string,
    column: string,
  ): Promise<void> {
    const cnt: { c: number }[] = await queryRunner.query(
      `
      SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
    `,
      [table, column],
    );
    if (Number(cnt[0]?.c) > 0) {
      await queryRunner.query(
        `ALTER TABLE \`${table}\` DROP COLUMN \`${column}\``,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS \`asignaciones_servicio_reserva\`;`,
    );
    await queryRunner.query(`
      ALTER TABLE \`reservas\` ADD COLUMN \`lavanderia_id\` int NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE \`reservas\` ADD COLUMN \`modista_id\` int NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE \`sacos\` ADD COLUMN \`lavanderia_id\` int NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE \`sacos\` ADD COLUMN \`modista_id\` int NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE \`pantalones\` ADD COLUMN \`lavanderia_id\` int NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE \`pantalones\` ADD COLUMN \`modista_id\` int NULL;
    `);
  }
}
