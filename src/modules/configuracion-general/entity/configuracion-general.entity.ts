import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'configuracion_general' })
export class ConfiguracionGeneral {
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Column({ name: 'dias_lavanderia', type: 'int', default: 2 })
  diasLavanderia: number;

  @Column({ name: 'dias_modista', type: 'int', default: 2 })
  diasModista: number;

  @Column({ name: 'dias_tomar_mediciones', type: 'int', default: 1 })
  diasTomarMediciones: number;

  @Column({ name: 'cantidad_dias_permitido_retiro', type: 'int', default: 3 })
  cantidadDiasPermitidoRetiro: number;

  @Column({
    name: 'dashboard_dias_proximas_reservas',
    type: 'int',
    default: 15,
  })
  dashboardDiasProximasReservas: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
