import { EstadoAgendaMedicion } from 'src/modules/common/enums/reservas-domain.enums';
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
import { TareaOperativa } from './tarea-operativa.entity';

@Entity({ name: 'agenda_mediciones' })
export class AgendaMedicion {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Reserva, { nullable: false })
  @JoinColumn({ name: 'reserva_id' })
  reserva: Reserva;

  @ManyToOne(() => TareaOperativa, { nullable: true })
  @JoinColumn({ name: 'tarea_operativa_id' })
  tareaOperativa: TareaOperativa | null;

  @Column({ name: 'cliente_nombre_snapshot', type: 'varchar', length: 120 })
  clienteNombreSnapshot: string;

  @Column({ name: 'cliente_telefono_snapshot', type: 'varchar', length: 40 })
  clienteTelefonoSnapshot: string;

  @Column({ name: 'fecha_hora_cita', type: 'timestamp' })
  fechaHoraCita: Date;

  @Column({
    type: 'enum',
    enum: EstadoAgendaMedicion,
    default: EstadoAgendaMedicion.PROGRAMADA,
  })
  estado: EstadoAgendaMedicion;

  @Column({ type: 'varchar', length: 400, nullable: true })
  observaciones: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
