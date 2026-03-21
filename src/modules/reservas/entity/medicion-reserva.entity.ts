import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Reserva } from './reserva.entity';
import { MedicionesReservaJson } from '../types/mediciones-reserva.types';

@Entity({ name: 'mediciones_reserva' })
export class MedicionReserva {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Reserva, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reserva_id' })
  reserva: Reserva;

  @Column({ name: 'mediciones_json', type: 'json' })
  medicionesJson: MedicionesReservaJson;

  @Column({ name: 'creado_por', type: 'varchar', length: 80, nullable: true })
  creadoPor: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
