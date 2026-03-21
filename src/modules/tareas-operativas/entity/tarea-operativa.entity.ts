import {
  EstadoTareaOperativa,
  PrioridadTareaOperativa,
  TipoPrenda,
  TipoTareaOperativa,
} from 'src/modules/common/enums/reservas-domain.enums';
import { Pantalon } from 'src/modules/pantalones/entity/pantalon.entity';
import { Reserva } from 'src/modules/reservas/entity/reserva.entity';
import { Saco } from 'src/modules/sacos/entity/saco.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'tareas_operativas' })
export class TareaOperativa {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tipo_tarea', type: 'enum', enum: TipoTareaOperativa })
  tipoTarea: TipoTareaOperativa;

  @Column({
    type: 'enum',
    enum: EstadoTareaOperativa,
    default: EstadoTareaOperativa.PENDIENTE,
  })
  estado: EstadoTareaOperativa;

  @Column({
    type: 'enum',
    enum: PrioridadTareaOperativa,
    default: PrioridadTareaOperativa.BAJA,
  })
  prioridad: PrioridadTareaOperativa;

  @Column({
    name: 'tipo_prenda',
    type: 'enum',
    enum: TipoPrenda,
    nullable: true,
  })
  tipoPrenda: TipoPrenda | null;

  @ManyToOne(() => Saco, { nullable: true })
  @JoinColumn({ name: 'saco_id' })
  saco: Saco | null;

  @ManyToOne(() => Pantalon, { nullable: true })
  @JoinColumn({ name: 'pantalon_id' })
  pantalon: Pantalon | null;

  @ManyToOne(() => Reserva, { nullable: true })
  @JoinColumn({ name: 'reserva_id' })
  reserva: Reserva | null;

  @Column({
    name: 'cliente_nombre',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  clienteNombre: string | null;

  @Column({
    name: 'cliente_telefono',
    type: 'varchar',
    length: 40,
    nullable: true,
  })
  clienteTelefono: string | null;

  @Column({ name: 'fecha_objetivo_desde', type: 'date', nullable: true })
  fechaObjetivoDesde: string | null;

  @Column({ name: 'fecha_objetivo_hasta', type: 'date', nullable: true })
  fechaObjetivoHasta: string | null;

  @Column({ name: 'metadata_json', type: 'json', nullable: true })
  metadataJson: Record<string, unknown> | null;

  @Column({ name: 'creado_por', type: 'varchar', length: 80, nullable: true })
  creadoPor: string | null;

  @Column({ name: 'resuelto_por', type: 'varchar', length: 80, nullable: true })
  resueltoPor: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
