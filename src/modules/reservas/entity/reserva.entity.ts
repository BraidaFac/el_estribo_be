import { BloqueoPrenda } from 'src/modules/bloqueos/entity/bloqueo-prenda.entity';
import { EstadoReserva } from 'src/modules/common/enums/reservas-domain.enums';
import { Pantalon } from 'src/modules/pantalones/entity/pantalon.entity';
import { Saco } from 'src/modules/sacos/entity/saco.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AsignacionServicioReserva } from './asignacion-servicio-reserva.entity';

@Entity({ name: 'reservas' })
export class Reserva {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'fecha_reserva', type: 'date' })
  fechaReserva: string;

  @Column({
    name: 'estado_reserva',
    type: 'enum',
    enum: EstadoReserva,
    default: EstadoReserva.CONFIRMADA,
  })
  estadoReserva: EstadoReserva;

  @ManyToOne(() => Saco, (saco) => saco.reservas, { nullable: false })
  @JoinColumn({ name: 'saco_id' })
  saco: Saco;

  @ManyToOne(() => Pantalon, (pantalon) => pantalon.reservas, {
    nullable: true,
  })
  @JoinColumn({ name: 'pantalon_id' })
  pantalon: Pantalon | null;

  @OneToMany(() => AsignacionServicioReserva, (a) => a.reserva)
  asignacionesServicio: AsignacionServicioReserva[];

  @Column({ name: 'cliente_dni', type: 'varchar', length: 30 })
  clienteDni: string;

  @Column({ name: 'cliente_nombre', type: 'varchar', length: 120 })
  clienteNombre: string;

  @Column({
    name: 'nombre_cuenta',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  nombreCuenta: string | null;

  @Column({
    name: 'cliente_telefono',
    type: 'varchar',
    length: 40,
    nullable: true,
  })
  clienteTelefono: string | null;

  @Column({
    name: 'observaciones',
    type: 'varchar',
    length: 400,
    nullable: true,
  })
  observaciones: string | null;

  @Column({ name: 'requiere_modista', type: 'boolean', default: true })
  requiereModista: boolean;

  @Column({ name: 'dias_modista_aplicados', type: 'int', default: 0 })
  diasModistaAplicados: number;

  @Column({ name: 'dias_lavanderia_aplicados', type: 'int', default: 0 })
  diasLavanderiaAplicados: number;

  @Column({ name: 'dias_tomar_mediciones_aplicados', type: 'int', default: 0 })
  diasTomarMedicionesAplicados: number;

  @Column({
    name: 'cliente_retiro_at',
    type: 'date',
    nullable: true,
  })
  clienteRetiroAt: string | null;

  @Column({
    name: 'cliente_devolvio_at',
    type: 'date',
    nullable: true,
  })
  clienteDevolvioAt: string | null;

  @OneToMany(() => BloqueoPrenda, (bloqueo) => bloqueo.reserva)
  bloqueos: BloqueoPrenda[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
