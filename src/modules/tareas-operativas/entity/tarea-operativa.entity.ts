import {
  EstadoTareaOperativa,
  PrioridadTareaOperativa,
  TipoPrenda,
  TipoTareaOperativa,
} from 'src/modules/common/enums/reservas-domain.enums';
import { Lavanderia } from 'src/modules/lavanderias/entity/lavanderia.entity';
import { Pantalon } from 'src/modules/pantalones/entity/pantalon.entity';
import { Reserva } from 'src/modules/reservas/entity/reserva.entity';
import { Saco } from 'src/modules/sacos/entity/saco.entity';
import { User } from 'src/user/user.entity';
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

  @Column({
    name: 'costo_modista',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: {
      to: (v: number | null) => v,
      from: (v: string | null) => (v === null ? null : parseFloat(v)),
    },
  })
  costoModista: number | null;

  /** Lavandería a la que fue enviada esta tarea (asignada en el envío por lote). */
  @ManyToOne(() => Lavanderia, { nullable: true })
  @JoinColumn({ name: 'lavanderia_id' })
  lavanderia: Lavanderia | null;

  /** Fecha y hora en que el ítem fue enviado a lavandería (lote o individual). */
  @Column({
    name: 'fecha_ingreso_lavanderia',
    type: 'timestamp',
    nullable: true,
  })
  fechaIngresoLavanderia: Date | null;

  /** Fecha y hora en que el ítem fue retirado de lavandería. */
  @Column({
    name: 'fecha_retiro_lavanderia',
    type: 'timestamp',
    nullable: true,
  })
  fechaRetiroLavanderia: Date | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'creado_por_user_id' })
  creadoPor: User | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'resuelto_por_user_id' })
  resueltoPor: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
