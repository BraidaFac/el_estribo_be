import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type FeriadoOrigen = 'API' | 'MANUAL';

@Entity({ name: 'feriados' })
export class Feriado {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date', unique: true })
  fecha: string;

  /** Motivo o nombre del feriado (persistido como descripcion por compatibilidad). */
  @Column({ type: 'varchar', length: 150, nullable: true })
  descripcion: string | null;

  @Column({ type: 'enum', enum: ['API', 'MANUAL'], default: 'MANUAL' })
  origen: FeriadoOrigen;

  /** Tipo devuelto por la API (ej. inamovible, puente); null en feriados manuales. */
  @Column({ type: 'varchar', length: 50, nullable: true })
  tipo: string | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
