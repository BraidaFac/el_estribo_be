import { MigrationInterface, QueryRunner } from 'typeorm';

export class ControlPreEntrega1765000000000 implements MigrationInterface {
  name = 'ControlPreEntrega1765000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`reservas\`
      MODIFY \`estado_reserva\` enum(
        'PENDIENTE',
        'CONFIRMADA',
        'LISTO_PARA_ENTREGAR',
        'EN_CURSO',
        'COMPLETADA',
        'CANCELADA'
      ) NOT NULL DEFAULT 'PENDIENTE'
    `);

    await queryRunner.query(`
      CREATE TABLE \`control_pre_entrega\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`reserva_id\` int NOT NULL,
        \`aroma_score\` tinyint NOT NULL,
        \`aroma_obs\` varchar(400) NULL,
        \`planchado_score\` tinyint NOT NULL,
        \`planchado_obs\` varchar(400) NULL,
        \`sastreria_score\` tinyint NOT NULL,
        \`sastreria_obs\` varchar(400) NULL,
        \`higiene_score\` tinyint NOT NULL,
        \`higiene_obs\` varchar(400) NULL,
        \`complementos_score\` tinyint NOT NULL,
        \`complementos_obs\` varchar(400) NULL,
        \`estado\` enum('APROBADO', 'RECHAZADO', 'RESUELTO') NOT NULL,
        \`motivo_rechazo\` varchar(600) NULL,
        \`auditor_nombre\` varchar(120) NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`fecha_resolucion\` date NULL,
        \`resuelto_por\` varchar(120) NULL,
        UNIQUE INDEX \`IDX_control_pre_entrega_reserva\` (\`reserva_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_control_pre_entrega_reserva\` FOREIGN KEY (\`reserva_id\`) REFERENCES \`reservas\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    /** Reservas ya en tienda: control aprobado ficticio + estado listo para no bloquear retiros existentes. */
    await queryRunner.query(`
      INSERT INTO \`control_pre_entrega\` (
        \`reserva_id\`,
        \`aroma_score\`, \`planchado_score\`, \`sastreria_score\`, \`higiene_score\`, \`complementos_score\`,
        \`estado\`, \`motivo_rechazo\`, \`auditor_nombre\`
      )
      SELECT
        r.\`id\`,
        5, 5, 5, 5, 5,
        'APROBADO',
        NULL,
        'Migración inicial (sistema)'
      FROM \`reservas\` r
      INNER JOIN \`sacos\` s ON s.\`id\` = r.\`saco_id\`
      LEFT JOIN \`pantalones\` p ON p.\`id\` = r.\`pantalon_id\`
      WHERE r.\`estado_reserva\` = 'CONFIRMADA'
        AND s.\`ubicacion_actual\` = 'TIENDA'
        AND (r.\`pantalon_id\` IS NULL OR p.\`ubicacion_actual\` = 'TIENDA')
    `);

    await queryRunner.query(`
      UPDATE \`reservas\` r
      INNER JOIN \`control_pre_entrega\` c ON c.\`reserva_id\` = r.\`id\` AND c.\`estado\` = 'APROBADO'
      SET r.\`estado_reserva\` = 'LISTO_PARA_ENTREGAR'
      WHERE r.\`estado_reserva\` = 'CONFIRMADA'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`control_pre_entrega\``);

    await queryRunner.query(`
      UPDATE \`reservas\` SET \`estado_reserva\` = 'CONFIRMADA' WHERE \`estado_reserva\` = 'LISTO_PARA_ENTREGAR'
    `);

    await queryRunner.query(`
      ALTER TABLE \`reservas\`
      MODIFY \`estado_reserva\` enum(
        'PENDIENTE',
        'CONFIRMADA',
        'EN_CURSO',
        'COMPLETADA',
        'CANCELADA'
      ) NOT NULL DEFAULT 'PENDIENTE'
    `);
  }
}
