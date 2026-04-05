import { Accesorio } from 'src/modules/accesorios/entity/accesorio.entity';
import { Reserva } from 'src/modules/reservas/entity/reserva.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'reserva_extras' })
export class ReservaExtra {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Reserva, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reserva_id' })
  reserva: Reserva;

  @ManyToOne(() => Accesorio, { nullable: false, eager: true })
  @JoinColumn({ name: 'accesorio_id' })
  accesorio: Accesorio;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  observacion: string | null;

  @Column({ type: 'boolean', nullable: true, default: null })
  devuelto: boolean | null;

  @Column({
    name: 'observacion_devolucion',
    type: 'varchar',
    length: 255,
    nullable: true,
    default: null,
  })
  observacionDevolucion: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
