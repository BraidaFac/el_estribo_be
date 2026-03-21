import {
  EstadoBloqueo,
  OrigenBloqueo,
  TipoBloqueo,
  TipoPrenda,
} from 'src/modules/common/enums/reservas-domain.enums';
import { Lavanderia } from 'src/modules/lavanderias/entity/lavanderia.entity';
import { Modista } from 'src/modules/modistas/entity/modista.entity';
import { Pantalon } from 'src/modules/pantalones/entity/pantalon.entity';
import { Reserva } from 'src/modules/reservas/entity/reserva.entity';
import { Saco } from 'src/modules/sacos/entity/saco.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'bloqueos_prenda' })
@Index('IDX_BLOQUEOS_SACO_RANGO', ['saco', 'estado', 'inicio', 'fin'])
@Index('IDX_BLOQUEOS_PANTALON_RANGO', ['pantalon', 'estado', 'inicio', 'fin'])
export class BloqueoPrenda {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tipo_prenda', type: 'enum', enum: TipoPrenda })
  tipoPrenda: TipoPrenda;

  @ManyToOne(() => Saco, (saco) => saco.bloqueos, { nullable: true })
  @JoinColumn({ name: 'saco_id' })
  saco: Saco | null;

  @ManyToOne(() => Pantalon, (pantalon) => pantalon.bloqueos, {
    nullable: true,
  })
  @JoinColumn({ name: 'pantalon_id' })
  pantalon: Pantalon | null;

  @ManyToOne(() => Reserva, (reserva) => reserva.bloqueos, { nullable: true })
  @JoinColumn({ name: 'reserva_id' })
  reserva: Reserva | null;

  @ManyToOne(() => Lavanderia, (lavanderia) => lavanderia.bloqueos, {
    nullable: true,
  })
  @JoinColumn({ name: 'lavanderia_id' })
  lavanderia: Lavanderia | null;

  @ManyToOne(() => Modista, (modista) => modista.bloqueos, { nullable: true })
  @JoinColumn({ name: 'modista_id' })
  modista: Modista | null;

  @Column({ type: 'enum', enum: TipoBloqueo, name: 'tipo_bloqueo' })
  tipoBloqueo: TipoBloqueo;

  @Column({
    type: 'enum',
    enum: OrigenBloqueo,
    default: OrigenBloqueo.AUTOMATICO,
  })
  origen: OrigenBloqueo;

  @Column({
    type: 'enum',
    enum: EstadoBloqueo,
    default: EstadoBloqueo.ACTIVO,
  })
  estado: EstadoBloqueo;

  @Column({ type: 'date' })
  inicio: string;

  @Column({ type: 'date' })
  fin: string;

  @Column({ name: 'cancelable_manual', type: 'boolean', default: true })
  cancelableManual: boolean;

  @Column({ type: 'varchar', length: 300, nullable: true })
  motivo: string | null;

  @Column({ name: 'creado_por', type: 'varchar', length: 80, nullable: true })
  creadoPor: string | null;

  @Column({
    name: 'cancelado_por',
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  canceladoPor: string | null;

  @Column({ name: 'cancelado_at', type: 'timestamp', nullable: true })
  canceladoAt: Date | null;

  @Column({
    name: 'motivo_cancelacion',
    type: 'varchar',
    length: 300,
    nullable: true,
  })
  motivoCancelacion: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
