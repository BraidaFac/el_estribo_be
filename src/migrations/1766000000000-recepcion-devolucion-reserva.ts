import { MigrationInterface, QueryRunner } from 'typeorm';

export class RecepcionDevolucionReserva1766000000000 implements MigrationInterface {
  name = 'RecepcionDevolucionReserva1766000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`recepcion_devolucion_reserva\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`reserva_id\` int NOT NULL,
        \`fecha_devolucion\` date NOT NULL,
        \`botones_cierres_estado\` enum('OK','DANO_LEVE') NOT NULL,
        \`botones_cierres_cobro\` decimal(12,2) NULL,
        \`ruedos_telas_estado\` enum('OK','ENGANCHE','ROTURA') NOT NULL,
        \`ruedos_telas_cobro\` decimal(12,2) NULL,
        \`dano_grave_estado\` enum('OK','QUEMADURA','MANCHA_QUIMICA') NOT NULL,
        \`dano_grave_cobro\` decimal(12,2) NULL,
        \`demora_dias\` int NULL,
        \`estado_general\` enum('SUCIIO_O_MANCHADO','IMPECABLE') NOT NULL,
        \`decision_lavado\` enum('LAVANDERIA_EXTERNA','LIMPIEZA_LOCAL') NOT NULL,
        \`responsable_limpieza_local\` varchar(160) NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_recepcion_devolucion_reserva\` (\`reserva_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_recepcion_devolucion_reserva\` FOREIGN KEY (\`reserva_id\`) REFERENCES \`reservas\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`recepcion_devolucion_reserva\``);
  }
}
