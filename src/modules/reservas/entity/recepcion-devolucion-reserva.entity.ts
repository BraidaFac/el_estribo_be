import {
  BotonesCierresInspeccion,
  DanoGraveInspeccion,
  DecisionLavadoPostDevolucion,
  EstadoGeneralDevolucion,
  RuedosTelasInspeccion,
} from 'src/modules/common/enums/reservas-domain.enums';
import { Reserva } from 'src/modules/reservas/entity/reserva.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Ficha obligatoria al registrar la devolución del traje por el cliente (recepción en tienda).
 * Una fila por reserva (evento único de devolución).
 */
@Entity({ name: 'recepcion_devolucion_reserva' })
export class RecepcionDevolucionReserva {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Reserva, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reserva_id' })
  reserva: Reserva;

  @Column({ name: 'fecha_devolucion', type: 'date' })
  fechaDevolucion: string;

  @Column({
    name: 'botones_cierres_estado',
    type: 'enum',
    enum: BotonesCierresInspeccion,
  })
  botonesCierresEstado: BotonesCierresInspeccion;

  @Column({
    name: 'botones_cierres_cobro',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  botonesCierresCobro: number | null;

  @Column({
    name: 'ruedos_telas_estado',
    type: 'enum',
    enum: RuedosTelasInspeccion,
  })
  ruedosTelasEstado: RuedosTelasInspeccion;

  @Column({
    name: 'ruedos_telas_cobro',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  ruedosTelasCobro: number | null;

  @Column({
    name: 'dano_grave_estado',
    type: 'enum',
    enum: DanoGraveInspeccion,
  })
  danoGraveEstado: DanoGraveInspeccion;

  @Column({
    name: 'dano_grave_cobro',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  danoGraveCobro: number | null;

  @Column({ name: 'demora_dias', type: 'int', nullable: true })
  demoraDias: number | null;

  @Column({
    name: 'estado_general',
    type: 'enum',
    enum: EstadoGeneralDevolucion,
  })
  estadoGeneral: EstadoGeneralDevolucion;

  @Column({
    name: 'decision_lavado',
    type: 'enum',
    enum: DecisionLavadoPostDevolucion,
  })
  decisionLavado: DecisionLavadoPostDevolucion;

  @Column({
    name: 'responsable_limpieza_local',
    type: 'varchar',
    length: 160,
    nullable: true,
  })
  responsableLimpiezaLocal: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
