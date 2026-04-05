import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
} from 'typeorm';
import { Reserva } from './reserva.entity';
import { MedicionesReservaJson } from '../types/mediciones-reserva.types';
import { User } from 'src/user/user.entity';

@Entity({ name: 'mediciones_reserva' })
export class MedicionReserva {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Reserva, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reserva_id' })
  reserva: Reserva;

  @Column({ name: 'mediciones_json', type: 'json' })
  medicionesJson: MedicionesReservaJson;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'creado_por_user_id' })
  creadoPor: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
