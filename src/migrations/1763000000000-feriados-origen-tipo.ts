import { MigrationInterface, QueryRunner } from 'typeorm';

export class FeriadosOrigenTipo1763000000000 implements MigrationInterface {
  name = 'FeriadosOrigenTipo1763000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`feriados\`
      ADD COLUMN \`origen\` enum('API','MANUAL') NOT NULL DEFAULT 'MANUAL' AFTER \`descripcion\`,
      ADD COLUMN \`tipo\` varchar(50) NULL AFTER \`origen\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`feriados\`
      DROP COLUMN \`tipo\`,
      DROP COLUMN \`origen\`
    `);
  }
}
