import { TipoPrenda } from 'src/modules/common/enums/reservas-domain.enums';
import { Lavanderia } from 'src/modules/lavanderias/entity/lavanderia.entity';
import { Modista } from 'src/modules/modistas/entity/modista.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Reserva } from './reserva.entity';

/**
 * Asignación de lavandería/modista por reserva y por prenda (saco vs pantalón).
 * No vive en saco/pantalón: cada alquiler puede usar proveedores distintos.
 */
@Entity({ name: 'asignaciones_servicio_reserva' })
@Unique('UQ_asignacion_reserva_prenda', ['reserva', 'tipoPrenda'])
@Index('IDX_asignacion_reserva_id', ['reserva'])
export class AsignacionServicioReserva {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Reserva, (r) => r.asignacionesServicio, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'reserva_id' })
  reserva: Reserva;

  @Column({
    name: 'tipo_prenda',
    type: 'enum',
    enum: TipoPrenda,
  })
  tipoPrenda: TipoPrenda;

  @ManyToOne(() => Lavanderia, { nullable: true })
  @JoinColumn({ name: 'lavanderia_id' })
  lavanderia: Lavanderia | null;

  @ManyToOne(() => Modista, { nullable: true })
  @JoinColumn({ name: 'modista_id' })
  modista: Modista | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
