import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Asegura columnas de auditoría en sacos/pantalones (TypeORM suele crearlas con synchronize;
 * bases antiguas o restauradas pueden no tenerlas).
 */
export class PrendasCreatedAtSafety1764000000000 implements MigrationInterface {
  name = 'PrendasCreatedAtSafety1764000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['sacos', 'pantalones'] as const) {
      const hasCreated = await queryRunner.hasColumn(table, 'created_at');
      if (!hasCreated) {
        await queryRunner.query(
          `ALTER TABLE \`${table}\` ADD \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`,
        );
      }
      const hasUpdated = await queryRunner.hasColumn(table, 'updated_at');
      if (!hasUpdated) {
        await queryRunner.query(
          `ALTER TABLE \`${table}\` ADD \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
        );
      }
    }
  }

  public async down(): Promise<void> {
    // Sin rollback: no eliminar columnas de auditoría en producción.
  }
}
