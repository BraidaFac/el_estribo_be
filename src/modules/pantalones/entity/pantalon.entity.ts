import { BloqueoPrenda } from 'src/modules/bloqueos/entity/bloqueo-prenda.entity';
import {
  CondicionPrenda,
  EstadoUbicacionPrenda,
} from 'src/modules/common/enums/reservas-domain.enums';
import { Reserva } from 'src/modules/reservas/entity/reserva.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'pantalones' })
export class Pantalon {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 40, unique: true })
  codigo: string;

  @Column({ type: 'varchar', length: 120 })
  marca: string;

  @Column({ type: 'varchar', length: 15, nullable: true })
  talle: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  color: string | null;

  @Column({
    type: 'enum',
    enum: CondicionPrenda,
    default: CondicionPrenda.LIMPIA,
  })
  condicion: CondicionPrenda;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({
    name: 'ubicacion_actual',
    type: 'enum',
    enum: EstadoUbicacionPrenda,
    default: EstadoUbicacionPrenda.TIENDA,
  })
  ubicacionActual: EstadoUbicacionPrenda;

  @OneToMany(() => Reserva, (reserva) => reserva.pantalon)
  reservas: Reserva[];

  @OneToMany(() => BloqueoPrenda, (bloqueo) => bloqueo.pantalon)
  bloqueos: BloqueoPrenda[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}
