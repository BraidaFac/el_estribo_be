import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BloqueoPrenda } from 'src/modules/bloqueos/entity/bloqueo-prenda.entity';

@Entity({ name: 'modistas' })
export class Modista {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 120 })
  nombre: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  telefono: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  direccion: string | null;

  @Column({ type: 'boolean', default: false })
  predeterminada: boolean;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @OneToMany(() => BloqueoPrenda, (bloqueo) => bloqueo.modista)
  bloqueos: BloqueoPrenda[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}
