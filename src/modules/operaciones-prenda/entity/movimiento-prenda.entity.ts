import {
  EstadoUbicacionPrenda,
  TipoPrenda,
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
} from 'typeorm';

@Entity({ name: 'movimientos_prenda' })
export class MovimientoPrenda {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tipo_prenda', type: 'enum', enum: TipoPrenda })
  tipoPrenda: TipoPrenda;

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
    name: 'estado_anterior',
    type: 'enum',
    enum: EstadoUbicacionPrenda,
    nullable: true,
  })
  estadoAnterior: EstadoUbicacionPrenda | null;

  @Column({
    name: 'estado_nuevo',
    type: 'enum',
    enum: EstadoUbicacionPrenda,
  })
  estadoNuevo: EstadoUbicacionPrenda;

  @Column({ type: 'varchar', length: 120, nullable: true })
  motivo: string | null;

  @Column({ name: 'usuario_id', type: 'varchar', length: 80, nullable: true })
  usuarioId: string | null;

  @Column({ name: 'tarea_operativa_id', type: 'int', nullable: true })
  tareaOperativaId: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
