import {
  EstadoControlPreEntrega,
  MotivoRechazoPreEntrega,
} from 'src/modules/common/enums/reservas-domain.enums';
import { Reserva } from 'src/modules/reservas/entity/reserva.entity';
import { User } from 'src/user/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'control_pre_entrega' })
export class ControlPreEntrega {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Reserva, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reserva_id' })
  reserva: Reserva;

  @Column({ name: 'aroma_score', type: 'tinyint' })
  aromaScore: number;

  @Column({ name: 'aroma_obs', type: 'varchar', length: 400, nullable: true })
  aromaObs: string | null;

  @Column({ name: 'planchado_score', type: 'tinyint' })
  planchadoScore: number;

  @Column({
    name: 'planchado_obs',
    type: 'varchar',
    length: 400,
    nullable: true,
  })
  planchadoObs: string | null;

  @Column({ name: 'sastreria_score', type: 'tinyint' })
  sastreriaScore: number;

  @Column({
    name: 'sastreria_obs',
    type: 'varchar',
    length: 400,
    nullable: true,
  })
  sastreriaObs: string | null;

  @Column({ name: 'higiene_score', type: 'tinyint' })
  higieneScore: number;

  @Column({ name: 'higiene_obs', type: 'varchar', length: 400, nullable: true })
  higieneObs: string | null;

  @Column({ name: 'complementos_score', type: 'tinyint' })
  complementosScore: number;

  @Column({
    name: 'complementos_obs',
    type: 'varchar',
    length: 400,
    nullable: true,
  })
  complementosObs: string | null;

  @Column({
    type: 'enum',
    enum: EstadoControlPreEntrega,
  })
  estado: EstadoControlPreEntrega;

  @Column({ name: 'motivos_rechazo', type: 'simple-json', nullable: true })
  motivosRechazo: MotivoRechazoPreEntrega[] | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'creado_por_user_id' })
  creadoPor: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @Column({ name: 'fecha_resolucion', type: 'date', nullable: true })
  fechaResolucion: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'resuelto_por_user_id' })
  resueltoPor: User | null;
}
